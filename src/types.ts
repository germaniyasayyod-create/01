export type UserRole = 'superAdmin' | 'admin' | 'student' | 'supervisor';

export interface UserAccount {
  id: string;
  phone: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  fullName: string;
  isActive: boolean;
  avatarUrl?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  course: number;
  group: string;
  facultyOrField: string;
  supervisorId: string;
  customSupervisorName?: string;
  avatarUrl?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SupervisorProfile {
  id: string;
  userId?: string;
  fullName: string;
  phone: string;
  email: string;
  position: string;
  academicDegree: string;
  department: string;
  avatarUrl?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminProfile {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface ProjectOrStartup {
  id: string;
  type: 'loyiha' | 'startap';
  title: string;
  description: string;
  field: string;
  supervisorId?: string;
  studentId: string;
  studentName: string;
  studentPhone?: string;
  authorNames: string;
  status: 'Kutilmoqda' | 'Tasdiqlangan' | 'Rad etilgan';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  storagePath?: string;
  fileDataUrl?: string;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNotes?: string;
}

export interface Achievement {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  category: 'Olimpiada' | 'Tanlov' | 'Konferensiya' | 'Stipendiya' | 'Musobaqa' | 'Boshqa yutuqlar';
  date: string;
  description: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  storagePath?: string;
  fileDataUrl?: string;
  status: 'Kutilmoqda' | 'Tasdiqlangan' | 'Rad etilgan';
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNotes?: string;
}

export interface CertificateItem {
  id: string;
  certificateNumber: string;
  title: string;
  eventTitle: string;
  eventId?: string;
  studentId: string;
  studentName: string;
  organizationName: string;
  issueDate: string;
  status: 'Kutilmoqda' | 'Tasdiqlangan' | 'Rad etilgan';
  isOfficialGenerated?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  storagePath?: string;
  fileDataUrl?: string;
  qrCodeData?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  deadline: string;
  status: 'Rejalashtirilgan' | 'Davom etmoqda' | 'Yakunlangan';
  participantIds: string[];
  createdAt: string;
  createdBy: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  studentId: string;
  registeredAt: string;
  status: 'Tasdiqlangan' | 'Kutilmoqda' | 'Bekor qilingan';
  studentName?: string;
  studentPhone?: string;
  studentCourse?: number;
  studentGroup?: string;
  studentFaculty?: string;
  supervisorId?: string;
  supervisorName?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  audience: 'Barcha talabalar' | 'Tanlangan talabalar' | 'Tadbir ishtirokchilari';
  targetStudentIds?: string[];
  targetEventId?: string;
  imageUrl?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface DashboardStats {
  studentsCount: number;
  supervisorsCount: number;
  projectsCount: number;
  startupsCount: number;
  achievementsCount: number;
  certificatesCount: number;
  eventsCount: number;
  pendingApprovalsCount: number;
  courseDistribution: Record<number, number>;
}
