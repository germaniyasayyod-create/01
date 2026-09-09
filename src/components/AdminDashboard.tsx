import React, { useState } from 'react';
import {
  BarChart3,
  Users,
  GraduationCap,
  FolderGit2,
  Rocket,
  Trophy,
  Award,
  Calendar,
  Bell,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Shield,
  ShieldCheck,
  Search,
  Download,
  Filter,
  Eye,
  Lock,
  Unlock,
  QrCode,
  Send,
  AlertTriangle,
  Menu,
  X,
  ChevronRight,
  User,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { EmptyState } from './EmptyState';
import { EditStudentModal } from './EditStudentModal';
import { EditSupervisorModal } from './EditSupervisorModal';
import {
  updateProjectOrStartupStatus,
  updateAchievementStatus,
  updateCertificateDocStatus,
  createEventDoc,
  deleteEventDoc,
  createAnnouncementDoc,
  deleteAnnouncementDoc,
  createSupervisorProfile,
  updateSupervisorProfile,
  deleteSupervisorProfile,
  assignSupervisorToStudent,
  deleteStudentProfile,
  createOfficialCertificate,
} from '../services/firestoreService';
import {
  registerAdminUser,
  toggleUserBlockStatus,
  changeUserRole,
} from '../services/authService';
import { downloadCertificatePdf } from '../lib/certificateGenerator';
import { formatUzbekPhone } from '../lib/crypto';
import type {
  UserAccount,
  StudentProfile,
  SupervisorProfile,
  ProjectOrStartup,
  Achievement,
  CertificateItem,
  EventItem,
  Announcement,
  AuditLog,
} from '../types';

interface Props {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  students: StudentProfile[];
  supervisors: SupervisorProfile[];
  projects: ProjectOrStartup[];
  achievements: Achievement[];
  certificates: CertificateItem[];
  events: EventItem[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
  onOpenPdf: (url: string, name?: string, size?: number, title?: string) => void;
  onConfirmModal: (options: {
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
  }) => void;
  onOpenEventParticipants?: (event: EventItem) => void;
  onOpenStudentProfile?: (studentId: string) => void;
}

type TabType =
  | 'stats'
  | 'students'
  | 'supervisors'
  | 'projects'
  | 'achievements'
  | 'certificates'
  | 'events'
  | 'announcements'
  | 'admins'
  | 'audit';

export const AdminDashboard: React.FC<Props> = ({
  currentUser,
  allUsers = [],
  students = [],
  supervisors = [],
  projects = [],
  achievements = [],
  certificates = [],
  events = [],
  announcements = [],
  auditLogs = [],
  onNotify,
  onOpenPdf,
  onConfirmModal,
  onOpenEventParticipants,
  onOpenStudentProfile,
}) => {
  const isSuperAdmin = currentUser.role === 'superAdmin';
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Define admin navigation tabs
  const adminNavItems = [
    { id: 'stats' as TabType, label: 'Statistika', icon: BarChart3, count: null },
    { id: 'students' as TabType, label: 'Talabalar', icon: GraduationCap, count: students.length },
    { id: 'supervisors' as TabType, label: 'Ilmiy rahbarlar', icon: Users, count: supervisors.length },
    { id: 'projects' as TabType, label: 'Loyihalar', icon: FolderGit2, count: projects.length },
    { id: 'achievements' as TabType, label: 'Yutuqlar', icon: Trophy, count: achievements.length },
    { id: 'certificates' as TabType, label: 'Sertifikatlar', icon: Award, count: certificates.length },
    { id: 'events' as TabType, label: 'Tadbirlar', icon: Calendar, count: events.length },
    { id: 'announcements' as TabType, label: "E'lonlar", icon: Bell, count: announcements.length },
    ...(isSuperAdmin ? [{ id: 'admins' as TabType, label: 'Adminlar va Huquqlar', icon: Shield, count: allUsers.filter(u => u.role === 'admin' || u.role === 'superAdmin').length }] : []),
    { id: 'audit' as TabType, label: 'Audit Log', icon: FileText, count: auditLogs.length },
  ];

  const currentTabInfo = adminNavItems.find(item => item.id === activeTab) || adminNavItems[0];
  const CurrentIcon = currentTabInfo.icon;

  // Search & Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [studentCourseFilter, setStudentCourseFilter] = useState<string>('all');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all');

  // New Supervisor modal
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [supFullName, setSupFullName] = useState('');
  const [supPhone, setSupPhone] = useState('+998 ');
  const [supPosition, setSupPosition] = useState('Dotsent');
  const [supDegree, setSupDegree] = useState('PhD');
  const [supDept, setSupDept] = useState('Axborot texnologiyalari');
  const [supEmail, setSupEmail] = useState('');
  const [supPassword, setSupPassword] = useState('123456');
  const [isSupSubmitting, setIsSupSubmitting] = useState(false);

  // New Event modal
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('10:00');
  const [eventLocation, setEventLocation] = useState('Bosh bino, Anjumanlar zali');
  const [eventDeadline, setEventDeadline] = useState('');
  const [isEventSubmitting, setIsEventSubmitting] = useState(false);

  // New Announcement modal
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annAudience, setAnnAudience] = useState<'Barchaga' | 'Talabalar' | 'Ilmiy rahbarlar'>('Barchaga');

  // Edit Student Modal state
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);

  // Edit Supervisor Modal state
  const [editingSupervisor, setEditingSupervisor] = useState<SupervisorProfile | null>(null);
  const [isEditSupervisorModalOpen, setIsEditSupervisorModalOpen] = useState(false);
  const [isAnnSubmitting, setIsAnnSubmitting] = useState(false);

  // Issue Official Certificate modal
  const [isCertIssueModalOpen, setIsCertIssueModalOpen] = useState(false);
  const [certStudentId, setCertStudentId] = useState('');
  const [certEventTitle, setCertEventTitle] = useState('');
  const [certTitle, setCertTitle] = useState('Iqtidorli talaba faxriy sertifikati');
  const [certOrg, setCertOrg] = useState('Universitet Ilmiy-innovatsion Kengashi');
  const [certDate, setCertDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCertIssuing, setIsCertIssuing] = useState(false);

  // Super Admin: New Admin modal
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminPhone, setAdminPhone] = useState('+998 ');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminRole, setAdminRole] = useState<'admin' | 'superAdmin'>('admin');
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);

  // Review Project / Achievement modal (with notes)
  const [reviewModalData, setReviewModalData] = useState<{
    type: 'project' | 'achievement' | 'cert';
    id: string;
    title: string;
    status: 'Tasdiqlangan' | 'Rad etilgan';
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  // Filtered Students
  const filteredStudents = students.filter(st => {
    const q = (studentSearch || '').toLowerCase().trim();
    const matchName = !q ||
      (st.fullName || '').toLowerCase().includes(q) ||
      (st.phone || '').includes(q) ||
      (st.group || '').toLowerCase().includes(q) ||
      (st.facultyOrField || '').toLowerCase().includes(q);
    const matchCourse = studentCourseFilter === 'all' || (st.course != null && st.course.toString() === studentCourseFilter);
    return matchName && matchCourse;
  });

  // Filtered Projects
  const filteredProjects = projects.filter(p => {
    if (projectStatusFilter === 'all') return true;
    return p.status === projectStatusFilter;
  });

  // Action: Create Supervisor Profile + Account
  const handleCreateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSupSubmitting(true);
    try {
      await createSupervisorProfile(
        {
          fullName: supFullName.trim(),
          phone: supPhone.trim(),
          position: supPosition.trim(),
          academicDegree: supDegree.trim(),
          department: supDept.trim(),
          email: supEmail.trim(),
        },
        supPassword.trim(),
        currentUser.id,
        currentUser.fullName
      );
      onNotify('success', "Yangi ilmiy rahbar va uning tizim hisobi muvaffaqiyatli yaratildi!");
      setIsSupervisorModalOpen(false);
      setSupFullName('');
      setSupPhone('+998 ');
      setSupEmail('');
    } catch (err: any) {
      onNotify('error', err.message || "Ilmiy rahbar qo'shishda xatolik.");
    } finally {
      setIsSupSubmitting(false);
    }
  };

  // Action: Create Event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEventSubmitting(true);
    try {
      await createEventDoc(
        {
          title: eventTitle.trim(),
          description: eventDesc.trim(),
          date: eventDate,
          time: eventTime.trim(),
          location: eventLocation.trim(),
          deadline: eventDeadline.trim(),
          status: 'Rejalashtirilgan',
          createdBy: currentUser.fullName,
        },
        currentUser.id,
        currentUser.fullName
      );
      onNotify('success', "Yangi tadbir muvaffaqiyatli e'lon qilindi!");
      setIsEventModalOpen(false);
      setEventTitle('');
      setEventDesc('');
    } catch (err: any) {
      onNotify('error', err.message || "Tadbir yaratishda xatolik.");
    } finally {
      setIsEventSubmitting(false);
    }
  };

  // Action: Create Announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnnSubmitting(true);
    try {
      await createAnnouncementDoc(
        {
          title: annTitle.trim(),
          content: annContent.trim(),
          audience: annAudience,
          date: new Date().toLocaleDateString(),
          createdBy: currentUser.fullName,
          createdByName: currentUser.fullName,
        },
        currentUser.id,
        currentUser.fullName
      );
      onNotify('success', "E'lon barcha foydalanuvchilarga muvaffaqiyatli yetkazildi!");
      setIsAnnModalOpen(false);
      setAnnTitle('');
      setAnnContent('');
    } catch (err: any) {
      onNotify('error', err.message || "E'lon chiqarishda xatolik.");
    } finally {
      setIsAnnSubmitting(false);
    }
  };

  // Action: Issue Official Certificate with QR Code & PDF
  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find(s => s.id === certStudentId);
    if (!st) {
      onNotify('error', "Iltimos, talabani tanlang.");
      return;
    }

    setIsCertIssuing(true);
    try {
      const newCert = await createOfficialCertificate(
        {
          studentId: st.id,
          studentName: st.fullName,
          eventTitle: certEventTitle.trim(),
          title: certTitle.trim(),
          organizationName: certOrg.trim(),
          issueDate: certDate,
        },
        currentUser.id,
        currentUser.fullName
      );

      onNotify('success', `Sertifikat ${newCert.certificateNumber} raqami bilan muvaffaqiyatli yaratildi va ro'yxatga olindi!`);
      setIsCertIssueModalOpen(false);

      // Trigger instant official PDF download
      downloadCertificatePdf({
        certificateNumber: newCert.certificateNumber,
        studentName: newCert.studentName,
        title: newCert.title,
        eventTitle: newCert.eventTitle,
        organizationName: newCert.organizationName,
        issueDate: newCert.issueDate,
      });
    } catch (err: any) {
      onNotify('error', err.message || "Sertifikat berishda xatolik.");
    } finally {
      setIsCertIssuing(false);
    }
  };

  // Action: Submit review (Approve / Reject)
  const handleSubmitReview = async () => {
    if (!reviewModalData) return;

    // Requirement: Validate Admin/Super Admin identity before attempting updateDoc()
    if (!currentUser || !currentUser.id) {
      onNotify(
        'error',
        'Admin yoki Super Admin identifikatori (UID) aniqlanmadi. Noto‘g‘ri ma’lumot yozilmasligi uchun tasdiqlash to‘xtatildi. Iltimos, qayta kiring.'
      );
      return;
    }

    setIsReviewSubmitting(true);
    try {
      const actor = {
        id: currentUser.id,
        fullName: currentUser.fullName || 'Admin',
        role: currentUser.role,
      };

      if (reviewModalData.type === 'project') {
        await updateProjectOrStartupStatus(
          reviewModalData.id,
          reviewModalData.status,
          reviewNotes.trim(),
          actor.id,
          actor.fullName
        );
      } else if (reviewModalData.type === 'achievement') {
        await updateAchievementStatus(
          reviewModalData.id,
          reviewModalData.status,
          reviewNotes.trim(),
          actor
        );
      } else if (reviewModalData.type === 'cert') {
        await updateCertificateDocStatus(
          reviewModalData.id,
          reviewModalData.status,
          actor.id,
          actor.fullName
        );
      }

      onNotify('success', `Status «${reviewModalData.status}» holatiga o‘zgartirildi.`);
      setReviewModalData(null);
      setReviewNotes('');
    } catch (err: any) {
      onNotify('error', err.message || "Statusni o'zgartirishda xatolik.");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  // Super Admin: Create Admin
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdminSubmitting(true);
    try {
      await registerAdminUser(
        {
          fullName: adminFullName.trim(),
          phone: adminPhone.trim(),
          password: adminPassword.trim(),
          role: adminRole,
        },
        currentUser.id,
        currentUser.fullName
      );
      onNotify('success', `Yangi ${adminRole === 'superAdmin' ? 'Super Admin' : 'Admin'} muvaffaqiyatli ro'yxatga olindi!`);
      setIsAdminModalOpen(false);
      setAdminFullName('');
      setAdminPhone('+998 ');
      setAdminPassword('');
    } catch (err: any) {
      onNotify('error', err.message || "Admin qo'shishda xatolik.");
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-900 text-white flex items-center justify-center text-xl font-bold shadow-xs">
            {isSuperAdmin ? <ShieldCheck className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{currentUser.fullName}</h1>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg ${
                  isSuperAdmin
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {isSuperAdmin ? 'Boshqaruvchi Super Admin' : 'Universitet Administratori'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Universitet Iqtidorli Talabalar Platformasi Boshqaruv Markazi
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCertIssueModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            <Award className="w-4 h-4" />
            <span>Sertifikat berish</span>
          </button>
          <button
            onClick={() => setIsEventModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors border border-slate-200"
          >
            <Calendar className="w-4 h-4 text-blue-900" />
            <span>Yangi tadbir</span>
          </button>
          <button
            onClick={() => setIsAnnModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors border border-slate-200"
          >
            <Bell className="w-4 h-4 text-blue-900" />
            <span>E'lon berish</span>
          </button>
        </div>
      </div>

      {/* Mobile Quick Action & Drawer Trigger (lg:hidden) */}
      <div className="lg:hidden space-y-3">
        {/* Mobile current section bar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CurrentIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Hozirgi bo‘lim:
              </span>
              <span className="text-sm font-bold text-slate-900 truncate block">
                {currentTabInfo.label} {currentTabInfo.count !== null && `(${currentTabInfo.count})`}
              </span>
            </div>
          </div>

          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="min-h-[44px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all border border-slate-200 shrink-0"
            aria-label="Bo'limlar menyusi"
          >
            {mobileSidebarOpen ? <X className="w-4 h-4 text-slate-700" /> : <Menu className="w-4 h-4 text-slate-700" />}
            <span>{mobileSidebarOpen ? 'Yopish' : 'Bo‘limlar'}</span>
          </button>
        </div>

        {/* Mobile slide-in / dropdown drawer */}
        {mobileSidebarOpen && (
          <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-lg space-y-1 animate-in fade-in duration-200">
            <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
              Barcha bo‘limlar
            </div>
            {adminNavItems.map(item => {
              const TabIcon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-900 text-white shadow-xs font-bold'
                      : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TabIcon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== null && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile Horizontal scrollable pill bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
          {adminNavItems.map(item => {
            const TabIcon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[44px] flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.count !== null && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* DESKTOP SIDEBAR + CONTENT LAYOUT */}
      <div className="lg:flex lg:gap-6 lg:items-start">
        {/* DESKTOP SIDEBAR (hidden lg:block) */}
        <aside className="hidden lg:block lg:w-64 shrink-0 bg-white rounded-3xl border border-slate-200 p-3.5 shadow-xs sticky top-20">
          <div className="px-3 py-2.5 mb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bo‘limlar</span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-900 rounded-md">
              {isSuperAdmin ? 'Super Admin' : 'Admin'}
            </span>
          </div>

          <nav className="space-y-1">
            {adminNavItems.map(item => {
              const TabIcon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full min-h-[42px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-900 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <TabIcon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== null && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <div className="flex-1 min-w-0 space-y-6">

      {/* TAB 1: REAL STATS */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Talabalar</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{students.length}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">Ro'yxatdan o'tgan</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Ilmiy rahbarlar</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{supervisors.length}</p>
              <span className="text-[10px] text-slate-500">Kafedralardan</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Loyihalar</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{projects.filter(p => p.type === 'loyiha').length}</p>
              <span className="text-[10px] text-blue-600 font-semibold">Ilmiy ishlar</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Startaplar</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{projects.filter(p => p.type === 'startap').length}</p>
              <span className="text-[10px] text-indigo-600 font-semibold">Tijoriy g‘oyalar</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Yutuqlar</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{achievements.length}</p>
              <span className="text-[10px] text-amber-600 font-semibold">Olimpiada va tanlov</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Sertifikatlar</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{certificates.length}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">QR-kodli berilgan</span>
            </div>
          </div>

          {/* Breakdown panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status overview */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-4">Ariza va loyihalar holati</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                  <span className="text-xs font-semibold text-amber-900">Kutilayotgan loyihalar (Ko'rib chiqish kerak)</span>
                  <strong className="text-sm font-bold text-amber-900">
                    {projects.filter(p => p.status === 'Kutilmoqda').length} ta
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-xs font-semibold text-emerald-900">Tasdiqlangan ilmiy loyihalar</span>
                  <strong className="text-sm font-bold text-emerald-900">
                    {projects.filter(p => p.status === 'Tasdiqlangan').length} ta
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                  <span className="text-xs font-semibold text-amber-900">Kutilayotgan yutuqlar</span>
                  <strong className="text-sm font-bold text-amber-900">
                    {achievements.filter(a => a.status === 'Kutilmoqda').length} ta
                  </strong>
                </div>
              </div>
            </div>

            {/* Course distribution */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-4">Kurslar bo‘yicha taqsimot</h3>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(courseNum => {
                  const count = students.filter(s => s.course === courseNum).length;
                  const label = courseNum === 5 ? 'Magistratura' : `${courseNum}-kurs`;
                  const percentage = students.length > 0 ? (count / students.length) * 100 : 0;
                  return (
                    <div key={courseNum} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{label}</span>
                        <span>{count} nafar ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-900 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Iqtidorli talabalar bazasi</h2>
              <p className="text-xs text-slate-500">Barcha ro'yxatdan o'tgan talabalarni boshqarish, ilmiy rahbar biriktirish va holatini o'zgartirish.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="F.I.Sh, guruh, telefon..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 w-48 sm:w-64"
                />
              </div>

              <select
                value={studentCourseFilter}
                onChange={e => setStudentCourseFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="all">Barcha kurslar</option>
                <option value="1">1-kurs</option>
                <option value="2">2-kurs</option>
                <option value="3">3-kurs</option>
                <option value="4">4-kurs</option>
                <option value="5">Magistratura</option>
              </select>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <EmptyState title="Talaba topilmadi" description="Qidiruv bo'yicha hech qanday talaba ma'lumoti topilmadi." />
          ) : (
            <>
              {/* MOBILE CARD LIST (md:hidden) */}
              <div className="md:hidden space-y-3">
                {filteredStudents.map(st => {
                  const sup = supervisors.find(s => s.id === st.supervisorId);
                  return (
                    <div key={st.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-blue-900 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0 overflow-hidden">
                            {st.avatarUrl || st.photoURL ? (
                              <img src={st.avatarUrl || st.photoURL} alt={st.fullName} className="w-full h-full object-cover" />
                            ) : (
                              (st.fullName || 'T').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 break-words">{st.fullName}</h3>
                            <p className="text-xs font-mono text-slate-500 mt-0.5">{st.phone}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-900 rounded-lg shrink-0">
                          {st.course}-kurs
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-600">
                        <div>Yo‘nalish: <strong>{st.facultyOrField}</strong></div>
                        <div>Guruh: <strong className="font-mono">{st.group}</strong></div>
                        {st.customSupervisorName && !st.supervisorId && (
                          <div className="text-amber-800 font-medium">
                            Kiritilgan rahbar: {st.customSupervisorName}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Ilmiy rahbar biriktirish:
                        </label>
                        <select
                          value={st.supervisorId || ''}
                          onChange={async e => {
                            const newSupId = e.target.value;
                            try {
                              await assignSupervisorToStudent(
                                st.id,
                                newSupId,
                                currentUser.id,
                                currentUser.fullName
                              );
                              onNotify('success', `${st.fullName} uchun ilmiy rahbar yangilandi.`);
                            } catch (err: any) {
                              onNotify('error', err.message || 'Xatolik yuz berdi.');
                            }
                          }}
                          className="w-full min-h-[44px] px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                        >
                          <option value="">Biriktirilmagan</option>
                          {supervisors.map(s => (
                            <option key={s.id} value={s.id}>{s.fullName}</option>
                          ))}
                        </select>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            id={`view-student-profile-mobile-${st.id}`}
                            onClick={() => onOpenStudentProfile?.(st.id)}
                            className="min-h-[40px] px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <User className="w-4 h-4" />
                            <span>Profil</span>
                          </button>

                          <button
                            type="button"
                            id={`edit-student-mobile-${st.id}`}
                            onClick={() => {
                              setEditingStudent(st);
                              setIsEditStudentModalOpen(true);
                            }}
                            className="min-h-[40px] px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Tahrirlash</span>
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            onConfirmModal({
                              title: "Talaba anketasini o'chirish",
                              message: `${st.fullName} anketasini o'chirishni tasdiqlaysizmi?`,
                              confirmText: "Ha, o'chirish",
                              isDestructive: true,
                              onConfirm: async () => {
                                await deleteStudentProfile(st.id, currentUser.id, currentUser.fullName);
                                onNotify('success', "Talaba anketasi o'chirildi.");
                              },
                            });
                          }}
                          className="min-h-[40px] px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="O‘chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW (hidden md:block) */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Talaba F.I.Sh.</th>
                        <th className="px-4 py-3">Telefon</th>
                        <th className="px-4 py-3">Yo‘nalish & Guruh</th>
                        <th className="px-4 py-3">Kurs</th>
                        <th className="px-4 py-3">Ilmiy rahbar</th>
                        <th className="px-4 py-3">Amallar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map(st => {
                        const sup = supervisors.find(s => s.id === st.supervisorId);
                        return (
                          <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3.5 font-bold text-slate-900">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-900 text-white font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden shadow-xs">
                                  {st.avatarUrl || st.photoURL ? (
                                    <img src={st.avatarUrl || st.photoURL} alt={st.fullName} className="w-full h-full object-cover" />
                                  ) : (
                                    (st.fullName || 'T').charAt(0).toUpperCase()
                                  )}
                                </div>
                                <span className="truncate max-w-[200px]">{st.fullName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-600">{st.phone}</td>
                            <td className="px-4 py-3.5 text-slate-700">
                              <div>{st.facultyOrField}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{st.group}</div>
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-slate-800">{st.course}-kurs</td>
                            <td className="px-4 py-3.5">
                              <select
                                value={st.supervisorId || ''}
                                onChange={async e => {
                                  const newSupId = e.target.value;
                                  try {
                                    await assignSupervisorToStudent(
                                      st.id,
                                      newSupId,
                                      currentUser.id,
                                      currentUser.fullName
                                    );
                                    onNotify('success', `${st.fullName} uchun ilmiy rahbar yangilandi.`);
                                  } catch (err: any) {
                                    onNotify('error', err.message || 'Xatolik yuz berdi.');
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 max-w-[170px] truncate"
                              >
                                <option value="">Biriktirilmagan</option>
                                {supervisors.map(s => (
                                  <option key={s.id} value={s.id}>{s.fullName}</option>
                                ))}
                              </select>
                              {st.customSupervisorName && !st.supervisorId && (
                                <span className="block text-[10px] text-amber-700 mt-0.5">
                                  Kiritilgan: {st.customSupervisorName}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  id={`view-student-profile-desktop-${st.id}`}
                                  onClick={() => onOpenStudentProfile?.(st.id)}
                                  className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Talaba to‘liq profilini ko‘rish"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  id={`edit-student-desktop-${st.id}`}
                                  onClick={() => {
                                    setEditingStudent(st);
                                    setIsEditStudentModalOpen(true);
                                  }}
                                  className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title="Talaba profilini tahrirlash"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    onConfirmModal({
                                      title: "Talaba anketasini o'chirish",
                                      message: `${st.fullName} anketasini o'chirishni tasdiqlaysizmi?`,
                                      confirmText: "Ha, o'chirish",
                                      isDestructive: true,
                                      onConfirm: async () => {
                                        await deleteStudentProfile(st.id, currentUser.id, currentUser.fullName);
                                        onNotify('success', "Talaba anketasi o'chirildi.");
                                      },
                                    });
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="O‘chirish"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: SUPERVISORS */}
      {activeTab === 'supervisors' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ilmiy rahbarlar ro‘yxati</h2>
              <p className="text-xs text-slate-500">Kafedralar bo'yicha ilmiy rahbarlar, ularning unvonlari va biriktirilgan talabalar soni.</p>
            </div>
            <button
              onClick={() => setIsSupervisorModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi ilmiy rahbar qo‘shish</span>
            </button>
          </div>

          {supervisors.length === 0 ? (
            <EmptyState
              title="Ilmiy rahbarlar yo‘q"
              description="Hozircha birorta ham ilmiy rahbar qo‘shilmagan."
              action={{
                label: "Ilmiy rahbar qo'shish",
                onClick: () => setIsSupervisorModalOpen(true),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {supervisors.map(sup => {
                const assignedCount = students.filter(s => s.supervisorId === sup.id).length;
                return (
                  <div key={sup.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-purple-900 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0 overflow-hidden">
                            {sup.avatarUrl || sup.photoURL ? (
                              <img src={sup.avatarUrl || sup.photoURL} alt={sup.fullName} className="w-full h-full object-cover" />
                            ) : (
                              (sup.fullName || 'R').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{sup.fullName}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{sup.position} • {sup.academicDegree}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-xs font-bold bg-purple-50 text-purple-900 rounded-lg border border-purple-200 shrink-0">
                          {assignedCount} ta talaba
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl mt-3">
                        <div>Kafedra: <strong>{sup.department}</strong></div>
                        <div>Telefon: <strong className="font-mono">{sup.phone}</strong></div>
                        {sup.email && <div>Email: {sup.email}</div>}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        id={`edit-supervisor-btn-${sup.id}`}
                        onClick={() => {
                          setEditingSupervisor(sup);
                          setIsEditSupervisorModalOpen(true);
                        }}
                        className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Tahrirlash</span>
                      </button>

                      <button
                        onClick={() => {
                          onConfirmModal({
                            title: "Ilmiy rahbarni o'chirish",
                            message: `${sup.fullName} ni o'chirishni tasdiqlaysizmi?`,
                            confirmText: "Ha, o'chirish",
                            isDestructive: true,
                            onConfirm: async () => {
                              await deleteSupervisorProfile(sup.id, currentUser.id, currentUser.fullName);
                              onNotify('success', "Ilmiy rahbar o'chirildi.");
                            },
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="O‘chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PROJECTS & STARTUPS */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Loyihalar va Startaplar moderatsiyasi</h2>
              <p className="text-xs text-slate-500">Talabalar tomonidan topshirilgan ilmiy ishlar va biznes g'oyalarni ekspertiza qilish.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={projectStatusFilter}
                onChange={e => setProjectStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="all">Barcha statuslar</option>
                <option value="Kutilmoqda">Kutilmoqda</option>
                <option value="Tasdiqlangan">Tasdiqlangan</option>
                <option value="Rad etilgan">Rad etilgan</option>
              </select>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <EmptyState title="Loyihalar mavjud emas" description="Tanlangan holat bo'yicha loyihalar topilmadi." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map(proj => (
                <div key={proj.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 rounded-md mb-1 inline-block">
                          {proj.type === 'loyiha' ? 'Ilmiy loyiha' : 'Startap tashabbusi'}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">{proj.title}</h3>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg ${
                          proj.status === 'Tasdiqlangan'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : proj.status === 'Rad etilgan'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {proj.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-3 line-clamp-3">{proj.description}</p>

                    <div className="space-y-1 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl mb-4">
                      <div>Talaba: <strong className="text-slate-900">{proj.studentName}</strong> ({proj.studentPhone})</div>
                      <div>Mualliflar: {proj.authorNames}</div>
                      <div>Yo‘nalish: {proj.field}</div>
                      {proj.reviewNotes && (
                        <div className="text-amber-800 font-medium mt-1">
                          Izoh: {proj.reviewNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    {proj.fileUrl ? (
                      <button
                        onClick={() => onOpenPdf(proj.fileDataUrl || proj.fileUrl!, proj.fileName, proj.fileSize, proj.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span>PDF Hujjatni ko‘rish</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">PDF yo‘q</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setReviewModalData({
                            type: 'project',
                            id: proj.id,
                            title: proj.title,
                            status: 'Tasdiqlangan',
                          });
                          setReviewNotes(proj.reviewNotes || '');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Tasdiqlash</span>
                      </button>
                      <button
                        onClick={() => {
                          setReviewModalData({
                            type: 'project',
                            id: proj.id,
                            title: proj.title,
                            status: 'Rad etilgan',
                          });
                          setReviewNotes(proj.reviewNotes || '');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rad etish</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ACHIEVEMENTS */}
      {activeTab === 'achievements' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Yutuqlar va Diplomlarni tekshirish</h2>
            <p className="text-xs text-slate-500">Talabalar qo'shgan olimpiada va tanlov natijalarini hujjat asosida tasdiqlash.</p>
          </div>

          {achievements.length === 0 ? (
            <EmptyState title="Yutuqlar mavjud emas" description="Talabalar tomonidan yutuqlar topshirilmagan." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map(ach => (
                <div key={ach.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                        {ach.category}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">{ach.status}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-1">{ach.title}</h3>
                    <p className="text-xs text-slate-600 mb-3 line-clamp-2">{ach.description}</p>

                    <div className="text-xs text-slate-500 space-y-0.5">
                      <div>Talaba: <strong className="text-slate-900">{ach.studentName}</strong></div>
                      <div>Sana: {ach.date}</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-4 flex flex-wrap items-center justify-between gap-2">
                    {ach.fileUrl && (
                      <button
                        onClick={() => onOpenPdf(ach.fileDataUrl || ach.fileUrl!, ach.fileName, ach.fileSize, ach.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span>PDF</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setReviewModalData({
                            type: 'achievement',
                            id: ach.id,
                            title: ach.title,
                            status: 'Tasdiqlangan',
                          });
                        }}
                        className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                        title="Tasdiqlash"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setReviewModalData({
                            type: 'achievement',
                            id: ach.id,
                            title: ach.title,
                            status: 'Rad etilgan',
                          });
                        }}
                        className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg"
                        title="Rad etish"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CERTIFICATES */}
      {activeTab === 'certificates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sertifikatlar boshqaruvi</h2>
              <p className="text-xs text-slate-500">Berilgan rasmiy sertifikatlar ro‘yxati va ularning QR-kodli tekshiruvi.</p>
            </div>
            <button
              onClick={() => setIsCertIssueModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi sertifikat rasmiylashtirish</span>
            </button>
          </div>

          {certificates.length === 0 ? (
            <EmptyState
              title="Sertifikatlar mavjud emas"
              description="Hozircha birorta sertifikat berilmagan."
              action={{
                label: "Sertifikat berish",
                onClick: () => setIsCertIssueModalOpen(true),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map(cert => (
                <div key={cert.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-900 rounded-md">
                        {cert.isOfficialGenerated ? 'Rasmiy sertifikat' : 'Yuklangan'}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">{cert.status}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-1">{cert.title}</h3>
                    <p className="text-xs text-slate-600 mb-2">Talaba: <strong className="text-slate-900">{cert.studentName}</strong></p>

                    <div className="space-y-0.5 text-xs text-slate-500">
                      <div>Tadbir: {cert.eventTitle}</div>
                      <div>Sana: {cert.issueDate}</div>
                      <div>ID: <code className="font-mono font-bold text-blue-900">{cert.certificateNumber}</code></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between">
                    {cert.isOfficialGenerated ? (
                      <button
                        onClick={() =>
                          downloadCertificatePdf({
                            certificateNumber: cert.certificateNumber,
                            studentName: cert.studentName,
                            title: cert.title,
                            eventTitle: cert.eventTitle,
                            organizationName: cert.organizationName,
                            issueDate: cert.issueDate,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF & QR yuklab olish</span>
                      </button>
                    ) : cert.fileUrl ? (
                      <button
                        onClick={() => onOpenPdf(cert.fileDataUrl || cert.fileUrl!, cert.fileName, undefined, cert.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span>PDF Ko‘rish</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Universitet tadbirlari boshqaruvi</h2>
              <p className="text-xs text-slate-500">Olimpiada, forum va seminarlarni rejalashtirish hamda ishtirokchilar ro'yxati.</p>
            </div>
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi tadbir e'lon qilish</span>
            </button>
          </div>

          {events.length === 0 ? (
            <EmptyState
              title="Tadbirlar mavjud emas"
              description="Hozirda rejalashtirilgan tadbirlar yo'q."
              action={{
                label: "Tadbir yaratish",
                onClick: () => setIsEventModalOpen(true),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map(ev => (
                <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold text-slate-900">{ev.title}</h3>
                      <button
                        type="button"
                        id={`event-participants-btn-${ev.id}`}
                        onClick={() => onOpenEventParticipants?.(ev)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                        title="Ushbu tadbir ishtirokchilari ro‘yxatini ko‘rish"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-700 group-hover:scale-110 transition-transform" />
                        <span>{ev.participantIds?.length || 0} ishtirokchi</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 mb-3 line-clamp-3">{ev.description}</p>

                    <div className="space-y-1 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
                      <div>Sana va vaqt: <strong>{ev.date} ({ev.time})</strong></div>
                      <div>O‘tkazilish joyi: <strong>{ev.location}</strong></div>
                      {ev.deadline && <div>Ro‘yxat muddati: {ev.deadline}</div>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-end">
                    <button
                      onClick={() => {
                        onConfirmModal({
                          title: "Tadbirni o'chirish",
                          message: `«${ev.title}» tadbirini o'chirishni tasdiqlaysizmi?`,
                          confirmText: "Ha, o'chirish",
                          isDestructive: true,
                          onConfirm: async () => {
                            await deleteEventDoc(ev.id, currentUser.id, currentUser.fullName);
                            onNotify('success', "Tadbir o'chirildi.");
                          },
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">E'lonlar markazi</h2>
              <p className="text-xs text-slate-500">Talabalar va ilmiy rahbarlar uchun tezkor xabarnomalar berish.</p>
            </div>
            <button
              onClick={() => setIsAnnModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi e'lon berish</span>
            </button>
          </div>

          {announcements.length === 0 ? (
            <EmptyState
              title="E'lonlar yo‘q"
              description="Hozircha birorta ham e'lon chiqarilmagan."
              action={{
                label: "E'lon berish",
                onClick: () => setIsAnnModalOpen(true),
              }}
            />
          ) : (
            <div className="space-y-3">
              {announcements.map(ann => (
                <div key={ann.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-900 rounded-md">
                          {ann.audience}
                        </span>
                        <span className="text-xs text-slate-400">{ann.date}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{ann.title}</h3>
                    </div>

                    <button
                      onClick={() => {
                        onConfirmModal({
                          title: "E'lonni o'chirish",
                          message: `«${ann.title}» e'lonini o'chirishni tasdiqlaysizmi?`,
                          confirmText: "Ha, o'chirish",
                          isDestructive: true,
                          onConfirm: async () => {
                            await deleteAnnouncementDoc(ann.id, currentUser.id, currentUser.fullName);
                            onNotify('success', "E'lon o'chirildi.");
                          },
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">{ann.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 9: SUPER ADMIN - ADMINS & ROLES */}
      {isSuperAdmin && activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Administratorlar va Xavfsizlik huquqlari</h2>
              <p className="text-xs text-slate-500">Platforma ma'murlari ro'yxati, yangi admin qo'shish va bloklash.</p>
            </div>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi Admin qo‘shish</span>
            </button>
          </div>

          {/* MOBILE CARD LIST (md:hidden) */}
          <div className="md:hidden space-y-3">
            {allUsers
              .filter(u => u.role === 'admin' || u.role === 'superAdmin')
              .map(admin => (
                <div key={admin.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{admin.fullName}</h3>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">{admin.phone}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                        admin.role === 'superAdmin'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {admin.role === 'superAdmin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        admin.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {admin.isActive ? 'Faol' : 'Bloklangan'}
                    </span>

                    {admin.id !== currentUser.id && (
                      <button
                        onClick={async () => {
                          try {
                            await toggleUserBlockStatus(
                              admin.id,
                              !admin.isActive,
                              currentUser.id,
                              currentUser.fullName
                            );
                            onNotify(
                              'success',
                              `Admin ${admin.isActive ? 'bloklandi' : 'faollashtirildi'}.`
                            );
                          } catch (err: any) {
                            onNotify('error', err.message || 'Xatolik yuz berdi.');
                          }
                        }}
                        className={`min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
                          admin.isActive
                            ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {admin.isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{admin.isActive ? 'Bloklash' : 'Faollashtirish'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* DESKTOP TABLE (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Administrator F.I.Sh.</th>
                    <th className="px-4 py-3">Telefon (Login)</th>
                    <th className="px-4 py-3">Roli</th>
                    <th className="px-4 py-3">Holati</th>
                    <th className="px-4 py-3">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allUsers
                    .filter(u => u.role === 'admin' || u.role === 'superAdmin')
                    .map(admin => (
                      <tr key={admin.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900">{admin.fullName}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-600">{admin.phone}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                              admin.role === 'superAdmin'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {admin.role === 'superAdmin' ? 'Super Admin' : 'Admin'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              admin.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {admin.isActive ? 'Faol' : 'Bloklangan'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {admin.id !== currentUser.id && (
                            <button
                              onClick={async () => {
                                try {
                                  await toggleUserBlockStatus(
                                    admin.id,
                                    !admin.isActive,
                                    currentUser.id,
                                    currentUser.fullName
                                  );
                                  onNotify(
                                    'success',
                                    `Admin ${admin.isActive ? 'bloklandi' : 'faollashtirildi'}.`
                                  );
                                } catch (err: any) {
                                  onNotify('error', err.message || 'Xatolik yuz berdi.');
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                                admin.isActive
                                  ? 'text-rose-700 hover:bg-rose-50'
                                  : 'text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {admin.isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              <span>{admin.isActive ? 'Bloklash' : 'Faollashtirish'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tizim Audit Tarixi (Audit Log)</h2>
            <p className="text-xs text-slate-500">Kim qachon qanday amal bajarganini real vaqtda kuzatish.</p>
          </div>

          {auditLogs.length === 0 ? (
            <EmptyState title="Audit jurnali bo'sh" description="Hozircha tizim amallari qayd etilmagan." />
          ) : (
            <>
              {/* MOBILE AUDIT LIST (md:hidden) */}
              <div className="md:hidden space-y-3">
                {auditLogs.slice(0, 50).map(log => (
                  <div key={log.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900">{log.userName}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-700 rounded-md">
                        {log.action}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 break-words">{log.details}</p>
                    <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-100">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP AUDIT TABLE (hidden md:block) */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Vaqt</th>
                        <th className="px-4 py-3">Foydalanuvchi</th>
                        <th className="px-4 py-3">Amal turi</th>
                        <th className="px-4 py-3">Tafsilotlar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.slice(0, 50).map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                            {log.userName}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-700 rounded-md">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

        </div>
      </div>

      {/* ================= ADMIN MODALS ================= */}

      {/* MODAL 1: ADD SUPERVISOR */}
      {isSupervisorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Yangi ilmiy rahbar qo‘shish</h3>
            <p className="text-xs text-slate-500 mb-5">
              Ilmiy rahbar ma'lumotlari kiritiladi va unga tizimga kirish uchun hisob ochiladi.
            </p>

            <form onSubmit={handleCreateSupervisor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  F.I.Sh. (Familiya, Ism, Sharif) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Qodirov Jamshid Toxirovich"
                  value={supFullName}
                  onChange={e => setSupFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Telefon (Login) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+998 (90) 123-45-67"
                    value={supPhone}
                    onChange={e => setSupPhone(formatUzbekPhone(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Dastlabki parol *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="123456"
                    value={supPassword}
                    onChange={e => setSupPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Lavozimi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Dotsent, Professor, Katta o‘qituvchi"
                    value={supPosition}
                    onChange={e => setSupPosition(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ilmiy darajasi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="PhD, DSc, Magistr"
                    value={supDegree}
                    onChange={e => setSupDegree(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kafedra nomi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Dasturiy ta'minot kafedrasi"
                  value={supDept}
                  onChange={e => setSupDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Elektron pochta (Ixtiyoriy)
                </label>
                <input
                  type="email"
                  placeholder="supervisor@univ.edu.uz"
                  value={supEmail}
                  onChange={e => setSupEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSupervisorModalOpen(false)}
                  disabled={isSupSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSupSubmitting}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
                >
                  {isSupSubmitting ? 'Saqlanmoqda...' : 'Saqlash va hisob ochish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ISSUE OFFICIAL CERTIFICATE */}
      {isCertIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Rasmiy sertifikat rasmiylashtirish</h3>
            <p className="text-xs text-slate-500 mb-5">
              Sertifikat avtomatik unikal ID (CERT-2026-XXXX) va verifikatsiya QR-kodi bilan generatsiya qilinadi.
            </p>

            <form onSubmit={handleIssueCertificate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Talabani tanlang *
                </label>
                <select
                  required
                  value={certStudentId}
                  onChange={e => setCertStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="">-- Talabani tanlang --</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.fullName} ({st.group}, {st.course}-kurs)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tadbir yoki tanlov nomi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Yosh olimlar innovatsion forumi 2026"
                  value={certEventTitle}
                  onChange={e => setCertEventTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sertifikat unvoni / darajasi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Faol ishtiroki va 1-darajali diplomi uchun"
                  value={certTitle}
                  onChange={e => setCertTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Beruvchi tashkilot
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Universitet Ilmiy Kengashi"
                    value={certOrg}
                    onChange={e => setCertOrg(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Berilgan sana
                  </label>
                  <input
                    type="date"
                    required
                    value={certDate}
                    onChange={e => setCertDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCertIssueModalOpen(false)}
                  disabled={isCertIssuing}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isCertIssuing}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-2"
                >
                  {isCertIssuing ? (
                    <span>Generatsiya qilinmoqda...</span>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>Sertifikatni yaratish va PDF yuklash</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE EVENT */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Yangi tadbir e'lon qilish</h3>
            <p className="text-xs text-slate-500 mb-5">
              Iqtidorli talabalar uchun olimpiada, tanlov yoki seminar rejalashtirish.
            </p>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tadbir nomi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Universitet Yosh Dasturchilar Hakatoni"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tadbir tavsifi va qoidalari *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ishtirok etish shartlari va talablar"
                  value={eventDesc}
                  onChange={e => setEventDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    O'tkazilish sanasi *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Boshlanish vaqti
                  </label>
                  <input
                    type="text"
                    placeholder="10:00"
                    value={eventTime}
                    onChange={e => setEventTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    O'tkazilish joyi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Bosh bino, 204-auditoriya"
                    value={eventLocation}
                    onChange={e => setEventLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ro'yxatdan o'tish muddati (Deadline)
                  </label>
                  <input
                    type="date"
                    value={eventDeadline}
                    onChange={e => setEventDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  disabled={isEventSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isEventSubmitting}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
                >
                  {isEventSubmitting ? 'E’lon qilinmoqda...' : 'Tadbirni e’lon qilish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE ANNOUNCEMENT */}
      {isAnnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Yangi rasmiy e'lon berish</h3>
            <p className="text-xs text-slate-500 mb-5">
              Auditoriyani tanlang va xabarnoma matnini kiriting.
            </p>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Auditoriya
                </label>
                <select
                  value={annAudience}
                  onChange={e => setAnnAudience(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="Barchaga">Barchaga (Talabalar va Rahbarlar)</option>
                  <option value="Talabalar">Faqat Talabalarga</option>
                  <option value="Ilmiy rahbarlar">Faqat Ilmiy rahbarlarga</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sarlavha *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Respublika startap tanloviga arizalar qabuli boshlandi"
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  E'lon matni *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Xabarnoma batafsil mazmuni..."
                  value={annContent}
                  onChange={e => setAnnContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAnnModalOpen(false)}
                  disabled={isAnnSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isAnnSubmitting}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAnnSubmitting ? 'Chiqarilmoqda...' : 'E’lonni chiqarish'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: SUPER ADMIN - CREATE ADMIN */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Yangi Admin qo‘shish</h3>
            <p className="text-xs text-slate-500 mb-5">
              Super Admin orqali tizim ma'muri hisobini ro'yxatdan o'tkazish.
            </p>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  F.I.Sh. *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Rahimov Otabek"
                  value={adminFullName}
                  onChange={e => setAdminFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Telefon raqami (Login) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+998 (90) 123-45-67"
                  value={adminPhone}
                  onChange={e => setAdminPhone(formatUzbekPhone(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin roli
                </label>
                <select
                  value={adminRole}
                  onChange={e => setAdminRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="admin">Admin (Standart boshqaruv)</option>
                  <option value="superAdmin">Super Admin (To'liq huquqli)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Parol (Kamida 6 belgi) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  disabled={isAdminSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isAdminSubmitting}
                  className="px-5 py-2 bg-indigo-900 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
                >
                  {isAdminSubmitting ? 'Qo‘shilmoqda...' : 'Adminni faollashtirish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: REVIEW STATUS & NOTES */}
      {reviewModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {reviewModalData.status === 'Tasdiqlangan' ? 'Tasdiqlash xulosasi' : 'Rad etish xulosasi'}
            </h3>
            <p className="text-xs text-slate-500 mb-4 truncate">
              {reviewModalData.title}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ekspert / Admin izohi (Talabaga ko‘rinadi)
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    reviewModalData.status === 'Tasdiqlangan'
                      ? 'Loyiha talablarga to‘liq mos deb topildi.'
                      : 'Hujjatda kamchiliklar mavjud, qayta ko‘rib chiqilsin.'
                  }
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModalData(null)}
                  disabled={isReviewSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={isReviewSubmitting}
                  className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors ${
                    reviewModalData.status === 'Tasdiqlangan'
                      ? 'bg-emerald-700 hover:bg-emerald-600'
                      : 'bg-rose-700 hover:bg-rose-600'
                  }`}
                >
                  {isReviewSubmitting ? 'Saqlanmoqda...' : 'Xulosani tasdiqlash'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Student Modal */}
      {isEditStudentModalOpen && (
        <EditStudentModal
          isOpen={isEditStudentModalOpen}
          student={editingStudent}
          supervisors={supervisors}
          actor={currentUser}
          onClose={() => {
            setIsEditStudentModalOpen(false);
            setEditingStudent(null);
          }}
          onSaveSuccess={() => {
            // Live Firestore subscription will update state automatically
          }}
          onNotify={onNotify}
        />
      )}

      {/* Edit Supervisor Modal */}
      {isEditSupervisorModalOpen && (
        <EditSupervisorModal
          isOpen={isEditSupervisorModalOpen}
          supervisor={editingSupervisor}
          actor={currentUser}
          onClose={() => {
            setIsEditSupervisorModalOpen(false);
            setEditingSupervisor(null);
          }}
          onSaveSuccess={() => {
            // Live Firestore subscription will update state automatically
          }}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};
