import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  StudentProfile,
  SupervisorProfile,
  AdminProfile,
  ProjectOrStartup,
  Achievement,
  CertificateItem,
  EventItem,
  EventRegistration,
  Announcement,
  AuditLog,
  UserAccount,
  UserRole,
} from '../types';
import {
  generateSalt,
  hashPassword,
  normalizePhone,
  isValidUzbekPhone,
} from '../lib/crypto';

// Helper for timeout protection on async calls
async function withFirestoreTimeout<T>(
  promise: Promise<T>,
  ms: number = 10000,
  errMsg: string = 'Ma’lumotlarni Firestore’ga saqlashda vaqt tugadi. Qayta urinib ko‘ring.'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errMsg)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Safely removes undefined fields from an object to ensure updateDoc / setDoc never throws
 * "Unsupported field value: undefined"
 */
export function removeUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// Helper for audit logging
export async function logAuditAction(
  actor: { id: string; fullName: string; role: UserRole },
  action: string,
  entityType: string,
  entityId: string,
  details: string
) {
  try {
    const logRef = doc(collection(db, 'auditLogs'));
    const log: AuditLog = {
      id: logRef.id,
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    await setDoc(logRef, log);
  } catch (err) {
    console.error('Audit log creation failed:', err);
  }
}

// ----------------- STUDENTS -----------------
export function subscribeStudents(onUpdate: (students: StudentProfile[]) => void): Unsubscribe {
  const colRef = collection(db, 'students');
  return onSnapshot(
    colRef,
    snapshot => {
      const list: StudentProfile[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as StudentProfile);
      });
      // Sort by name
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      onUpdate(list);
    },
    error => {
      console.error('Error listening to students:', error);
    }
  );
}

export async function updateStudentProfile(
  studentId: string,
  updates: Partial<StudentProfile>,
  actor?: { id: string; fullName: string; role: UserRole }
) {
  const ref = doc(db, 'students', studentId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  if (actor) {
    await logAuditAction(
      actor,
      "Talaba profilini yangilash",
      'students',
      studentId,
      `Talaba profili tahrirlandi: ${updates.fullName || studentId}`
    );
  }
}

export async function assignStudentSupervisor(
  studentId: string,
  supervisorId: string,
  actor: { id: string; fullName: string; role: UserRole }
) {
  const ref = doc(db, 'students', studentId);
  await updateDoc(ref, {
    supervisorId,
    customSupervisorName: '',
    updatedAt: new Date().toISOString(),
  });

  await logAuditAction(
    actor,
    "Ilmiy rahbar biriktirish",
    'students',
    studentId,
    `Talabaga yangi ilmiy rahbar biriktirildi (Supervisor ID: ${supervisorId})`
  );
}

export async function deleteStudent(
  studentId: string,
  userId: string,
  actor: { id: string; fullName: string; role: UserRole }
) {
  await deleteDoc(doc(db, 'students', studentId));
  if (userId) {
    await deleteDoc(doc(db, 'users', userId));
  }
  await logAuditAction(
    actor,
    "Talabani o'chirish",
    'students',
    studentId,
    `Talaba va uning akkaunti o'chirildi.`
  );
}

// ----------------- SUPERVISORS -----------------
export function subscribeSupervisors(onUpdate: (supervisors: SupervisorProfile[]) => void): Unsubscribe {
  const colRef = collection(db, 'supervisors');
  return onSnapshot(
    colRef,
    snapshot => {
      const list: SupervisorProfile[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SupervisorProfile);
      });
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      onUpdate(list);
    },
    error => {
      console.error('Error listening to supervisors:', error);
    }
  );
}

export async function createSupervisorDoc(
  data: Omit<SupervisorProfile, 'id' | 'createdAt'>,
  actor: { id: string; fullName: string; role: UserRole }
): Promise<string> {
  const ref = doc(collection(db, 'supervisors'));
  const supervisor: SupervisorProfile = {
    ...data,
    id: ref.id,
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, supervisor);

  await logAuditAction(
    actor,
    "Ilmiy rahbar qo'shish",
    'supervisors',
    ref.id,
    `Yangi ilmiy rahbar qo'shildi: ${data.fullName}`
  );
  return ref.id;
}

export async function updateSupervisorDoc(
  id: string,
  updates: Partial<SupervisorProfile>,
  actor: { id: string; fullName: string; role: UserRole }
) {
  const ref = doc(db, 'supervisors', id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  await logAuditAction(
    actor,
    "Ilmiy rahbarni tahrirlash",
    'supervisors',
    id,
    `Ilmiy rahbar ma'lumotlari yangilandi: ${updates.fullName || id}`
  );
}

export async function deleteSupervisorDoc(
  id: string,
  actor: { id: string; fullName: string; role: UserRole }
) {
  await deleteDoc(doc(db, 'supervisors', id));
  await logAuditAction(
    actor,
    "Ilmiy rahbarni o'chirish",
    'supervisors',
    id,
    `Ilmiy rahbar o'chirildi.`
  );
}

// ----------------- PROJECTS & STARTUPS -----------------
export function subscribeProjectsAndStartups(
  onUpdate: (items: ProjectOrStartup[]) => void
): Unsubscribe {
  const colRef = collection(db, 'projects');
  return onSnapshot(
    colRef,
    snapshot => {
      const list: ProjectOrStartup[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ProjectOrStartup);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    error => {
      console.error('Error listening to projects/startups:', error);
    }
  );
}

export async function createProjectOrStartup(
  data: Omit<ProjectOrStartup, 'id' | 'createdAt' | 'status'>
): Promise<string> {
  const ref = doc(collection(db, 'projects'));
  const item: ProjectOrStartup = {
    ...data,
    id: ref.id,
    status: 'Kutilmoqda',
    createdAt: new Date().toISOString(),
  };
  await withFirestoreTimeout(
    setDoc(ref, item),
    12000,
    'Loyiha/Startap ma’lumotlarini saqlashda vaqt tugadi. Qayta urinib ko‘ring.'
  );
  return ref.id;
}

export async function updateProjectStatus(
  id: string,
  status: 'Tasdiqlangan' | 'Rad etilgan',
  notesOrActor?: string | { id?: string; fullName?: string; role?: UserRole },
  actorOrActorName?: { id?: string; fullName?: string; role?: UserRole } | string,
  maybeActorName?: string
) {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new Error("Loyiha identifikatori (ID) ko'rsatilmagan.");
  }

  let notes = '';
  let adminUid = '';
  let adminName = '';
  let adminRole: UserRole = 'admin';

  if (notesOrActor && typeof notesOrActor === 'object') {
    adminUid = notesOrActor.id || '';
    adminName = notesOrActor.fullName || '';
    adminRole = notesOrActor.role || 'admin';
    if (typeof actorOrActorName === 'string') notes = actorOrActorName;
  } else if (actorOrActorName && typeof actorOrActorName === 'object') {
    notes = typeof notesOrActor === 'string' ? notesOrActor : '';
    adminUid = actorOrActorName.id || '';
    adminName = actorOrActorName.fullName || '';
    adminRole = actorOrActorName.role || 'admin';
  } else if (typeof notesOrActor === 'string' && typeof actorOrActorName === 'string' && typeof maybeActorName === 'string') {
    notes = notesOrActor;
    adminUid = actorOrActorName;
    adminName = maybeActorName;
  } else if (typeof notesOrActor === 'string' && typeof actorOrActorName === 'string') {
    adminUid = notesOrActor;
    adminName = actorOrActorName;
  }

  if (!adminUid || !adminUid.trim()) {
    throw new Error(
      "Admin identifikatori (UID) aniqlanmadi. Noto‘g‘ri ma’lumot yozilmasligi uchun tasdiqlash to‘xtatildi. Iltimos, tizimga qayta kiring."
    );
  }

  const cleanAdminUid = adminUid.trim();
  const cleanAdminName = (adminName || 'Admin').trim();
  const cleanNotes = (notes || '').trim();
  const timestampIso = new Date().toISOString();

  const ref = doc(db, 'projects', id);
  const updatePayload = removeUndefinedFields({
    status,
    reviewNotes: cleanNotes,
    reviewedAt: timestampIso,
    reviewedBy: cleanAdminUid,
    reviewedByName: cleanAdminName,
    updatedAt: timestampIso,
  });

  await withFirestoreTimeout(
    updateDoc(ref, updatePayload),
    12000,
    'Loyiha holatini yangilashda vaqt tugadi. Qayta urinib ko‘ring.'
  );

  await logAuditAction(
    { id: cleanAdminUid, fullName: cleanAdminName, role: adminRole },
    status === 'Tasdiqlangan' ? "Loyihani tasdiqlash" : "Loyihani rad etish",
    'projects',
    id,
    `Status o'zgartirildi: ${status}. Tasdiqlovchi UID: ${cleanAdminUid} (${cleanAdminName}). Izoh: ${cleanNotes || 'Izohsiz'}`
  );
}

export async function deleteProjectOrStartup(
  id: string,
  actor: { id: string; fullName: string; role: UserRole }
) {
  await deleteDoc(doc(db, 'projects', id));
  await logAuditAction(
    actor,
    "Loyiha/Startapni o'chirish",
    'projects',
    id,
    `Loyiha/startap o'chirildi.`
  );
}

// ----------------- ACHIEVEMENTS -----------------
export function subscribeAchievements(onUpdate: (items: Achievement[]) => void): Unsubscribe {
  const colRef = collection(db, 'achievements');
  return onSnapshot(
    colRef,
    snapshot => {
      const list: Achievement[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Achievement);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    error => {
      console.error('Error listening to achievements:', error);
    }
  );
}

export async function createAchievement(
  data: Omit<Achievement, 'id' | 'createdAt' | 'status'>
): Promise<string> {
  const ref = doc(collection(db, 'achievements'));
  const item: Achievement = {
    ...data,
    id: ref.id,
    status: 'Kutilmoqda',
    createdAt: new Date().toISOString(),
  };
  await withFirestoreTimeout(
    setDoc(ref, item),
    12000,
    'Yutuq ma’lumotlarini saqlashda vaqt tugadi. Qayta urinib ko‘ring.'
  );
  return ref.id;
}

export async function updateAchievementStatus(
  id: string,
  status: 'Tasdiqlangan' | 'Rad etilgan',
  notesOrActor?: string | { id?: string; fullName?: string; role?: UserRole },
  actorOrActorName?: { id?: string; fullName?: string; role?: UserRole } | string,
  maybeActorName?: string
) {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new Error("Yutuq identifikatori (ID) ko'rsatilmagan.");
  }

  let notes = '';
  let adminUid = '';
  let adminName = '';
  let adminRole: UserRole = 'admin';

  // Case 1: notesOrActor is an object (actor: { id, fullName, role })
  if (notesOrActor && typeof notesOrActor === 'object') {
    adminUid = notesOrActor.id || '';
    adminName = notesOrActor.fullName || '';
    adminRole = notesOrActor.role || 'admin';
    if (typeof actorOrActorName === 'string') {
      notes = actorOrActorName;
    }
  }
  // Case 2: actorOrActorName is an object (actor: { id, fullName, role })
  else if (actorOrActorName && typeof actorOrActorName === 'object') {
    notes = typeof notesOrActor === 'string' ? notesOrActor : '';
    adminUid = actorOrActorName.id || '';
    adminName = actorOrActorName.fullName || '';
    adminRole = actorOrActorName.role || 'admin';
  }
  // Case 3: (id, status, notes, actorId, actorName)
  else if (typeof notesOrActor === 'string' && typeof actorOrActorName === 'string' && typeof maybeActorName === 'string') {
    notes = notesOrActor;
    adminUid = actorOrActorName;
    adminName = maybeActorName;
  }
  // Case 4: (id, status, actorId, actorName)
  else if (typeof notesOrActor === 'string' && typeof actorOrActorName === 'string') {
    adminUid = notesOrActor;
    adminName = actorOrActorName;
    notes = '';
  }

  // Requirement 9: If Admin or Super Admin cannot be determined, throw a clear error instead of writing invalid data or calling updateDoc()
  if (!adminUid || !adminUid.trim()) {
    throw new Error(
      "Admin yoki Super Admin identifikatori (UID) aniqlanmadi. Noto‘g‘ri ma’lumot yozilmasligi uchun tasdiqlash to‘xtatildi. Iltimos, tizimga qayta kiring."
    );
  }

  const cleanAdminUid = adminUid.trim();
  const cleanAdminName = (adminName || 'Admin').trim();
  const cleanNotes = (notes || '').trim();
  const timestampIso = new Date().toISOString();

  const ref = doc(db, 'achievements', id);
  const updatePayload = removeUndefinedFields({
    status,
    reviewNotes: cleanNotes,
    reviewedAt: timestampIso,
    reviewedBy: cleanAdminUid, // Stores the real Admin/Super Admin UID
    reviewedByName: cleanAdminName, // Stores the Admin full name
    updatedAt: timestampIso,
  });

  await withFirestoreTimeout(
    updateDoc(ref, updatePayload),
    12000,
    'Yutuq holatini yangilashda vaqt tugadi. Qayta urinib ko‘ring.'
  );

  await logAuditAction(
    { id: cleanAdminUid, fullName: cleanAdminName, role: adminRole },
    status === 'Tasdiqlangan' ? "Yutuqni tasdiqlash" : "Yutuqni rad etish",
    'achievements',
    id,
    `Yutuq holati: ${status}. Tasdiqlovchi UID: ${cleanAdminUid} (${cleanAdminName}). Izoh: ${cleanNotes || 'Izohsiz'}`
  );
}

export async function deleteAchievement(
  id: string,
  actor: { id: string; fullName: string; role: UserRole }
) {
  await deleteDoc(doc(db, 'achievements', id));
  await logAuditAction(
    actor,
    "Yutuqni o'chirish",
    'achievements',
    id,
    `Yutuq o'chirildi.`
  );
}

// ----------------- CERTIFICATES -----------------
export function subscribeCertificates(onUpdate: (items: CertificateItem[]) => void): Unsubscribe {
  const colRef = collection(db, 'certificates');
  return onSnapshot(
    colRef,
    snapshot => {
      const list: CertificateItem[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as CertificateItem);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    error => {
      console.error('Error listening to certificates:', error);
    }
  );
}

export async function createCertificateDoc(
  data: Omit<CertificateItem, 'id' | 'createdAt'>,
  actor?: { id: string; fullName: string; role: UserRole }
): Promise<string> {
  const ref = doc(collection(db, 'certificates'));
  const cert: CertificateItem = {
    ...data,
    id: ref.id,
    createdAt: new Date().toISOString(),
  };
  await withFirestoreTimeout(
    setDoc(ref, cert),
    12000,
    'Sertifikat ma’lumotlarini saqlashda vaqt tugadi. Qayta urinib ko‘ring.'
  );

  if (actor) {
    await logAuditAction(
      actor,
      "Sertifikat yaratish",
      'certificates',
      ref.id,
      `Sertifikat rasmiylashtirildi: ${data.certificateNumber} (${data.studentName})`
    );
  }
  return ref.id;
}

export async function updateCertificateStatus(
  id: string,
  status: 'Tasdiqlangan' | 'Rad etilgan',
  actorOrActorId: { id?: string; fullName?: string; role?: UserRole } | string,
  maybeActorName?: string
) {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new Error("Sertifikat identifikatori (ID) ko'rsatilmagan.");
  }

  let adminUid = '';
  let adminName = '';
  let adminRole: UserRole = 'admin';

  if (actorOrActorId && typeof actorOrActorId === 'object') {
    adminUid = actorOrActorId.id || '';
    adminName = actorOrActorId.fullName || '';
    adminRole = actorOrActorId.role || 'admin';
  } else if (typeof actorOrActorId === 'string') {
    adminUid = actorOrActorId;
    adminName = maybeActorName || 'Admin';
  }

  if (!adminUid || !adminUid.trim()) {
    throw new Error(
      "Admin identifikatori (UID) aniqlanmadi. Noto‘g‘ri ma’lumot yozilmasligi uchun tasdiqlash to‘xtatildi. Iltimos, qayta kiring."
    );
  }

  const cleanAdminUid = adminUid.trim();
  const cleanAdminName = (adminName || 'Admin').trim();
  const timestampIso = new Date().toISOString();

  const ref = doc(db, 'certificates', id);
  const updatePayload = removeUndefinedFields({
    status,
    reviewedAt: timestampIso,
    reviewedBy: cleanAdminUid,
    reviewedByName: cleanAdminName,
    updatedAt: timestampIso,
  });

  await withFirestoreTimeout(
    updateDoc(ref, updatePayload),
    12000,
    'Sertifikat holatini yangilashda vaqt tugadi. Qayta urinib ko‘ring.'
  );

  await logAuditAction(
    { id: cleanAdminUid, fullName: cleanAdminName, role: adminRole },
    status === 'Tasdiqlangan' ? "Sertifikatni tasdiqlash" : "Sertifikatni rad etish",
    'certificates',
    id,
    `Sertifikat statusi: ${status}. Tasdiqlovchi UID: ${cleanAdminUid} (${cleanAdminName})`
  );
}

export async function deleteCertificateDoc(
  id: string,
  actor: { id: string; fullName: string; role: UserRole }
) {
  await deleteDoc(doc(db, 'certificates', id));
  await logAuditAction(
    actor,
    "Sertifikatni o'chirish",
    'certificates',
    id,
    `Sertifikat o'chirildi.`
  );
}

export async function getCertificateByNumber(certNumber: string): Promise<CertificateItem | null> {
  const q = query(
    collection(db, 'certificates'),
    where('certificateNumber', '==', certNumber.trim().toUpperCase())
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() } as CertificateItem;
  }
  // Try matching directly by doc ID
  const directSnap = await getDoc(doc(db, 'certificates', certNumber.trim()));
  if (directSnap.exists()) {
    return { id: directSnap.id, ...directSnap.data() } as CertificateItem;
  }
  return null;
}

// ----------------- EVENTS -----------------
export function subscribeEvents(onUpdate: (items: EventItem[]) => void): Unsubscribe {
  const colRef = collection(db, 'events');
  return onSnapshot(
    colRef,
    snapshot => {
      const list: EventItem[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as EventItem);
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(list);
    },
    error => {
      console.error('Error listening to events:', error);
    }
  );
}

export async function createEventDoc(
  data: Omit<EventItem, 'id' | 'createdAt' | 'participantIds'>,
  actorOrId: { id: string; fullName: string; role?: UserRole } | string,
  actorName?: string
): Promise<string> {
  const actor = typeof actorOrId === 'string'
    ? { id: actorOrId, fullName: actorName || 'Admin', role: 'admin' as UserRole }
    : { id: actorOrId.id, fullName: actorOrId.fullName, role: actorOrId.role || ('admin' as UserRole) };

  const ref = doc(collection(db, 'events'));
  const ev: EventItem = {
    ...data,
    id: ref.id,
    participantIds: [],
    createdAt: new Date().toISOString(),
    createdBy: actor.fullName,
  };
  await setDoc(ref, ev);
  await logAuditAction(
    actor,
    "Tadbir yaratish",
    'events',
    ref.id,
    `Yangi tadbir e'lon qilindi: ${data.title}`
  );
  return ref.id;
}

export async function updateEventDoc(
  id: string,
  updates: Partial<EventItem>,
  actor: { id: string; fullName: string; role: UserRole }
) {
  const ref = doc(db, 'events', id);
  await updateDoc(ref, updates);
  await logAuditAction(
    actor,
    "Tadbirni tahrirlash",
    'events',
    id,
    `Tadbir yangilandi: ${updates.title || id}`
  );
}

export async function registerStudentForEvent(
  eventId: string,
  studentId: string,
  studentData?: Partial<StudentProfile>,
  supervisorName?: string
): Promise<boolean> {
  const regId = `${eventId}_${studentId}`;
  const regRef = doc(db, 'eventRegistrations', regId);

  // If studentData isn't fully provided, try to fetch from students doc
  let studentName = studentData?.fullName || '';
  let studentPhone = studentData?.phone || '';
  let studentCourse = studentData?.course || 1;
  let studentGroup = studentData?.group || '';
  let studentFaculty = studentData?.facultyOrField || '';
  let supId = studentData?.supervisorId || '';
  let supName = supervisorName || studentData?.customSupervisorName || '';

  if (!studentName && studentId) {
    try {
      const sSnap = await getDoc(doc(db, 'students', studentId));
      if (sSnap.exists()) {
        const s = sSnap.data() as StudentProfile;
        studentName = s.fullName || '';
        studentPhone = s.phone || '';
        studentCourse = s.course || 1;
        studentGroup = s.group || '';
        studentFaculty = s.facultyOrField || '';
        supId = s.supervisorId || '';
        supName = supName || s.customSupervisorName || '';
      }
    } catch (e) {
      console.warn('Could not fetch student doc during event registration:', e);
    }
  }

  // 1. Create or overwrite document in eventRegistrations collection
  const regDoc: EventRegistration = {
    id: regId,
    eventId,
    studentId,
    registeredAt: new Date().toISOString(),
    status: 'Tasdiqlangan',
    studentName,
    studentPhone,
    studentCourse,
    studentGroup,
    studentFaculty,
    supervisorId: supId,
    supervisorName: supName,
  };
  await setDoc(regRef, regDoc, { merge: true });

  // 2. Also keep event's participantIds array in sync for real-time counters
  const ref = doc(db, 'events', eventId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const current = snap.data() as EventItem;
    const currentParticipants = current.participantIds || [];
    if (!currentParticipants.includes(studentId)) {
      await updateDoc(ref, {
        participantIds: [...currentParticipants, studentId],
      });
    }
  }
  return true;
}

export async function unregisterStudentFromEvent(
  eventId: string,
  studentId: string
): Promise<void> {
  // 1. Delete from eventRegistrations collection
  const regId = `${eventId}_${studentId}`;
  try {
    await deleteDoc(doc(db, 'eventRegistrations', regId));
  } catch (e) {
    console.warn('Error deleting event registration doc:', e);
  }

  // 2. Remove studentId from event's participantIds array
  const ref = doc(db, 'events', eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = snap.data() as EventItem;
  const updated = (current.participantIds || []).filter(id => id !== studentId);
  await updateDoc(ref, {
    participantIds: updated,
  });
}

/**
 * Real-time listener for registrations of a specific event
 */
export function subscribeEventRegistrations(
  eventId: string,
  onUpdate: (regs: EventRegistration[]) => void
): Unsubscribe {
  const colRef = collection(db, 'eventRegistrations');
  const q = query(colRef, where('eventId', '==', eventId));
  return onSnapshot(
    q,
    snapshot => {
      const list: EventRegistration[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() } as EventRegistration);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
      onUpdate(list);
    },
    error => {
      console.error('Error listening to eventRegistrations for event:', eventId, error);
    }
  );
}

/**
 * Fetch registrations for an event once, with auto-fallback to event.participantIds
 */
export async function getEventRegistrations(
  eventId: string,
  allStudents?: StudentProfile[]
): Promise<EventRegistration[]> {
  try {
    const q = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId));
    const snap = await getDocs(q);
    const regs: EventRegistration[] = [];
    snap.forEach(d => {
      regs.push({ id: d.id, ...d.data() } as EventRegistration);
    });

    if (regs.length > 0) {
      return regs;
    }

    // Fallback: check event doc's participantIds
    const eventSnap = await getDoc(doc(db, 'events', eventId));
    if (!eventSnap.exists()) return [];
    const eventData = eventSnap.data() as EventItem;
    const pIds = eventData.participantIds || [];
    if (pIds.length === 0) return [];

    const fallbackList: EventRegistration[] = [];
    for (const sid of pIds) {
      const foundStudent = allStudents?.find(s => s.id === sid);
      fallbackList.push({
        id: `${eventId}_${sid}`,
        eventId,
        studentId: sid,
        registeredAt: eventData.createdAt || new Date().toISOString(),
        status: 'Tasdiqlangan',
        studentName: foundStudent?.fullName,
        studentPhone: foundStudent?.phone,
        studentCourse: foundStudent?.course,
        studentGroup: foundStudent?.group,
        studentFaculty: foundStudent?.facultyOrField,
      });
    }
    return fallbackList;
  } catch (err) {
    console.error('Error fetching event registrations:', err);
    return [];
  }
}

export async function deleteEventDoc(
  id: string,
  actorOrId: { id: string; fullName: string; role?: UserRole } | string,
  actorName?: string
) {
  const actor = typeof actorOrId === 'string'
    ? { id: actorOrId, fullName: actorName || 'Admin', role: 'admin' as UserRole }
    : { id: actorOrId.id, fullName: actorOrId.fullName, role: actorOrId.role || ('admin' as UserRole) };

  await deleteDoc(doc(db, 'events', id));
  await logAuditAction(
    actor,
    "Tadbirni o'chirish",
    'events',
    id,
    `Tadbir o'chirildi.`
  );
}

// ----------------- ANNOUNCEMENTS -----------------
export function subscribeAnnouncements(onUpdate: (items: Announcement[]) => void): Unsubscribe {
  const colRef = collection(db, 'announcements');
  return onSnapshot(
    colRef,
    snapshot => {
      const list: Announcement[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Announcement);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    error => {
      console.error('Error listening to announcements:', error);
    }
  );
}

export async function createAnnouncementDoc(
  data: Omit<Announcement, 'id' | 'createdAt'>,
  actorOrId: { id: string; fullName: string; role?: UserRole } | string,
  actorName?: string
): Promise<string> {
  const actor = typeof actorOrId === 'string'
    ? { id: actorOrId, fullName: actorName || 'Admin', role: 'admin' as UserRole }
    : { id: actorOrId.id, fullName: actorOrId.fullName, role: actorOrId.role || ('admin' as UserRole) };

  const ref = doc(collection(db, 'announcements'));
  const ann: Announcement = {
    ...data,
    id: ref.id,
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, ann);
  await logAuditAction(
    actor,
    "E'lon yaratish",
    'announcements',
    ref.id,
    `Yangi e'lon joylandi: ${data.title}`
  );
  return ref.id;
}

export async function deleteAnnouncementDoc(
  id: string,
  actorOrId: { id: string; fullName: string; role?: UserRole } | string,
  actorName?: string
) {
  const actor = typeof actorOrId === 'string'
    ? { id: actorOrId, fullName: actorName || 'Admin', role: 'admin' as UserRole }
    : { id: actorOrId.id, fullName: actorOrId.fullName, role: actorOrId.role || ('admin' as UserRole) };

  await deleteDoc(doc(db, 'announcements', id));
  await logAuditAction(
    actor,
    "E'lonni o'chirish",
    'announcements',
    id,
    `E'lon o'chirildi.`
  );
}

// ----------------- AUDIT LOGS -----------------
export function subscribeAuditLogs(onUpdate: (logs: AuditLog[]) => void): Unsubscribe {
  const colRef = collection(db, 'auditLogs');
  return onSnapshot(
    colRef,
    snapshot => {
      const list: AuditLog[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AuditLog);
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(list);
    },
    error => {
      console.error('Error listening to audit logs:', error);
    }
  );
}

// ----------------- USERS & ADMINS -----------------
export function subscribeUsers(onUpdate: (users: UserAccount[]) => void): Unsubscribe {
  const colRef = collection(db, 'users');
  return onSnapshot(
    colRef,
    snapshot => {
      const list: UserAccount[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as UserAccount);
      });
      onUpdate(list);
    },
    error => {
      console.error('Error listening to users:', error);
    }
  );
}

export async function toggleUserActiveStatus(
  userId: string,
  currentStatus: boolean,
  actor: { id: string; fullName: string; role: UserRole }
) {
  const newStatus = !currentStatus;
  await updateDoc(doc(db, 'users', userId), {
    isActive: newStatus,
    updatedAt: new Date().toISOString(),
  });
  await logAuditAction(
    actor,
    newStatus ? "Foydalanuvchini faollashtirish" : "Foydalanuvchini bloklash",
    'users',
    userId,
    `Foydalanuvchi holati ${newStatus ? 'Faol' : 'Bloklangan'} ga o'zgartirildi.`
  );
}

export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  actor: { id: string; fullName: string; role: UserRole }
) {
  await updateDoc(doc(db, 'users', userId), {
    role: newRole,
    updatedAt: new Date().toISOString(),
  });
  await logAuditAction(
    actor,
    "Foydalanuvchi rolini o'zgartirish",
    'users',
    userId,
    `Foydalanuvchi roli ${newRole} ga o'zgartirildi.`
  );
}

export async function deleteUserAccount(
  userId: string,
  actor: { id: string; fullName: string; role: UserRole }
) {
  await deleteDoc(doc(db, 'users', userId));
  await logAuditAction(
    actor,
    "Foydalanuvchini o'chirish",
    'users',
    userId,
    `Foydalanuvchi akkaunti butunlay o'chirildi.`
  );
}

// ----------------- GENERIC REAL-TIME LISTENER -----------------
export function subscribeToCollection<T>(
  collectionName: string,
  onUpdate: (items: T[]) => void
): Unsubscribe {
  const colRef = collection(db, collectionName);
  return onSnapshot(
    colRef,
    snapshot => {
      const list: T[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as unknown as T);
      });
      onUpdate(list);
    },
    error => {
      console.error(`Error listening to collection ${collectionName}:`, error);
    }
  );
}

// ----------------- ALIASES AND COMPONENT WRAPPERS -----------------
export const updateProjectOrStartupStatus = async (
  id: string,
  status: 'Tasdiqlangan' | 'Rad etilgan',
  notes: string,
  actorId: string,
  actorName: string
) => {
  return updateProjectStatus(id, status, notes, { id: actorId, fullName: actorName, role: 'admin' });
};

export const updateAchievementDocStatus = async (
  id: string,
  status: 'Tasdiqlangan' | 'Rad etilgan',
  notes: string,
  actorId: string,
  actorName: string
) => {
  return updateAchievementStatus(id, status, notes, { id: actorId, fullName: actorName, role: 'admin' });
};

export const updateCertificateDocStatus = async (
  id: string,
  status: 'Tasdiqlangan' | 'Rad etilgan',
  actorId: string,
  actorName: string
) => {
  return updateCertificateStatus(id, status, { id: actorId, fullName: actorName, role: 'admin' });
};

export const assignSupervisorToStudent = async (
  studentId: string,
  supervisorId: string,
  actorId: string,
  actorName: string
) => {
  return assignStudentSupervisor(studentId, supervisorId, {
    id: actorId,
    fullName: actorName,
    role: 'admin',
  });
};

export const deleteStudentProfile = async (
  studentId: string,
  actorId: string,
  actorName: string
) => {
  return deleteStudent(studentId, '', {
    id: actorId,
    fullName: actorName,
    role: 'admin',
  });
};

export const createSupervisorProfile = async (
  data: Omit<SupervisorProfile, 'id' | 'createdAt'>,
  password: string,
  actorId: string,
  actorName: string
) => {
  const ref = doc(collection(db, 'supervisors'));
  const supervisor: SupervisorProfile = {
    ...data,
    id: ref.id,
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, supervisor);

  await logAuditAction(
    { id: actorId, fullName: actorName, role: 'admin' },
    "Ilmiy rahbar qo'shish",
    'supervisors',
    ref.id,
    `Yangi ilmiy rahbar qo'shildi: ${data.fullName}`
  );
  return supervisor;
};

export const updateSupervisorProfile = async (
  id: string,
  updates: Partial<SupervisorProfile>,
  actorId: string,
  actorName: string
) => {
  return updateSupervisorDoc(id, updates, { id: actorId, fullName: actorName, role: 'admin' });
};

export const deleteSupervisorProfile = async (
  id: string,
  actorId: string,
  actorName: string
) => {
  return deleteSupervisorDoc(id, { id: actorId, fullName: actorName, role: 'admin' });
};

export async function createOfficialCertificate(
  data: {
    studentId: string;
    studentName: string;
    eventTitle: string;
    title: string;
    organizationName: string;
    issueDate: string;
  },
  actorId: string,
  actorName: string
): Promise<CertificateItem> {
  const certNumber = `CERT-2026-${Date.now().toString().slice(-4)}`;
  const ref = doc(collection(db, 'certificates'));

  const cert: CertificateItem = {
    id: ref.id,
    certificateNumber: certNumber,
    title: data.title,
    eventTitle: data.eventTitle,
    studentId: data.studentId,
    studentName: data.studentName,
    organizationName: data.organizationName,
    issueDate: data.issueDate,
    status: 'Tasdiqlangan',
    isOfficialGenerated: true,
    createdAt: new Date().toISOString(),
  };

  await setDoc(ref, cert);

  await logAuditAction(
    { id: actorId, fullName: actorName, role: 'admin' },
    "Rasmiy sertifikat rasmiylashtirildi",
    'certificates',
    ref.id,
    `Rasmiy sertifikat berildi: ${certNumber} (${data.studentName})`
  );

  return cert;
}

/**
 * Admin updates student full profile, password and photoURL/avatarUrl
 */
export async function updateStudentFullByAdmin(
  actor: { id: string; fullName: string; role: UserRole },
  studentId: string,
  data: {
    fullName: string;
    phone: string;
    course: number;
    group: string;
    facultyOrField: string;
    supervisorId: string;
    customSupervisorName?: string;
    avatarUrl?: string;
    photoURL?: string;
    newPassword?: string;
  }
): Promise<void> {
  if (actor.role !== 'admin' && actor.role !== 'superAdmin') {
    throw new Error("Faqat Admin yoki Super Admin talaba ma'lumotlarini tahrirlashi mumkin.");
  }

  const studentRef = doc(db, 'students', studentId);
  const studentSnap = await getDoc(studentRef);
  if (!studentSnap.exists()) {
    throw new Error("Talaba profili topilmadi.");
  }
  const currentStudent = studentSnap.data() as StudentProfile;

  const normalizedPhone = normalizePhone(data.phone);
  if (!isValidUzbekPhone(normalizedPhone)) {
    throw new Error("Telefon raqami formati noto'g'ri. Masalan: +998 (90) 123-45-67");
  }

  // If phone changed, verify uniqueness
  if (normalizedPhone !== currentStudent.phone) {
    const qPhone = query(collection(db, 'users'), where('phone', '==', normalizedPhone), limit(1));
    const snapPhone = await getDocs(qPhone);
    if (!snapPhone.empty && snapPhone.docs[0].id !== currentStudent.userId) {
      throw new Error("Ushbu telefon raqam bilan tizimda boshqa foydalanuvchi mavjud.");
    }
  }

  const studentUpdates: Partial<StudentProfile> = {
    fullName: data.fullName.trim(),
    phone: normalizedPhone,
    course: Number(data.course),
    group: data.group.trim().toUpperCase(),
    facultyOrField: data.facultyOrField.trim(),
    supervisorId: data.supervisorId || '',
    customSupervisorName: data.customSupervisorName?.trim() || '',
    updatedAt: new Date().toISOString(),
  };

  if (data.avatarUrl !== undefined) {
    studentUpdates.avatarUrl = data.avatarUrl;
    studentUpdates.photoURL = data.avatarUrl;
  }

  await setDoc(studentRef, studentUpdates, { merge: true });

  // Update corresponding user document if exists
  if (currentStudent.userId) {
    const userRef = doc(db, 'users', currentStudent.userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userUpdates: any = {
        fullName: data.fullName.trim(),
        phone: normalizedPhone,
        updatedAt: new Date().toISOString(),
      };

      if (data.avatarUrl !== undefined) {
        userUpdates.avatarUrl = data.avatarUrl;
        userUpdates.photoURL = data.avatarUrl;
      }

      // If new password provided, safely hash and update
      if (data.newPassword && data.newPassword.trim().length > 0) {
        if (data.newPassword.trim().length < 6) {
          throw new Error("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak.");
        }
        const salt = generateSalt();
        const passwordHash = await hashPassword(data.newPassword.trim(), salt);
        userUpdates.passwordHash = passwordHash;
        userUpdates.salt = salt;

        // Audit log: student password updated (Never log the password itself!)
        await logAuditAction(
          actor,
          "student password updated",
          'users',
          currentStudent.userId,
          `Admin (${actor.fullName}) tomonidan talaba (${data.fullName}) hisobining paroli yangilandi.`
        );
      }

      await setDoc(userRef, userUpdates, { merge: true });
    }
  }

  // Audit log: student profile updated
  await logAuditAction(
    actor,
    "student profile updated",
    'students',
    studentId,
    `Admin (${actor.fullName}) tomonidan talaba anketasi yangilandi: ${data.fullName}`
  );

  // Audit log: profile photo updated
  if (data.avatarUrl !== undefined && data.avatarUrl !== currentStudent.avatarUrl) {
    await logAuditAction(
      actor,
      "profile photo updated",
      'students',
      studentId,
      data.avatarUrl
        ? `Admin (${actor.fullName}) tomonidan talaba (${data.fullName}) profil rasmi yangilandi.`
        : `Admin (${actor.fullName}) tomonidan talaba (${data.fullName}) profil rasmi o'chirildi.`
    );
  }
}

/**
 * Admin updates supervisor full profile, password and photoURL/avatarUrl
 */
export async function updateSupervisorFullByAdmin(
  actor: { id: string; fullName: string; role: UserRole },
  supervisorId: string,
  data: {
    fullName: string;
    phone: string;
    email: string;
    position: string;
    academicDegree: string;
    department: string;
    avatarUrl?: string;
    photoURL?: string;
    newPassword?: string;
  }
): Promise<void> {
  if (actor.role !== 'admin' && actor.role !== 'superAdmin') {
    throw new Error("Faqat Admin yoki Super Admin ilmiy rahbar ma'lumotlarini tahrirlashi mumkin.");
  }

  const supRef = doc(db, 'supervisors', supervisorId);
  const supSnap = await getDoc(supRef);
  if (!supSnap.exists()) {
    throw new Error("Ilmiy rahbar topilmadi.");
  }
  const currentSup = supSnap.data() as SupervisorProfile;

  const normalizedPhone = normalizePhone(data.phone);

  const supUpdates: Partial<SupervisorProfile> = {
    fullName: data.fullName.trim(),
    phone: normalizedPhone,
    email: data.email.trim(),
    position: data.position.trim(),
    academicDegree: data.academicDegree.trim(),
    department: data.department.trim(),
    updatedAt: new Date().toISOString(),
  };

  if (data.avatarUrl !== undefined) {
    supUpdates.avatarUrl = data.avatarUrl;
    supUpdates.photoURL = data.avatarUrl;
  }

  let targetUserId = currentSup.userId;

  // Handle users collection account & password
  if (targetUserId) {
    const userRef = doc(db, 'users', targetUserId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userUpdates: any = {
        fullName: data.fullName.trim(),
        phone: normalizedPhone,
        updatedAt: new Date().toISOString(),
      };
      if (data.avatarUrl !== undefined) {
        userUpdates.avatarUrl = data.avatarUrl;
        userUpdates.photoURL = data.avatarUrl;
      }
      if (data.newPassword && data.newPassword.trim().length > 0) {
        if (data.newPassword.trim().length < 6) {
          throw new Error("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak.");
        }
        const salt = generateSalt();
        const passwordHash = await hashPassword(data.newPassword.trim(), salt);
        userUpdates.passwordHash = passwordHash;
        userUpdates.salt = salt;

        await logAuditAction(
          actor,
          "supervisor password updated",
          'users',
          targetUserId,
          `Admin (${actor.fullName}) tomonidan ilmiy rahbar (${data.fullName}) paroli yangilandi.`
        );
      }
      await setDoc(userRef, userUpdates, { merge: true });
    }
  } else if (data.newPassword && data.newPassword.trim().length > 0) {
    // Supervisor had no userId, but admin set a password -> create login account
    if (data.newPassword.trim().length < 6) {
      throw new Error("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak.");
    }

    // Check if user account with phone already exists
    const qPhone = query(collection(db, 'users'), where('phone', '==', normalizedPhone), limit(1));
    const snapPhone = await getDocs(qPhone);

    const salt = generateSalt();
    const passwordHash = await hashPassword(data.newPassword.trim(), salt);

    if (!snapPhone.empty) {
      const existingUser = snapPhone.docs[0];
      targetUserId = existingUser.id;
      await setDoc(
        existingUser.ref,
        {
          fullName: data.fullName.trim(),
          phone: normalizedPhone,
          passwordHash,
          salt,
          role: 'supervisor',
          isActive: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } else {
      const newUserRef = doc(collection(db, 'users'));
      targetUserId = newUserRef.id;
      const newUser: UserAccount = {
        id: targetUserId,
        fullName: data.fullName.trim(),
        phone: normalizedPhone,
        passwordHash,
        salt,
        role: 'supervisor',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      if (data.avatarUrl) {
        newUser.avatarUrl = data.avatarUrl;
        newUser.photoURL = data.avatarUrl;
      }
      await setDoc(newUserRef, newUser);
    }

    supUpdates.userId = targetUserId;

    await logAuditAction(
      actor,
      "supervisor password updated",
      'users',
      targetUserId,
      `Admin (${actor.fullName}) tomonidan ilmiy rahbar (${data.fullName}) uchun yangi login hisobi va paroli sozlandi.`
    );
  }

  await setDoc(supRef, supUpdates, { merge: true });

  // Audit log: supervisor profile updated
  await logAuditAction(
    actor,
    "supervisor profile updated",
    'supervisors',
    supervisorId,
    `Admin (${actor.fullName}) tomonidan ilmiy rahbar ma'lumotlari yangilandi: ${data.fullName}`
  );

  // Audit log: profile photo updated
  if (data.avatarUrl !== undefined && data.avatarUrl !== currentSup.avatarUrl) {
    await logAuditAction(
      actor,
      "profile photo updated",
      'supervisors',
      supervisorId,
      data.avatarUrl
        ? `Admin (${actor.fullName}) tomonidan ilmiy rahbar (${data.fullName}) profil rasmi yangilandi.`
        : `Admin (${actor.fullName}) tomonidan ilmiy rahbar (${data.fullName}) profil rasmi o'chirildi.`
    );
  }
}

/**
 * Student updates own profile photo
 */
export async function updateStudentSelfProfilePhoto(
  studentId: string,
  userId: string,
  photoUrl: string,
  actor: { id: string; fullName: string; role: UserRole }
): Promise<void> {
  const studentRef = doc(db, 'students', studentId);
  await setDoc(studentRef, { avatarUrl: photoUrl, photoURL: photoUrl, updatedAt: new Date().toISOString() }, { merge: true });

  if (userId) {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { avatarUrl: photoUrl, photoURL: photoUrl, updatedAt: new Date().toISOString() }, { merge: true });
  }

  await logAuditAction(
    actor,
    "profile photo updated",
    'students',
    studentId,
    photoUrl
      ? `Talaba (${actor.fullName}) o'z profil rasmini yangiladi.`
      : `Talaba (${actor.fullName}) o'z profil rasmini o'chirdi.`
  );
}

/**
 * Supervisor updates own profile photo
 */
export async function updateSupervisorSelfProfilePhoto(
  supervisorId: string,
  userId: string | undefined,
  photoUrl: string,
  actor: { id: string; fullName: string; role: UserRole }
): Promise<void> {
  const supRef = doc(db, 'supervisors', supervisorId);
  await setDoc(supRef, { avatarUrl: photoUrl, photoURL: photoUrl, updatedAt: new Date().toISOString() }, { merge: true });

  if (userId) {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { avatarUrl: photoUrl, photoURL: photoUrl, updatedAt: new Date().toISOString() }, { merge: true });
  }

  await logAuditAction(
    actor,
    "profile photo updated",
    'supervisors',
    supervisorId,
    photoUrl
      ? `Ilmiy rahbar (${actor.fullName}) o'z profil rasmini yangiladi.`
      : `Ilmiy rahbar (${actor.fullName}) o'z profil rasmini o'chirdi.`
  );
}


