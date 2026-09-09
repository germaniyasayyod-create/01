import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  hashPassword,
  generateSalt,
  verifyPassword,
  normalizePhone,
  isValidUzbekPhone,
} from '../lib/crypto';
import { logAuditAction } from './firestoreService';
import type { UserAccount, StudentProfile, SupervisorProfile, UserRole } from '../types';

const SESSION_KEY = 'iqtidorli_talabalar_current_user_v1';

export async function getCurrentStoredUser(): Promise<UserAccount | null> {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const cached = JSON.parse(raw) as UserAccount;
    // Verify latest status directly from Firestore
    const userDoc = await getDoc(doc(db, 'users', cached.id));
    if (userDoc.exists()) {
      const fresh = { id: userDoc.id, ...userDoc.data() } as UserAccount;
      if (!fresh.isActive) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return fresh;
    }
    localStorage.removeItem(SESSION_KEY);
    return null;
  } catch (err) {
    console.error('Session retrieval error:', err);
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveUserSession(user: UserAccount) {
  // Never save hash/salt in storage if possible, or save sanitised
  const sanitized: UserAccount = {
    ...user,
    passwordHash: '',
    salt: '',
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sanitized));
}

export function clearUserSession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Checks if the system has at least one Super Admin.
 * If 0, the first Super Admin setup form is shown to safely initialize the university system.
 */
export async function checkSystemHasSuperAdmin(): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'superAdmin'),
      limit(1)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.error('Error checking superAdmin existence:', err);
    return false;
  }
}

/**
 * First-time initialization of Super Admin safely.
 */
export async function initializeFirstSuperAdmin(data: {
  fullName: string;
  phone: string;
  password: string;
}): Promise<UserAccount> {
  const normalized = normalizePhone(data.phone);
  if (!isValidUzbekPhone(normalized)) {
    throw new Error("Telefon raqami formati noto'g'ri. Masalan: +998 (90) 123-45-67");
  }

  if (data.password.length < 6) {
    throw new Error("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
  }

  // Double check no superAdmin exists yet
  const exists = await checkSystemHasSuperAdmin();
  if (exists) {
    throw new Error("Tizimda Super Admin allaqachon mavjud. Yangi adminni faqat Super Admin yaratishi mumkin.");
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(data.password, salt);

  const userRef = doc(collection(db, 'users'));
  const superAdminUser: UserAccount = {
    id: userRef.id,
    phone: normalized,
    passwordHash,
    salt,
    role: 'superAdmin',
    fullName: data.fullName.trim(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  await setDoc(userRef, superAdminUser);

  await logAuditAction(
    { id: superAdminUser.id, fullName: superAdminUser.fullName, role: 'superAdmin' },
    "Super Admin dastlabki sozlandi",
    'users',
    superAdminUser.id,
    `Bosh Super Admin muvaffaqiyatli ro'yxatdan o'tdi.`
  );

  saveUserSession(superAdminUser);
  return superAdminUser;
}

/**
 * Student Registration
 */
export async function registerStudent(data: {
  fullName: string;
  phone: string;
  course: number;
  group: string;
  facultyOrField: string;
  supervisorId: string;
  customSupervisorName?: string;
  password: string;
}): Promise<{ user: UserAccount; student: StudentProfile }> {
  const normalized = normalizePhone(data.phone);
  if (!isValidUzbekPhone(normalized)) {
    throw new Error("Telefon raqami formati noto'g'ri. Masalan: +998 (90) 123-45-67");
  }

  if (!data.fullName.trim()) {
    throw new Error("F.I.Sh. (Familiya, Ism, Sharif) kiritilishi shart.");
  }

  if (!data.course || data.course < 1 || data.course > 5) {
    throw new Error("Iltimos, o'quv kursingizni to'g'ri tanlang.");
  }

  if (!data.group.trim()) {
    throw new Error("Guruh raqami yoki nomini kiriting.");
  }

  if (!data.facultyOrField.trim()) {
    throw new Error("Ta'lim yo'nalishi kiritilishi shart.");
  }

  if (data.password.length < 6) {
    throw new Error("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
  }

  // Check unique phone number
  const qPhone = query(collection(db, 'users'), where('phone', '==', normalized), limit(1));
  const snap = await getDocs(qPhone);
  if (!snap.empty) {
    throw new Error("Bu telefon raqam allaqachon ro'yxatdan o'tgan. Iltimos, tizimga kiring.");
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(data.password, salt);

  const userRef = doc(collection(db, 'users'));
  const studentRef = doc(collection(db, 'students'));

  const userAccount: UserAccount = {
    id: userRef.id,
    phone: normalized,
    passwordHash,
    salt,
    role: 'student',
    fullName: data.fullName.trim(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const studentProfile: StudentProfile = {
    id: studentRef.id,
    userId: userRef.id,
    fullName: data.fullName.trim(),
    phone: normalized,
    course: Number(data.course),
    group: data.group.trim().toUpperCase(),
    facultyOrField: data.facultyOrField.trim(),
    supervisorId: data.supervisorId || '',
    customSupervisorName: data.customSupervisorName?.trim() || '',
    createdAt: new Date().toISOString(),
  };

  await setDoc(userRef, userAccount);
  await setDoc(studentRef, studentProfile);

  await logAuditAction(
    { id: userAccount.id, fullName: userAccount.fullName, role: 'student' },
    "Talaba ro'yxatdan o'tdi",
    'students',
    studentProfile.id,
    `Yangi talaba mustaqil ro'yxatdan o'tdi: ${data.fullName}`
  );

  saveUserSession(userAccount);
  return { user: userAccount, student: studentProfile };
}

/**
 * Login with Phone and Password
 */
export async function loginWithPhone(phone: string, password: string): Promise<UserAccount> {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error("Telefon raqami kiritilmadi.");
  }
  if (!password) {
    throw new Error("Parol kiritilmadi.");
  }

  const q = query(collection(db, 'users'), where('phone', '==', normalized), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("Telefon raqami yoki parol noto'g'ri.");
  }

  const userDoc = snap.docs[0];
  const user = { id: userDoc.id, ...userDoc.data() } as UserAccount;

  if (user.isActive === false) {
    throw new Error("Ushbu hisob ma'muriyat tomonidan vaqtincha bloklangan.");
  }

  const valid = await verifyPassword(password, user.salt, user.passwordHash);
  if (!valid) {
    throw new Error("Telefon raqami yoki parol noto'g'ri.");
  }

  saveUserSession(user);
  return user;
}

/**
 * Super Admin creates an Admin
 */
export async function createAdminAccount(
  actor: { id: string; fullName: string; role: UserRole },
  data: {
    fullName: string;
    phone: string;
    email?: string;
    password: string;
  }
): Promise<UserAccount> {
  if (actor.role !== 'superAdmin') {
    throw new Error("Faqat Super Admin yangi Admin yarata oladi!");
  }

  const normalized = normalizePhone(data.phone);
  if (!isValidUzbekPhone(normalized)) {
    throw new Error("Telefon raqami formati noto'g'ri.");
  }

  if (data.password.length < 6) {
    throw new Error("Admin paroli kamida 6 ta belgidan iborat bo'lishi kerak.");
  }

  const qPhone = query(collection(db, 'users'), where('phone', '==', normalized), limit(1));
  const snap = await getDocs(qPhone);
  if (!snap.empty) {
    throw new Error("Bu telefon raqam bilan allaqachon boshqa foydalanuvchi mavjud.");
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(data.password, salt);

  const userRef = doc(collection(db, 'users'));
  const newAdmin: UserAccount = {
    id: userRef.id,
    phone: normalized,
    passwordHash,
    salt,
    role: 'admin',
    fullName: data.fullName.trim(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  await setDoc(userRef, newAdmin);

  await logAuditAction(
    actor,
    "Yangi Admin yaratildi",
    'users',
    newAdmin.id,
    `Super Admin tomonidan yangi Admin qo'shildi: ${data.fullName}`
  );

  return newAdmin;
}

/**
 * Supervisor user account creation (if supervisor wants to log in)
 */
export async function createSupervisorAccount(
  actor: { id: string; fullName: string; role: UserRole },
  data: {
    fullName: string;
    phone: string;
    email: string;
    position: string;
    academicDegree: string;
    department: string;
    password?: string;
  }
): Promise<SupervisorProfile> {
  if (actor.role !== 'superAdmin' && actor.role !== 'admin') {
    throw new Error("Faqat Admin yoki Super Admin ilmiy rahbar yarata oladi!");
  }

  const normalized = normalizePhone(data.phone);

  let userId: string | undefined;

  // If password provided, create login account
  if (data.password && data.password.length >= 6) {
    const qPhone = query(collection(db, 'users'), where('phone', '==', normalized), limit(1));
    const snap = await getDocs(qPhone);
    if (!snap.empty) {
      throw new Error("Bu telefon raqam allaqachon ro'yxatdan o'tgan.");
    }
    const salt = generateSalt();
    const passwordHash = await hashPassword(data.password, salt);
    const userRef = doc(collection(db, 'users'));
    userId = userRef.id;
    const userAccount: UserAccount = {
      id: userId,
      phone: normalized,
      passwordHash,
      salt,
      role: 'supervisor',
      fullName: data.fullName.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    await setDoc(userRef, userAccount);
  }

  const supRef = doc(collection(db, 'supervisors'));
  const supervisor: SupervisorProfile = {
    id: supRef.id,
    userId,
    fullName: data.fullName.trim(),
    phone: normalized,
    email: data.email.trim(),
    position: data.position.trim(),
    academicDegree: data.academicDegree.trim(),
    department: data.department.trim(),
    createdAt: new Date().toISOString(),
  };

  await setDoc(supRef, supervisor);

  await logAuditAction(
    actor,
    "Ilmiy rahbar qo'shildi",
    'supervisors',
    supervisor.id,
    `Yangi ilmiy rahbar biriktirildi: ${data.fullName}`
  );

  return supervisor;
}

export const checkSuperAdminExists = checkSystemHasSuperAdmin;

export function getCurrentUserSession(): UserAccount | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

export async function logoutUserSession(userId?: string, fullName?: string) {
  if (userId) {
    await logAuditAction(
      { id: userId, fullName: fullName || 'Foydalanuvchi', role: 'student' },
      "Tizimdan chiqish",
      'users',
      userId,
      "Foydalanuvchi tizimdan chiqdi."
    );
  }
  clearUserSession();
}

export async function registerAdminUser(
  data: {
    fullName: string;
    phone: string;
    password: string;
    role?: 'admin' | 'superAdmin';
  },
  actorId: string,
  actorName: string
) {
  const normalized = normalizePhone(data.phone);
  if (!isValidUzbekPhone(normalized)) {
    throw new Error("Telefon raqami noto'g'ri.");
  }
  const salt = generateSalt();
  const passwordHash = await hashPassword(data.password, salt);
  const userRef = doc(collection(db, 'users'));
  const user: UserAccount = {
    id: userRef.id,
    fullName: data.fullName,
    phone: normalized,
    passwordHash,
    salt,
    role: data.role || 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  await setDoc(userRef, user);

  await logAuditAction(
    { id: actorId, fullName: actorName, role: 'superAdmin' },
    "Admin ro'yxatga olindi",
    'users',
    user.id,
    `Yangi ${user.role} qo'shildi: ${data.fullName}`
  );
  return user;
}

export async function toggleUserBlockStatus(
  userId: string,
  isActive: boolean,
  actorId: string,
  actorName: string
) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { isActive, updatedAt: new Date().toISOString() });
  await logAuditAction(
    { id: actorId, fullName: actorName, role: 'superAdmin' },
    isActive ? "Admin faollashtirildi" : "Admin bloklandi",
    'users',
    userId,
    `Admin holati: ${isActive ? 'Faol' : 'Bloklangan'}`
  );
}

export async function changeUserRole(
  userId: string,
  newRole: UserRole,
  actorId: string,
  actorName: string
) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { role: newRole, updatedAt: new Date().toISOString() });
  await logAuditAction(
    { id: actorId, fullName: actorName, role: 'superAdmin' },
    "Foydalanuvchi roli yangilandi",
    'users',
    userId,
    `Yangi rol: ${newRole}`
  );
}

