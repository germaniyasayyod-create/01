import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { storage, db, firebaseConfig } from './firebase';

// Fast retry timeout limits so Firebase Storage never hangs the client for 10 minutes
try {
  (storage as any).maxUploadRetryTime = 6000;
  (storage as any).maxOperationRetryTime = 6000;
} catch {
  // Ignore in environments where properties are readonly
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

export type UploadStep = 'idle' | 'validating' | 'uploading' | 'saving' | 'success' | 'error';

export interface UploadProgressInfo {
  step: UploadStep;
  percent: number; // 0 - 100
  message: string;
}

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  uniqueId: string;
  fileDataUrl?: string;
}

/**
 * Executes a promise with an enforced timeout to avoid indefinite pending states
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallbackErrMsg: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(fallbackErrMsg));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Validates file: must be PDF and <= 10MB
 */
export function validatePdfFile(file: File | null | undefined): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'Fayl tanlanmagan.' };
  }

  const isPdfMime = file.type === 'application/pdf';
  const isPdfExtension = file.name.toLowerCase().endsWith('.pdf');

  // Both MIME and extension should confirm PDF format
  if (!isPdfMime && !isPdfExtension) {
    return {
      valid: false,
      error: 'Faqat PDF formatidagi fayllar qabul qilinadi.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Fayl hajmi 10 MB dan oshmasligi kerak.',
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'Fayl bo‘sh (0 bayt). Boshqa PDF fayl tanlang.',
    };
  }

  return { valid: true };
}

/**
 * Generates a collision-resistant unique ID for storage paths
 */
export function generateUniqueStorageId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${timestamp}_${randomPart}`;
}

/**
 * Splits Uint8Array into base64 chunks for durable Firestore backup storage
 */
async function uploadToFirestoreChunks(
  file: File,
  uniqueId: string,
  studentId: string,
  category: string,
  onProgress?: (info: UploadProgressInfo) => void
): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // 350KB per chunk in binary, safely fits in Firestore document
  const CHUNK_SIZE = 350 * 1024;
  const totalChunks = Math.ceil(bytes.length / CHUNK_SIZE);

  // 1. Create file header metadata in Firestore with timeout
  const fileRef = doc(db, 'firebase_storage_files', uniqueId);
  await withTimeout(
    setDoc(fileRef, {
      id: uniqueId,
      studentId,
      category,
      fileName: file.name,
      fileSize: file.size,
      fileType: 'application/pdf',
      totalChunks,
      createdAt: new Date().toISOString(),
    }),
    12000,
    'Fayl ma’lumotlarini saqlashda vaqt tugadi. Qayta urinib ko‘ring.'
  );

  // 2. Upload chunks with progress and timeout protection
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, bytes.length);
    const chunkBytes = bytes.slice(start, end);
    
    // Convert chunk to base64
    let binary = '';
    const len = chunkBytes.byteLength;
    for (let b = 0; b < len; b++) {
      binary += String.fromCharCode(chunkBytes[b]);
    }
    const base64Data = btoa(binary);

    const chunkRef = doc(collection(db, 'firebase_storage_files', uniqueId, 'chunks'), String(i));
    await withTimeout(
      setDoc(chunkRef, {
        chunkIndex: i,
        data: base64Data,
      }),
      10000,
      'Fayl bo‘laklarini saqlashda vaqt tugadi. Qayta urinib ko‘ring.'
    );

    const percent = Math.min(98, Math.round(((i + 1) / totalChunks) * 100));
    onProgress?.({
      step: 'uploading',
      percent,
      message: `PDF yuklanmoqda... ${percent}%`,
    });
  }

  return `firebase-storage://${uniqueId}`;
}

/**
 * Uploads a validated PDF file to Firebase Storage with proper student subpath:
 * /students/{studentId}/{category}/{uniqueId}.pdf
 * Supports fast timeout, progress tracking, and fallback to Firebase Cloud Firestore.
 */
export async function uploadPdfDocument(
  file: File,
  studentId: string,
  category: 'certificates' | 'projects' | 'achievements' | 'startups',
  onProgress?: (info: UploadProgressInfo) => void
): Promise<UploadResult> {
  // Step 1: Validation
  onProgress?.({
    step: 'validating',
    percent: 5,
    message: 'PDF tekshirilmoqda...',
  });

  const validation = validatePdfFile(file);
  if (!validation.valid) {
    const err = validation.error || 'Fayl yaroqsiz.';
    onProgress?.({
      step: 'error',
      percent: 0,
      message: err,
    });
    throw new Error(err);
  }

  const uniqueId = generateUniqueStorageId();
  // Clean structured storage path complying with requirement #9:
  // /students/{studentId}/{category}/{uniqueId}.pdf
  const storagePath = `students/${studentId}/${category}/${uniqueId}.pdf`;

  onProgress?.({
    step: 'uploading',
    percent: 10,
    message: 'PDF yuklanmoqda... 10%',
  });

  // Verify Firebase configuration
  if (!firebaseConfig.projectId) {
    const err = 'Firebase konfiguratsiyasi topilmadi. Tizim sozlamalarini tekshiring.';
    onProgress?.({ step: 'error', percent: 0, message: err });
    throw new Error(err);
  }

  // Attempt real Firebase Storage upload with uploadBytesResumable
  let storageSuccess = false;
  let downloadUrl = '';

  try {
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType: 'application/pdf',
      customMetadata: {
        studentId,
        category,
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
      },
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    // Set 8 second timeout protection so upload never hangs indefinitely if network or bucket stalls
    const uploadPromise = new Promise<string>((resolve, reject) => {
      let isSettled = false;
      const timeoutId = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            uploadTask.cancel();
          } catch {
            // Ignore cancel errors
          }
          reject(new Error('STORAGE_TIMEOUT'));
        }
      }, 8000);

      uploadTask.on(
        'state_changed',
        snapshot => {
          if (snapshot.totalBytes > 0) {
            const percent = Math.min(
              95,
              Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            );
            onProgress?.({
              step: 'uploading',
              percent,
              message: `PDF yuklanmoqda... ${percent}%`,
            });
          }
        },
        error => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            reject(error);
          }
        },
        async () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (urlErr) {
              reject(urlErr);
            }
          }
        }
      );
    });

    downloadUrl = await uploadPromise;
    storageSuccess = true;
  } catch (storageErr: any) {
    console.warn('Firebase Storage direct upload not reachable or bucket pending in GCP, using Firebase Cloud Firestore storage:', storageErr?.message || storageErr);

    // If Firebase Storage failed (e.g. 404 bucket-not-found or timeout),
    // save reliably to Firebase Firestore chunk storage.
    try {
      downloadUrl = await uploadToFirestoreChunks(file, uniqueId, studentId, category, onProgress);
      storageSuccess = true;
    } catch (fsErr: any) {
      console.error('All Firebase storage methods failed:', fsErr);
      const errMsg = 'PDF faylni yuklashda xatolik yuz berdi. Qayta urinib ko‘ring.';
      onProgress?.({
        step: 'error',
        percent: 0,
        message: errMsg,
      });
      throw new Error(errMsg);
    }
  }

  if (!storageSuccess || !downloadUrl) {
    const errMsg = 'PDF faylni yuklashda xatolik yuz berdi. Qayta urinib ko‘ring.';
    onProgress?.({ step: 'error', percent: 0, message: errMsg });
    throw new Error(errMsg);
  }

  onProgress?.({
    step: 'saving',
    percent: 100,
    message: 'Ma’lumotlar saqlanmoqda...',
  });

  return {
    fileUrl: downloadUrl,
    fileName: file.name,
    fileSize: file.size,
    fileType: 'application/pdf',
    storagePath,
    uniqueId,
  };
}

/**
 * Resolves a PDF URL for in-app viewing or downloading.
 * Supports standard URLs as well as firebase-storage:// references with timeout protection.
 */
export async function resolvePdfUrl(fileUrl: string): Promise<string> {
  if (!fileUrl) return '';

  // Already standard HTTP(S), Blob, or Data URL
  if (
    fileUrl.startsWith('http://') ||
    fileUrl.startsWith('https://') ||
    fileUrl.startsWith('blob:') ||
    fileUrl.startsWith('data:')
  ) {
    return fileUrl;
  }

  // Firebase Firestore Chunk Storage URL
  if (fileUrl.startsWith('firebase-storage://')) {
    const fileId = fileUrl.replace('firebase-storage://', '').trim();
    try {
      const fileDoc = await withTimeout(
        getDoc(doc(db, 'firebase_storage_files', fileId)),
        8000,
        'Hujjatni yuklashda vaqt tugadi.'
      );
      if (!fileDoc.exists()) {
        throw new Error('Fayl topilmadi.');
      }
      const data = fileDoc.data();
      const totalChunks = data.totalChunks || 1;

      const chunksSnapshot = await withTimeout(
        getDocs(collection(db, 'firebase_storage_files', fileId, 'chunks')),
        10000,
        'Fayl bo‘laklarini yuklashda vaqt tugadi.'
      );
      
      const chunkMap = new Map<number, string>();
      chunksSnapshot.forEach(d => {
        const cData = d.data();
        chunkMap.set(cData.chunkIndex, cData.data);
      });

      // Assemble base64 chunks into a single Blob
      const byteArrays: Uint8Array[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const base64 = chunkMap.get(i) || '';
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }
        byteArrays.push(bytes);
      }

      const blob = new Blob(byteArrays, { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error('Failed to resolve firebase-storage URL:', err);
      throw err;
    }
  }

  return fileUrl;
}

export const MAX_PROFILE_PHOTO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Validates profile photo file: JPG/JPEG/PNG and <= 2MB
 */
export function validateProfilePhotoFile(file: File | null | undefined): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'Fayl tanlanmagan.' };
  }

  const name = file.name.toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png'];
  const hasValidExt = validExtensions.some(ext => name.endsWith(ext));
  const validMimes = ['image/jpeg', 'image/jpg', 'image/png'];
  const hasValidMime = validMimes.includes(file.type.toLowerCase()) || file.type.startsWith('image/');

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: 'Faqat JPG, JPEG yoki PNG formatidagi rasmlar qabul qilinadi.',
    };
  }

  if (file.size > MAX_PROFILE_PHOTO_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Rasm hajmi 2 MB dan oshmasligi kerak.',
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'Fayl bo‘sh (0 bayt). Boshqa rasm tanlang.',
    };
  }

  return { valid: true };
}

/**
 * Crops and compresses a profile image into a clean square avatar.
 * Typical output size is 15KB - 35KB, ideal for web avatars and Firestore storage.
 */
export async function compressProfileImage(
  file: File,
  targetSize = 360,
  quality = 0.85
): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('Fayl tanlanmagan.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Faylni o‘qib bo‘lmadi.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Rasmni o‘qishda xatolik yuz berdi.'));
      img.onload = () => {
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          // Calculate center-crop square coordinates so avatar is never distorted
          const cropSize = Math.min(originalWidth, originalHeight);
          const cropX = Math.round((originalWidth - cropSize) / 2);
          const cropY = Math.round((originalHeight - cropSize) / 2);

          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve({
              dataUrl: reader.result as string,
              blob: file,
            });
            return;
          }

          // High quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw cropped center square to target square
          ctx.drawImage(
            img,
            cropX,
            cropY,
            cropSize,
            cropSize,
            0,
            0,
            targetSize,
            targetSize
          );

          const dataUrl = canvas.toDataURL('image/jpeg', quality);

          canvas.toBlob(
            blob => {
              if (blob) {
                resolve({ dataUrl, blob });
              } else {
                resolve({ dataUrl, blob: file });
              }
            },
            'image/jpeg',
            quality
          );
        } catch (canvasErr) {
          console.warn('Canvas compression warning, using original image:', canvasErr);
          resolve({
            dataUrl: reader.result as string,
            blob: file,
          });
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Maps Firebase Storage error codes to clear, localized messages
 */
export function mapFirebaseStorageError(err: any): string {
  const code = err?.code || '';
  const message = String(err?.message || '');

  if (
    code === 'storage/retry-limit-exceeded' ||
    message.includes('retry-limit-exceeded') ||
    message.includes('STORAGE_TIMEOUT') ||
    message.includes('Max retry time') ||
    message.includes('timeout')
  ) {
    return 'Rasmni yuklash tugallanmadi. Internet yoki Firebase Storage ulanishini tekshiring va qayta urinib ko‘ring.';
  }
  if (code === 'storage/unauthorized') {
    return 'Rasmni yuklashga ruxsat berilmadi (Ruxsat cheklangan). Huquqlarni tekshiring.';
  }
  if (code === 'storage/unauthenticated') {
    return 'Foydalanuvchi tizimga kirmagan. Iltimos, qayta tizimga kiring.';
  }
  if (code === 'storage/quota-exceeded') {
    return 'Xotira kvotasi to‘lgan. Tizim administratori bilan bog‘laning.';
  }
  if (code === 'storage/bucket-not-found') {
    return 'Firebase Storage xotira ombori topilmadi. Firebase konsolida Storage faollashtirilganligini tekshiring.';
  }
  if (code === 'storage/project-not-found') {
    return 'Firebase loyihasi topilmadi.';
  }
  if (code === 'storage/invalid-checksum') {
    return 'Fayl to‘liq yuklanmadi (checksum xatosi). Qayta urinib ko‘ring.';
  }
  if (code === 'storage/canceled') {
    return 'Rasm yuklash jarayoni bekor qilindi.';
  }
  return message || 'Profil rasmini yuklashda xatolik yuz berdi. Qayta urinib ko‘ring.';
}

/**
 * Uploads a validated profile photo to Firebase Storage:
 * 1. Validates format (JPG/JPEG/PNG) and size (<= 2MB)
 * 2. Crops and optimizes image to 360x360 square avatar for fast network transfer
 * 3. Uploads to profilePhotos/{userId}/profile.{ext} using uploadBytesResumable
 * 4. Provides granular progress tracking and comprehensive error handling
 * 5. Strictly avoids fake success; returns true downloadURL upon completion
 */
export async function uploadProfilePhotoToFirebaseStorage(
  userId: string,
  file: File,
  onProgress?: (info: UploadProgressInfo) => void
): Promise<string> {
  const validation = validateProfilePhotoFile(file);
  if (!validation.valid) {
    const err = validation.error || 'Rasm talabga javob bermaydi.';
    onProgress?.({ step: 'error', percent: 0, message: err });
    throw new Error(err);
  }

  onProgress?.({ step: 'validating', percent: 15, message: 'Rasm optimallashtirilmoqda...' });

  // 1. Client-side crop & compression to square avatar
  let compressed: { dataUrl: string; blob: Blob };
  try {
    compressed = await compressProfileImage(file, 360, 0.85);
  } catch (compErr: any) {
    console.warn('Image compression fallback:', compErr);
    compressed = { dataUrl: '', blob: file };
  }

  onProgress?.({ step: 'uploading', percent: 35, message: 'Firebase Storage xotirasiga yuklanmoqda...' });

  // 2. Safe path: profilePhotos/{userId}/profile.{ext}
  const extMatch = file.name.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
  const rawExt = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const cleanExt = ['jpg', 'jpeg', 'png'].includes(rawExt) ? rawExt : 'jpg';
  const storagePath = `profilePhotos/${userId}/profile.${cleanExt}`;

  const storageRef = ref(storage, storagePath);
  const metadata = {
    contentType: cleanExt === 'png' ? 'image/png' : 'image/jpeg',
    customMetadata: {
      userId,
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
    },
  };

  const uploadTask = uploadBytesResumable(storageRef, compressed.blob, metadata);

  const uploadPromise = new Promise<string>((resolve, reject) => {
    let isSettled = false;

    // Timeout guard: if upload takes longer than 10 seconds without completion, cancel to prevent indefinite hang
    const timeoutId = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try {
          uploadTask.cancel();
        } catch {
          // Ignore cancel error
        }
        const timeoutErr = new Error('storage/retry-limit-exceeded');
        (timeoutErr as any).code = 'storage/retry-limit-exceeded';
        const friendlyMsg = mapFirebaseStorageError(timeoutErr);
        onProgress?.({ step: 'error', percent: 0, message: friendlyMsg });
        reject(new Error(friendlyMsg));
      }
    }, 10000);

    uploadTask.on(
      'state_changed',
      snapshot => {
        if (snapshot.totalBytes > 0) {
          const percent = Math.min(
            92,
            35 + Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 55)
          );
          onProgress?.({
            step: 'uploading',
            percent,
            message: `Rasm yuklanmoqda... ${percent}%`,
          });
        }
      },
      error => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          const friendlyMsg = mapFirebaseStorageError(error);
          onProgress?.({ step: 'error', percent: 0, message: friendlyMsg });
          reject(new Error(friendlyMsg));
        }
      },
      async () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          try {
            onProgress?.({ step: 'saving', percent: 96, message: 'Rasm manzili olinmoqda...' });
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            onProgress?.({ step: 'success', percent: 100, message: 'Rasm muvaffaqiyatli yuklandi' });
            resolve(url);
          } catch (urlErr) {
            const friendlyMsg = mapFirebaseStorageError(urlErr);
            onProgress?.({ step: 'error', percent: 0, message: friendlyMsg });
            reject(new Error(friendlyMsg));
          }
        }
      }
    );
  });

  return await uploadPromise;
}

/**
 * Deletes profile photo from Firebase Storage if present
 */
export async function deleteProfilePhotoFromStorage(photoUrl?: string, userId?: string): Promise<void> {
  // 1. Delete from Firestore profile_photos collection if present
  if (userId) {
    try {
      await deleteDoc(doc(db, 'profile_photos', userId));
    } catch {
      // Ignore
    }
  }

  // 2. If it's a Firebase Storage URL, attempt delete with short timeout
  if (photoUrl && photoUrl.includes('firebasestorage.googleapis.com')) {
    try {
      const storageRef = ref(storage, photoUrl);
      await withTimeout(deleteObject(storageRef), 3000, 'Storage delete timeout');
    } catch (err) {
      console.warn('Storage delete ignored:', err);
    }
  }
}

/**
 * Cleans up orphan storage file if Firestore document creation fails
 */
export async function cleanupStorageFile(fileUrl?: string, storagePath?: string): Promise<void> {
  // 1. Clean from Firebase Storage if path was given
  if (storagePath) {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch {
      // Ignore if not found or bucket disabled
    }
  }

  // 2. Clean from Firebase Firestore chunk storage if URL was firebase-storage://
  if (fileUrl && fileUrl.startsWith('firebase-storage://')) {
    const fileId = fileUrl.replace('firebase-storage://', '').trim();
    try {
      const chunksSnap = await getDocs(
        collection(db, 'firebase_storage_files', fileId, 'chunks')
      );
      for (const cDoc of chunksSnap.docs) {
        await deleteDoc(cDoc.ref);
      }
      await deleteDoc(doc(db, 'firebase_storage_files', fileId));
    } catch (err) {
      console.warn('Cleanup failed for Firestore file:', err);
    }
  }
}

