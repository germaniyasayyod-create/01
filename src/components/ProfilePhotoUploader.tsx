import React, { useState, useRef } from 'react';
import { Camera, Trash2, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import {
  validateProfilePhotoFile,
  uploadProfilePhotoToFirebaseStorage,
  deleteProfilePhotoFromStorage,
} from '../lib/storage';

interface ProfilePhotoUploaderProps {
  currentPhotoUrl?: string;
  userName: string;
  userId: string;
  canEdit?: boolean;
  onPhotoUploaded: (url: string) => Promise<void> | void;
  onPhotoDeleted: () => Promise<void> | void;
  onNotify?: (type: 'success' | 'error' | 'info', message: string) => void;
  size?: 'md' | 'lg' | 'xl';
}

export const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({
  currentPhotoUrl,
  userName,
  userId,
  canEdit = true,
  onPhotoUploaded,
  onPhotoDeleted,
  onNotify,
  size = 'lg',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initial = (userName || 'U').trim().charAt(0).toUpperCase();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset file input value so user can re-select same file if needed
    e.target.value = '';

    if (!file) return;

    setUploadError(null);

    const validation = validateProfilePhotoFile(file);
    if (!validation.valid) {
      const err = validation.error || 'Fayl talabga javob bermaydi.';
      setUploadError(err);
      onNotify?.('error', err);
      return;
    }

    const previousPhotoUrl = currentPhotoUrl;

    try {
      setIsUploading(true);
      setUploadPercent(15);

      const downloadUrl = await uploadProfilePhotoToFirebaseStorage(
        userId,
        file,
        info => {
          setUploadPercent(info.percent);
        }
      );

      // 1. Only after storage upload succeeds, update Firestore
      await onPhotoUploaded(downloadUrl);

      // 2. Safely clean up old photo from Storage if different and exists
      if (previousPhotoUrl && previousPhotoUrl !== downloadUrl && previousPhotoUrl.includes('firebasestorage.googleapis.com')) {
        deleteProfilePhotoFromStorage(previousPhotoUrl, userId).catch(cleanErr => {
          console.warn('Old profile photo cleanup note:', cleanErr);
        });
      }

      onNotify?.('success', 'Profil rasmi muvaffaqiyatli saqlandi!');
      setUploadError(null);
    } catch (err: any) {
      console.error('Profile photo upload error:', err);
      const errMsg = err?.message || 'Profil rasmini yuklashda xatolik yuz berdi. Qayta urinib ko‘ring.';
      setUploadError(errMsg);
      onNotify?.('error', errMsg);
    } finally {
      setIsUploading(false);
      setUploadPercent(0);
    }
  };

  const handleDeletePhoto = async () => {
    if (!currentPhotoUrl) return;
    try {
      setIsDeleting(true);
      setUploadError(null);
      await deleteProfilePhotoFromStorage(currentPhotoUrl, userId);
      await onPhotoDeleted();
      onNotify?.('success', 'Profil rasmi o‘chirildi.');
    } catch (err: any) {
      console.error('Delete photo error:', err);
      const errMsg = err?.message || 'Profil rasmini o‘chirishda xatolik yuz berdi.';
      setUploadError(errMsg);
      onNotify?.('error', errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Dimensions
  const sizeClasses = {
    md: 'w-16 h-16 text-xl rounded-2xl',
    lg: 'w-24 h-24 text-3xl rounded-3xl',
    xl: 'w-32 h-32 text-4xl rounded-3xl',
  }[size];

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
      {/* Avatar Container */}
      <div className="relative group shrink-0">
        <div
          className={`${sizeClasses} bg-gradient-to-br from-blue-900 to-indigo-900 text-white font-bold flex items-center justify-center shadow-md overflow-hidden border-2 border-white ring-2 ring-slate-100`}
        >
          {currentPhotoUrl ? (
            <img
              src={currentPhotoUrl}
              alt={userName}
              className="w-full h-full object-cover"
              onError={e => {
                // If image fails to load, fallback gracefully
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span>{initial}</span>
          )}

          {/* Uploading overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white">
              <Loader2 className="w-6 h-6 animate-spin mb-1 text-white" />
              <span className="text-[10px] font-bold font-mono">{uploadPercent}%</span>
            </div>
          )}

          {/* Deleting overlay */}
          {isDeleting && (
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center text-white">
              <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
            </div>
          )}
        </div>

        {/* Quick photo trigger badge */}
        {canEdit && !isUploading && !isDeleting && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 p-2 bg-blue-900 text-white rounded-xl shadow-md hover:bg-blue-800 transition-transform active:scale-95 cursor-pointer"
            title="Rasmni almashtirish"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Controls and info */}
      <div className="flex-1 text-center sm:text-left">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg,.jpg,.jpeg,.png,image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading || isDeleting}
        />

        {canEdit && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isDeleting}
                className="min-h-[44px] px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Yuklanmoqda ({uploadPercent}%)</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>{currentPhotoUrl ? 'Rasmni almashtirish' : 'Rasm yuklash'}</span>
                  </>
                )}
              </button>

              {currentPhotoUrl && (
                <button
                  type="button"
                  onClick={handleDeletePhoto}
                  disabled={isUploading || isDeleting}
                  className="min-h-[44px] px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>O‘chirish</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Format: <strong>JPG, JPEG, PNG</strong>. Maksimal hajm: <strong>2 MB</strong>.
              <br />
              Tiniq va yorug‘ rasmlardan foydalanish tavsiya etiladi.
            </p>

            {uploadError && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{uploadError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 inline-flex items-center gap-1 font-semibold text-blue-900 hover:text-blue-950 bg-white border border-rose-200 px-2.5 py-1 rounded-lg text-[11px] shadow-2xs hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Qayta urinish</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
