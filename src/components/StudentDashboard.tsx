import React, { useState } from 'react';
import {
  User,
  FolderGit2,
  Rocket,
  Trophy,
  Award,
  Calendar,
  Bell,
  Settings,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Eye,
  Check,
  Building,
  GraduationCap,
  Users,
  Loader2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { EmptyState } from './EmptyState';
import {
  uploadPdfDocument,
  validatePdfFile,
  cleanupStorageFile,
  UploadStep,
  UploadResult,
} from '../lib/storage';
import {
  createProjectOrStartup,
  createAchievement,
  createCertificateDoc,
  registerStudentForEvent,
  unregisterStudentFromEvent,
  updateStudentProfile,
  updateStudentSelfProfilePhoto,
} from '../services/firestoreService';
import { ProfilePhotoUploader } from './ProfilePhotoUploader';
import { downloadCertificatePdf } from '../lib/certificateGenerator';
import type {
  UserAccount,
  StudentProfile,
  SupervisorProfile,
  ProjectOrStartup,
  Achievement,
  CertificateItem,
  EventItem,
  Announcement,
} from '../types';

interface Props {
  currentUser: UserAccount;
  studentProfile: StudentProfile | null;
  supervisors: SupervisorProfile[];
  projects: ProjectOrStartup[];
  achievements: Achievement[];
  certificates: CertificateItem[];
  events: EventItem[];
  announcements: Announcement[];
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
  onOpenPdf: (url: string, name?: string, size?: number, title?: string) => void;
}

type TabType =
  | 'overview'
  | 'profile'
  | 'projects'
  | 'startups'
  | 'achievements'
  | 'certificates'
  | 'events'
  | 'announcements'
  | 'settings';

export const StudentDashboard: React.FC<Props> = ({
  currentUser,
  studentProfile,
  supervisors = [],
  projects = [],
  achievements = [],
  certificates = [],
  events = [],
  announcements = [],
  onNotify,
  onOpenPdf,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Filtered data for this specific student
  const studentId = studentProfile?.id || '';
  const myProjects = projects.filter(p => p.studentId === studentId && p.type === 'loyiha');
  const myStartups = projects.filter(p => p.studentId === studentId && p.type === 'startap');
  const myAchievements = achievements.filter(a => a.studentId === studentId);
  const myCertificates = certificates.filter(c => c.studentId === studentId);

  // Assigned supervisor details
  const mySupervisor = supervisors.find(s => s.id === studentProfile?.supervisorId);

  // New Project / Startup modal state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalType, setProjectModalType] = useState<'loyiha' | 'startap'>('loyiha');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectField, setProjectField] = useState(studentProfile?.facultyOrField || '');
  const [projectAuthors, setProjectAuthors] = useState(currentUser.fullName);
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [isProjectSubmitting, setIsProjectSubmitting] = useState(false);
  const [projectUploadStep, setProjectUploadStep] = useState<UploadStep>('idle');
  const [projectUploadPercent, setProjectUploadPercent] = useState<number>(0);
  const [projectUploadMessage, setProjectUploadMessage] = useState<string>('');
  const [projectUploadError, setProjectUploadError] = useState<string | null>(null);

  // New Achievement modal state
  const [isAchModalOpen, setIsAchModalOpen] = useState(false);
  const [achTitle, setAchTitle] = useState('');
  const [achCategory, setAchCategory] = useState<Achievement['category']>('Olimpiada');
  const [achDate, setAchDate] = useState(new Date().toISOString().split('T')[0]);
  const [achDesc, setAchDesc] = useState('');
  const [achFile, setAchFile] = useState<File | null>(null);
  const [isAchSubmitting, setIsAchSubmitting] = useState(false);
  const [achUploadStep, setAchUploadStep] = useState<UploadStep>('idle');
  const [achUploadPercent, setAchUploadPercent] = useState<number>(0);
  const [achUploadMessage, setAchUploadMessage] = useState<string>('');
  const [achUploadError, setAchUploadError] = useState<string | null>(null);

  // New Self-Certificate upload modal state
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certTitle, setCertTitle] = useState('');
  const [certEvent, setCertEvent] = useState('');
  const [certOrg, setCertOrg] = useState('');
  const [certDate, setCertDate] = useState(new Date().toISOString().split('T')[0]);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [isCertSubmitting, setIsCertSubmitting] = useState(false);
  const [certUploadStep, setCertUploadStep] = useState<UploadStep>('idle');
  const [certUploadPercent, setCertUploadPercent] = useState<number>(0);
  const [certUploadMessage, setCertUploadMessage] = useState<string>('');
  const [certUploadError, setCertUploadError] = useState<string | null>(null);

  // Read announcements tracking
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`read_announcements_${currentUser.id}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markAnnouncementRead = (annId: string) => {
    setReadAnnouncementIds(prev => {
      const next = new Set(prev);
      next.add(annId);
      localStorage.setItem(`read_announcements_${currentUser.id}`, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  // Status badge styling helper
  const renderStatusBadge = (status: 'Kutilmoqda' | 'Tasdiqlangan' | 'Rad etilgan') => {
    switch (status) {
      case 'Tasdiqlangan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tasdiqlangan</span>
          </span>
        );
      case 'Rad etilgan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rad etilgan</span>
          </span>
        );
      case 'Kutilmoqda':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            <span>Kutilmoqda</span>
          </span>
        );
    }
  };

  // Handler: Add Project / Startup
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFile) {
      onNotify('error', 'Iltimos, PDF hujjatni tanlang (Maksimal 10 MB).');
      return;
    }
    const val = validatePdfFile(projectFile);
    if (!val.valid) {
      onNotify('error', val.error || 'Fayl formati yaroqsiz.');
      return;
    }

    setIsProjectSubmitting(true);
    setProjectUploadStep('validating');
    setProjectUploadPercent(5);
    setProjectUploadMessage('PDF tekshirilmoqda...');
    setProjectUploadError(null);

    let uploadRes: UploadResult | null = null;
    try {
      uploadRes = await uploadPdfDocument(
        projectFile,
        studentId,
        projectModalType === 'loyiha' ? 'projects' : 'startups',
        info => {
          setProjectUploadStep(info.step);
          setProjectUploadPercent(info.percent);
          setProjectUploadMessage(info.message);
        }
      );

      setProjectUploadStep('saving');
      setProjectUploadPercent(100);
      setProjectUploadMessage('Ma’lumotlar Firestore’ga saqlanmoqda...');

      await createProjectOrStartup({
        type: projectModalType,
        title: projectTitle.trim(),
        description: projectDesc.trim(),
        field: projectField.trim() || studentProfile?.facultyOrField || '',
        studentId,
        studentName: currentUser.fullName,
        studentPhone: currentUser.phone,
        supervisorId: studentProfile?.supervisorId || '',
        authorNames: projectAuthors.trim(),
        fileUrl: uploadRes.fileUrl,
        fileName: uploadRes.fileName,
        fileSize: uploadRes.fileSize,
        fileType: uploadRes.fileType,
        storagePath: uploadRes.storagePath,
      });

      setProjectUploadStep('success');
      setProjectUploadMessage('✓ Muvaffaqiyatli saqlandi');
      onNotify(
        'success',
        `${projectModalType === 'loyiha' ? 'Loyiha' : 'Startap'} muvaffaqiyatli saqlandi va tekshiruvga yuborildi!`
      );

      setTimeout(() => {
        setIsProjectModalOpen(false);
        setProjectTitle('');
        setProjectDesc('');
        setProjectFile(null);
        setProjectUploadStep('idle');
        setProjectUploadPercent(0);
        setProjectUploadMessage('');
        setProjectUploadError(null);
        setIsProjectSubmitting(false);
      }, 1000);
    } catch (err: any) {
      console.error('Project submission error:', err);
      if (uploadRes) {
        try {
          await cleanupStorageFile(uploadRes.fileUrl, uploadRes.storagePath);
        } catch (cleanErr) {
          console.warn('Orphan cleanup error:', cleanErr);
        }
      }
      const errMsg = err?.message || 'PDF yuklashda xatolik yuz berdi. Qayta urinib ko‘ring.';
      setProjectUploadStep('error');
      setProjectUploadError(errMsg);
      onNotify('error', errMsg);
      setIsProjectSubmitting(false);
    }
  };

  // Handler: Add Achievement
  const handleCreateAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!achFile) {
      onNotify('error', 'Iltimos, tasdiqlovchi PDF hujjatni tanlang (Maksimal 10 MB).');
      return;
    }
    const val = validatePdfFile(achFile);
    if (!val.valid) {
      onNotify('error', val.error || 'Fayl yaroqsiz.');
      return;
    }

    setIsAchSubmitting(true);
    setAchUploadStep('validating');
    setAchUploadPercent(5);
    setAchUploadMessage('PDF tekshirilmoqda...');
    setAchUploadError(null);

    let uploadRes: UploadResult | null = null;
    try {
      uploadRes = await uploadPdfDocument(
        achFile,
        studentId,
        'achievements',
        info => {
          setAchUploadStep(info.step);
          setAchUploadPercent(info.percent);
          setAchUploadMessage(info.message);
        }
      );

      setAchUploadStep('saving');
      setAchUploadPercent(100);
      setAchUploadMessage('Ma’lumotlar Firestore’ga saqlanmoqda...');

      await createAchievement({
        studentId,
        studentName: currentUser.fullName,
        title: achTitle.trim(),
        category: achCategory,
        date: achDate,
        description: achDesc.trim(),
        fileUrl: uploadRes.fileUrl,
        fileName: uploadRes.fileName,
        fileSize: uploadRes.fileSize,
        fileType: uploadRes.fileType,
        storagePath: uploadRes.storagePath,
      });

      setAchUploadStep('success');
      setAchUploadMessage('✓ Muvaffaqiyatli saqlandi');
      onNotify('success', 'Yutuq muvaffaqiyatli qo‘shildi va tekshiruvga yuborildi!');

      setTimeout(() => {
        setIsAchModalOpen(false);
        setAchTitle('');
        setAchDesc('');
        setAchFile(null);
        setAchUploadStep('idle');
        setAchUploadPercent(0);
        setAchUploadMessage('');
        setAchUploadError(null);
        setIsAchSubmitting(false);
      }, 1000);
    } catch (err: any) {
      console.error('Achievement submission error:', err);
      if (uploadRes) {
        try {
          await cleanupStorageFile(uploadRes.fileUrl, uploadRes.storagePath);
        } catch (cleanErr) {
          console.warn('Orphan cleanup error:', cleanErr);
        }
      }
      const errMsg = err?.message || 'Yutuqni saqlashda xatolik yuz berdi. Qayta urinib ko‘ring.';
      setAchUploadStep('error');
      setAchUploadError(errMsg);
      onNotify('error', errMsg);
      setIsAchSubmitting(false);
    }
  };

  // Handler: Upload Self Certificate
  const handleUploadCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFile) {
      onNotify('error', 'Iltimos, sertifikat PDF faylini tanlang.');
      return;
    }
    const val = validatePdfFile(certFile);
    if (!val.valid) {
      onNotify('error', val.error || 'Fayl yaroqsiz.');
      return;
    }

    setIsCertSubmitting(true);
    setCertUploadStep('validating');
    setCertUploadPercent(5);
    setCertUploadMessage('PDF tekshirilmoqda...');
    setCertUploadError(null);

    let uploadRes: UploadResult | null = null;
    try {
      uploadRes = await uploadPdfDocument(
        certFile,
        studentId,
        'certificates',
        info => {
          setCertUploadStep(info.step);
          setCertUploadPercent(info.percent);
          setCertUploadMessage(info.message);
        }
      );

      setCertUploadStep('saving');
      setCertUploadPercent(100);
      setCertUploadMessage('Ma’lumotlar Firestore’ga saqlanmoqda...');

      const randomCertNum = `CERT-STUD-${Date.now().toString().slice(-6)}`;

      await createCertificateDoc({
        certificateNumber: randomCertNum,
        title: certTitle.trim(),
        eventTitle: certEvent.trim(),
        studentId,
        studentName: currentUser.fullName,
        organizationName: certOrg.trim() || 'Tashkilot / Tanlov',
        issueDate: certDate,
        status: 'Kutilmoqda',
        isOfficialGenerated: false,
        fileUrl: uploadRes.fileUrl,
        fileName: uploadRes.fileName,
        fileSize: uploadRes.fileSize,
        fileType: uploadRes.fileType,
        storagePath: uploadRes.storagePath,
      });

      setCertUploadStep('success');
      setCertUploadMessage('✓ Muvaffaqiyatli saqlandi');
      onNotify('success', 'Sertifikat muvaffaqiyatli yuklandi va tasdiqlashga yuborildi!');

      setTimeout(() => {
        setIsCertModalOpen(false);
        setCertTitle('');
        setCertEvent('');
        setCertOrg('');
        setCertFile(null);
        setCertUploadStep('idle');
        setCertUploadPercent(0);
        setCertUploadMessage('');
        setCertUploadError(null);
        setIsCertSubmitting(false);
      }, 1000);
    } catch (err: any) {
      console.error('Certificate submission error:', err);
      if (uploadRes) {
        try {
          await cleanupStorageFile(uploadRes.fileUrl, uploadRes.storagePath);
        } catch (cleanErr) {
          console.warn('Orphan cleanup error:', cleanErr);
        }
      }
      const errMsg = err?.message || 'Sertifikatni yuklashda xatolik yuz berdi. Qayta urinib ko‘ring.';
      setCertUploadStep('error');
      setCertUploadError(errMsg);
      onNotify('error', errMsg);
      setIsCertSubmitting(false);
    }
  };

  // Event registration toggle
  const handleToggleEventReg = async (event: EventItem) => {
    const isRegistered = event.participantIds?.includes(studentId);
    try {
      if (isRegistered) {
        await unregisterStudentFromEvent(event.id, studentId);
        onNotify('info', `«${event.title}» tadbiridan ro‘yxat bekor qilindi.`);
      } else {
        await registerStudentForEvent(
          event.id,
          studentId,
          studentProfile || undefined,
          mySupervisor?.fullName || studentProfile?.customSupervisorName
        );
        onNotify('success', `«${event.title}» tadbiriga muvaffaqiyatli ro‘yxatdan o‘tdingiz!`);
      }
    } catch (err: any) {
      onNotify('error', err.message || 'Tadbirga ulanishda xatolik.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-900 text-white flex items-center justify-center text-xl font-bold shadow-xs overflow-hidden shrink-0">
            {studentProfile?.avatarUrl || studentProfile?.photoURL ? (
              <img
                src={studentProfile.avatarUrl || studentProfile.photoURL}
                alt={currentUser.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              currentUser.fullName.charAt(0)
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{currentUser.fullName}</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-lg">
                Iqtidorli talaba
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {studentProfile?.facultyOrField || "Yo'nalish belgilanmagan"} • {studentProfile?.course}-kurs, {studentProfile?.group} guruhi
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Ilmiy rahbar: <strong className="text-slate-800">{mySupervisor ? mySupervisor.fullName : studentProfile?.customSupervisorName || 'Biriktirilmagan'}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setProjectModalType('loyiha');
              setIsProjectModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi loyiha</span>
          </button>
          <button
            onClick={() => setIsAchModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors border border-slate-200"
          >
            <Trophy className="w-4 h-4 text-amber-600" />
            <span>Yutuq qo‘shish</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Select Dropdown (< sm screens) */}
      <div className="sm:hidden">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
          Bo‘limni tanlang:
        </label>
        <div className="relative">
          <select
            value={activeTab}
            onChange={e => setActiveTab(e.target.value as TabType)}
            className="w-full min-h-[44px] px-3.5 py-2.5 text-base bg-white border border-slate-200 rounded-xl font-medium text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-900"
          >
            <option value="overview">🎓 Bosh sahifa</option>
            <option value="profile">👤 Mening profilim</option>
            <option value="projects">📂 Loyihalarim ({myProjects.length})</option>
            <option value="startups">🚀 Startaplarim ({myStartups.length})</option>
            <option value="achievements">🏆 Yutuqlarim ({myAchievements.length})</option>
            <option value="certificates">🎖️ Sertifikatlarim ({myCertificates.length})</option>
            <option value="events">📅 Tadbirlar ({events.length})</option>
            <option value="announcements">🔔 E'lonlar ({announcements.length})</option>
          </select>
        </div>
      </div>

      {/* Tabs Navigation (Pills for tablets and desktop) */}
      <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {[
          { id: 'overview', label: 'Bosh sahifa', icon: GraduationCap },
          { id: 'profile', label: 'Mening profilim', icon: User },
          { id: 'projects', label: `Loyihalarim (${myProjects.length})`, icon: FolderGit2 },
          { id: 'startups', label: `Startaplarim (${myStartups.length})`, icon: Rocket },
          { id: 'achievements', label: `Yutuqlarim (${myAchievements.length})`, icon: Trophy },
          { id: 'certificates', label: `Sertifikatlarim (${myCertificates.length})`, icon: Award },
          { id: 'events', label: `Tadbirlar (${events.length})`, icon: Calendar },
          { id: 'announcements', label: `E'lonlar (${announcements.length})`, icon: Bell },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loyihalar</span>
                <div className="p-2 bg-blue-50 text-blue-900 rounded-xl">
                  <FolderGit2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{myProjects.length}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {myProjects.filter(p => p.status === 'Tasdiqlangan').length} tasdiqlangan
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Startaplar</span>
                <div className="p-2 bg-indigo-50 text-indigo-900 rounded-xl">
                  <Rocket className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{myStartups.length}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {myStartups.filter(p => p.status === 'Tasdiqlangan').length} tasdiqlangan
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Yutuqlar</span>
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{myAchievements.length}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {myAchievements.filter(a => a.status === 'Tasdiqlangan').length} tasdiqlangan
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sertifikatlar</span>
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{myCertificates.length}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {myCertificates.filter(c => c.isOfficialGenerated).length} rasmiy berilgan
              </span>
            </div>
          </div>

          {/* Recent items split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent announcements */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-900" />
                  <span>So‘nggi e’lonlar</span>
                </h3>
                <button
                  onClick={() => setActiveTab('announcements')}
                  className="text-xs font-semibold text-blue-900 hover:underline"
                >
                  Barchasi
                </button>
              </div>

              {announcements.length === 0 ? (
                <EmptyState title="E’lonlar yo‘q" description="Hozircha universitet ma'muriyatidan hech qanday e'lon mavjud emas." />
              ) : (
                <div className="space-y-3">
                  {announcements.slice(0, 3).map(ann => {
                    const isRead = readAnnouncementIds.has(ann.id);
                    return (
                      <div
                        key={ann.id}
                        onClick={() => markAnnouncementRead(ann.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isRead ? 'bg-slate-50 border-slate-200' : 'bg-blue-50/50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-slate-900">{ann.title}</h4>
                          <span className="text-[11px] text-slate-400 shrink-0">{ann.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{ann.content}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming events */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-900" />
                  <span>Yaqinlashayotgan tadbirlar</span>
                </h3>
                <button
                  onClick={() => setActiveTab('events')}
                  className="text-xs font-semibold text-blue-900 hover:underline"
                >
                  Barchasi
                </button>
              </div>

              {events.length === 0 ? (
                <EmptyState title="Tadbirlar rejalashtirilmagan" description="Hozirda rejalashtirilgan ochiq tadbirlar mavjud emas." />
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 3).map(ev => {
                    const isRegistered = ev.participantIds?.includes(studentId);
                    return (
                      <div key={ev.id} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900">{ev.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {ev.date} {ev.time && `• ${ev.time}`} • {ev.location}
                            </p>
                          </div>
                          <button
                            onClick={() => handleToggleEventReg(ev)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors shrink-0 ${
                              isRegistered
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-900 text-white hover:bg-blue-800'
                            }`}
                          >
                            {isRegistered ? 'Qatnashmoqdasiz' : 'Ro‘yxatdan o‘tish'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Talabaning rasmiy profili</h2>

          {/* Profil rasmi yuklash/o'chirish */}
          <div className="mb-6 p-5 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
              Profil rasmi
            </h3>
            <ProfilePhotoUploader
              currentPhotoUrl={studentProfile?.avatarUrl || studentProfile?.photoURL}
              userName={currentUser.fullName}
              userId={currentUser.id}
              canEdit={true}
              onPhotoUploaded={async url => {
                await updateStudentSelfProfilePhoto(
                  studentProfile?.id || currentUser.id,
                  currentUser.id,
                  url,
                  currentUser
                );
              }}
              onPhotoDeleted={async () => {
                await updateStudentSelfProfilePhoto(
                  studentProfile?.id || currentUser.id,
                  currentUser.id,
                  '',
                  currentUser
                );
              }}
              onNotify={onNotify}
              size="lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 block">F.I.Sh.</span>
                <span className="text-base font-bold text-slate-900">{currentUser.fullName}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Telefon raqami (Login)</span>
                <span className="text-sm font-mono font-semibold text-slate-900">{currentUser.phone}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Ta'lim yo'nalishi</span>
                <span className="text-sm font-medium text-slate-900">{studentProfile?.facultyOrField}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">Kurs</span>
                  <span className="text-sm font-bold text-slate-900">{studentProfile?.course}-kurs</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">Guruh</span>
                  <span className="text-sm font-bold text-slate-900">{studentProfile?.group}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-200">
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider mb-2">Ilmiy rahbar ma'lumotlari</h4>
                {mySupervisor ? (
                  <div className="space-y-2">
                    <p className="text-base font-bold text-slate-900">{mySupervisor.fullName}</p>
                    <p className="text-xs text-slate-600">{mySupervisor.position} • {mySupervisor.academicDegree}</p>
                    <p className="text-xs text-slate-600">Kafedra: {mySupervisor.department}</p>
                    <p className="text-xs text-slate-600">Telefon: {mySupervisor.phone}</p>
                    <p className="text-xs text-slate-600">Email: {mySupervisor.email}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-slate-700 font-medium">
                      {studentProfile?.customSupervisorName
                        ? `Talaba tomonidan kiritilgan: ${studentProfile.customSupervisorName}`
                        : "Hozircha ilmiy rahbar biriktirilmagan."}
                    </p>
                    <p className="text-xs text-amber-700 mt-2">
                      Admin tomonidan tez orada mavjud ilmiy rahbarlardan biri biriktiriladi.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Faollik statistikasi</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>• Loyihalar: <strong>{myProjects.length} ta</strong></div>
                  <div>• Startaplar: <strong>{myStartups.length} ta</strong></div>
                  <div>• Yutuqlar: <strong>{myAchievements.length} ta</strong></div>
                  <div>• Sertifikatlar: <strong>{myCertificates.length} ta</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LOYIHALAR */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mening ilmiy va innovatsion loyihalarim</h2>
              <p className="text-xs text-slate-500">Faqat PDF shaklda yuklanadi (max 10 MB). Admin tasdiqlagach rasmiy status oladi.</p>
            </div>
            <button
              onClick={() => {
                setProjectModalType('loyiha');
                setIsProjectModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Loyiha qo‘shish</span>
            </button>
          </div>

          {myProjects.length === 0 ? (
            <EmptyState
              title="Loyihalar mavjud emas"
              description="Siz hali birorta ham ilmiy loyiha qo‘shmadingiz. Yangi loyiha qo‘shish uchun yuqoridagi tugmani bosing."
              action={{
                label: "Loyiha qo'shish",
                onClick: () => {
                  setProjectModalType('loyiha');
                  setIsProjectModalOpen(true);
                },
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myProjects.map(proj => (
                <div key={proj.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{proj.title}</h3>
                      {renderStatusBadge(proj.status)}
                    </div>
                    <p className="text-xs text-slate-600 mb-3 line-clamp-3 leading-relaxed">{proj.description}</p>
                    <div className="space-y-1 text-xs text-slate-500 mb-4">
                      <div>Yo‘nalish: <span className="text-slate-800 font-medium">{proj.field}</span></div>
                      <div>Mualliflar: <span className="text-slate-800 font-medium">{proj.authorNames}</span></div>
                      <div>Yuborilgan sana: <span className="text-slate-800 font-medium">{new Date(proj.createdAt).toLocaleDateString()}</span></div>
                      {proj.reviewNotes && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 mt-2 text-slate-700">
                          <strong>Admin izohi:</strong> {proj.reviewNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {proj.fileUrl ? (
                      <button
                        onClick={() => onOpenPdf(proj.fileDataUrl || proj.fileUrl!, proj.fileName, proj.fileSize, proj.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span>PDF Hujjatni ko‘rish</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">PDF fayl yo‘q</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STARTAPLAR */}
      {activeTab === 'startups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mening startap loyihalarim</h2>
              <p className="text-xs text-slate-500">Tijoratlashtirish va biznes salohiyatiga ega startap tashabbuslari (Faqat PDF, max 10 MB).</p>
            </div>
            <button
              onClick={() => {
                setProjectModalType('startap');
                setIsProjectModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Startap qo‘shish</span>
            </button>
          </div>

          {myStartups.length === 0 ? (
            <EmptyState
              title="Startaplar mavjud emas"
              description="Siz hali hech qanday startap loyiha qo‘shmadingiz."
              action={{
                label: "Startap qo'shish",
                onClick: () => {
                  setProjectModalType('startap');
                  setIsProjectModalOpen(true);
                },
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myStartups.map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{item.title}</h3>
                      {renderStatusBadge(item.status)}
                    </div>
                    <p className="text-xs text-slate-600 mb-3 line-clamp-3 leading-relaxed">{item.description}</p>
                    <div className="space-y-1 text-xs text-slate-500 mb-4">
                      <div>Soha / Yo‘nalish: <span className="text-slate-800 font-medium">{item.field}</span></div>
                      <div>Mualliflar: <span className="text-slate-800 font-medium">{item.authorNames}</span></div>
                      <div>Sana: <span className="text-slate-800 font-medium">{new Date(item.createdAt).toLocaleDateString()}</span></div>
                      {item.reviewNotes && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 mt-2 text-slate-700">
                          <strong>Admin xulosasi:</strong> {item.reviewNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {item.fileUrl ? (
                      <button
                        onClick={() => onOpenPdf(item.fileDataUrl || item.fileUrl!, item.fileName, item.fileSize, item.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span>PDF Hujjatni ko‘rish</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Fayl yo‘q</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: YUTUQLAR */}
      {activeTab === 'achievements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mening yutuqlarim</h2>
              <p className="text-xs text-slate-500">Olimpiada, tanlov, ilmiy konferensiya, stipendiya va musobaqalar (PDF hujjat bilan).</p>
            </div>
            <button
              onClick={() => setIsAchModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Yutuq qo‘shish</span>
            </button>
          </div>

          {myAchievements.length === 0 ? (
            <EmptyState
              title="Yutuqlar mavjud emas"
              description="Hozircha yutuqlar kiritilmagan. Erishgan natijalaringizni tasdiqlovchi diplom yoki hujjat bilan yuklang."
              action={{
                label: "Yutuq qo'shish",
                onClick: () => setIsAchModalOpen(true),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAchievements.map(ach => (
                <div key={ach.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                        {ach.category}
                      </span>
                      {renderStatusBadge(ach.status)}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1.5">{ach.title}</h3>
                    <p className="text-xs text-slate-600 mb-3 line-clamp-3">{ach.description}</p>
                    <p className="text-xs text-slate-400">Erishilgan sana: {ach.date}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between">
                    {ach.fileUrl ? (
                      <button
                        onClick={() => onOpenPdf(ach.fileDataUrl || ach.fileUrl!, ach.fileName, ach.fileSize, ach.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span>Tasdiqlovchi PDF</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Hujjat yo‘q</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: SERTIFIKATLAR */}
      {activeTab === 'certificates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sertifikatlar va diplomlar</h2>
              <p className="text-xs text-slate-500">Universitet tomonidan berilgan QR-kodli rasmiy sertifikatlar hamda mustaqil yuklangan diplomlar.</p>
            </div>
            <button
              onClick={() => setIsCertModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Sertifikat yuklash</span>
            </button>
          </div>

          {myCertificates.length === 0 ? (
            <EmptyState
              title="Sertifikatlar mavjud emas"
              description="Hozircha birorta sertifikat berilmagan yoki yuklanmagan."
              action={{
                label: "Sertifikat yuklash",
                onClick: () => setIsCertModalOpen(true),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myCertificates.map(cert => (
                <div key={cert.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-900 rounded-md border border-blue-200 block w-max mb-1">
                          {cert.isOfficialGenerated ? 'Rasmiy universitet sertifikati' : 'Yuklangan sertifikat'}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">{cert.title}</h3>
                      </div>
                      {renderStatusBadge(cert.status)}
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 mt-2">
                      <div>Tadbir / Faoliyat: <span className="font-semibold text-slate-800">{cert.eventTitle}</span></div>
                      <div>Tashkilot: <span className="font-semibold text-slate-800">{cert.organizationName}</span></div>
                      <div>Berilgan sana: <span className="font-semibold text-slate-800">{cert.issueDate}</span></div>
                      <div>Sertifikat ID: <code className="font-mono font-bold text-blue-900">{cert.certificateNumber}</code></div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between gap-2">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF & QR-kod yuklab olish</span>
                      </button>
                    ) : cert.fileUrl ? (
                      <button
                        onClick={() => onOpenPdf(cert.fileDataUrl || cert.fileUrl!, cert.fileName, undefined, cert.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span>PDF Faylni ko‘rish</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: TADBIRLAR */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Universitet tadbirlari va tanlovlar</h2>
            <p className="text-xs text-slate-500">Iqtidorli talabalar uchun tashkil etilayotgan olimpiadalar, seminarlar va konferensiyalar.</p>
          </div>

          {events.length === 0 ? (
            <EmptyState title="Tadbirlar mavjud emas" description="Hozirda rejalashtirilgan yangi tadbirlar mavjud emas." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map(ev => {
                const isRegistered = ev.participantIds?.includes(studentId);
                return (
                  <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md ${
                            ev.status === 'Davom etmoqda'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : ev.status === 'Yakunlangan'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {ev.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          Ishtirokchilar: {ev.participantIds?.length || 0} nafar
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mb-1.5">{ev.title}</h3>
                      <p className="text-xs text-slate-600 mb-4 line-clamp-3 leading-relaxed">{ev.description}</p>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div>Sana va vaqt: <strong className="text-slate-900">{ev.date} {ev.time && `(${ev.time})`}</strong></div>
                        <div>O‘tkazilish joyi: <strong className="text-slate-900">{ev.location}</strong></div>
                        {ev.deadline && (
                          <div className="text-amber-700">Ro‘yxatdan o‘tish muddati: <strong>{ev.deadline}</strong></div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-end">
                      <button
                        onClick={() => handleToggleEventReg(ev)}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all shadow-2xs ${
                          isRegistered
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                            : 'bg-blue-900 text-white hover:bg-blue-800'
                        }`}
                      >
                        {isRegistered ? 'Ro‘yxatdan o‘tilgan (Bekor qilish)' : 'Tadbirga ro‘yxatdan o‘tish'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: E'LONLAR */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">E'lonlar va yangiliklar</h2>
            <p className="text-xs text-slate-500">Iqtidorli talabalar uchun muhim xabarnomalar.</p>
          </div>

          {announcements.length === 0 ? (
            <EmptyState title="E'lonlar mavjud emas" description="Hozirda hech qanday e'lon e'lon qilinmagan." />
          ) : (
            <div className="space-y-4">
              {announcements.map(ann => {
                const isRead = readAnnouncementIds.has(ann.id);
                return (
                  <div
                    key={ann.id}
                    onClick={() => markAnnouncementRead(ann.id)}
                    className={`p-6 rounded-3xl border transition-all ${
                      isRead ? 'bg-white border-slate-200 shadow-xs' : 'bg-blue-50/50 border-blue-200 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{ann.title}</h3>
                        {!isRead && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-900 text-white rounded-md">
                            Yangi
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{ann.date} • {ann.createdByName}</span>
                    </div>

                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{ann.content}</p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Auditoriya: {ann.audience}</span>
                      {!isRead && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            markAnnouncementRead(ann.id);
                          }}
                          className="text-blue-900 font-semibold hover:underline"
                        >
                          O‘qilgan deb belgilash
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* MODAL 1: ADD PROJECT OR STARTUP */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {projectModalType === 'loyiha' ? 'Yangi ilmiy loyiha kiritish' : 'Yangi startap kiritish'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Hujjat faqat PDF formatda (maksimal 10 MB) bo‘lishi lozim.
            </p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nomi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Aqlli energiya monitoring tizimi"
                  value={projectTitle}
                  onChange={e => setProjectTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Qisqacha tavsifi *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Loyiha maqsadi, yangiligi va kutilayotgan natijalar"
                  value={projectDesc}
                  onChange={e => setProjectDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Yo‘nalishi / Sohasi
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: IT va Dasturlash"
                    value={projectField}
                    onChange={e => setProjectField(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mualliflar
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Mualliflar F.I.Sh."
                    value={projectAuthors}
                    onChange={e => setProjectAuthors(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  PDF Hujjat (Faqat .pdf, max 10 MB) *
                </label>

                {!projectFile ? (
                  <input
                    type="file"
                    required
                    accept="application/pdf,.pdf"
                    disabled={isProjectSubmitting}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const res = validatePdfFile(f);
                        if (!res.valid) {
                          onNotify('error', res.error || 'Faqat PDF fayllar qabul qilinadi.');
                          e.target.value = '';
                          setProjectFile(null);
                          return;
                        }
                        setProjectFile(f);
                        setProjectUploadStep('idle');
                        setProjectUploadError(null);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100"
                  />
                ) : (
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{projectFile.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {(projectFile.size / (1024 * 1024)).toFixed(2)} MB • PDF
                        </p>
                      </div>
                    </div>
                    {!isProjectSubmitting && (
                      <button
                        type="button"
                        onClick={() => {
                          setProjectFile(null);
                          setProjectUploadStep('idle');
                          setProjectUploadError(null);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Faylni o‘chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Progress and status indicators */}
              {(projectUploadStep === 'uploading' || projectUploadStep === 'saving' || projectUploadStep === 'validating') && (
                <div className="space-y-1.5 p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-medium text-blue-950">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-900" />
                      {projectUploadMessage || 'Bajarilmoqda...'}
                    </span>
                    <span className="font-mono font-bold text-blue-900">{projectUploadPercent}%</span>
                  </div>
                  <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-900 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${projectUploadPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {projectUploadStep === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-2 text-xs text-red-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="truncate">{projectUploadError || 'Xatolik yuz berdi.'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateProject}
                    className="shrink-0 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-[11px]"
                  >
                    Qayta urinish
                  </button>
                </div>
              )}

              {projectUploadStep === 'success' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✓ Muvaffaqiyatli saqlandi</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  disabled={isProjectSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isProjectSubmitting || !projectFile}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2"
                >
                  {isProjectSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {projectUploadStep === 'validating'
                          ? 'Tekshirilmoqda...'
                          : projectUploadStep === 'uploading'
                          ? `Yuklanmoqda... ${projectUploadPercent}%`
                          : projectUploadStep === 'saving'
                          ? 'Firestore’ga saqlanmoqda...'
                          : 'Yuklanmoqda...'}
                      </span>
                    </>
                  ) : projectUploadStep === 'success' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>✓ Saqlandi</span>
                    </>
                  ) : (
                    <span>Saqlash va yuborish</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD ACHIEVEMENT */}
      {isAchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Yangi yutuq qo‘shish</h3>
            <p className="text-xs text-slate-500 mb-5">
              Diplom, sertifikat yoki tasdiqlovchi PDF hujjatni ilova qiling (Maksimal 10 MB).
            </p>

            <form onSubmit={handleCreateAchievement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kategoriya *
                </label>
                <select
                  value={achCategory}
                  onChange={e => setAchCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="Olimpiada">Olimpiada</option>
                  <option value="Tanlov">Tanlov</option>
                  <option value="Konferensiya">Konferensiya</option>
                  <option value="Stipendiya">Stipendiya</option>
                  <option value="Musobaqa">Musobaqa</option>
                  <option value="Boshqa yutuqlar">Boshqa yutuqlar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Yutuq nomi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Respublika fan olimpiadasi 1-o‘rin"
                  value={achTitle}
                  onChange={e => setAchTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Erishilgan sana *
                </label>
                <input
                  type="date"
                  required
                  value={achDate}
                  onChange={e => setAchDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tavsifi / Ma'lumot
                </label>
                <textarea
                  rows={3}
                  placeholder="Yutuq qaysi tashkilot yoki vazirlik tomonidan berilgani haqida"
                  value={achDesc}
                  onChange={e => setAchDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tasdiqlovchi PDF Hujjat (Faqat .pdf, max 10 MB) *
                </label>
                {!achFile ? (
                  <input
                    type="file"
                    required
                    accept="application/pdf,.pdf"
                    disabled={isAchSubmitting}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const res = validatePdfFile(f);
                        if (!res.valid) {
                          onNotify('error', res.error || 'Faqat PDF fayllar qabul qilinadi.');
                          e.target.value = '';
                          setAchFile(null);
                          return;
                        }
                        setAchFile(f);
                        setAchUploadStep('idle');
                        setAchUploadError(null);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100"
                  />
                ) : (
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{achFile.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {(achFile.size / (1024 * 1024)).toFixed(2)} MB • PDF
                        </p>
                      </div>
                    </div>
                    {!isAchSubmitting && (
                      <button
                        type="button"
                        onClick={() => {
                          setAchFile(null);
                          setAchUploadStep('idle');
                          setAchUploadError(null);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Faylni o‘chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Progress and status indicators */}
              {(achUploadStep === 'uploading' || achUploadStep === 'saving' || achUploadStep === 'validating') && (
                <div className="space-y-1.5 p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-medium text-amber-950">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                      {achUploadMessage || 'Bajarilmoqda...'}
                    </span>
                    <span className="font-mono font-bold text-amber-800">{achUploadPercent}%</span>
                  </div>
                  <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${achUploadPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {achUploadStep === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-2 text-xs text-red-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="truncate">{achUploadError || 'Xatolik yuz berdi.'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateAchievement}
                    className="shrink-0 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-[11px]"
                  >
                    Qayta urinish
                  </button>
                </div>
              )}

              {achUploadStep === 'success' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✓ Muvaffaqiyatli saqlandi</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAchModalOpen(false)}
                  disabled={isAchSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isAchSubmitting || !achFile}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2"
                >
                  {isAchSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {achUploadStep === 'validating'
                          ? 'Tekshirilmoqda...'
                          : achUploadStep === 'uploading'
                          ? `Yuklanmoqda... ${achUploadPercent}%`
                          : achUploadStep === 'saving'
                          ? 'Firestore’ga saqlanmoqda...'
                          : 'Yuklanmoqda...'}
                      </span>
                    </>
                  ) : achUploadStep === 'success' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>✓ Saqlandi</span>
                    </>
                  ) : (
                    <span>Yutuqni saqlash</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: UPLOAD SELF-CERTIFICATE */}
      {isCertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Mavjud sertifikatni yuklash</h3>
            <p className="text-xs text-slate-500 mb-5">
              Tanlov yoki kurs sertifikatingizni PDF formatda yuklang (Admin tekshirgach profilga chiqadi).
            </p>

            <form onSubmit={handleUploadCertificate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sertifikat nomi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: IELTS 7.5 yoki IT Park Foundation sertifikati"
                  value={certTitle}
                  onChange={e => setCertTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tadbir yoki Musobaqa nomi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Xalqaro dasturlash marafoni"
                  value={certEvent}
                  onChange={e => setCertEvent(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tashkilot
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: British Council / Raqamli vazirlik"
                    value={certOrg}
                    onChange={e => setCertOrg(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Berilgan sana *
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sertifikat PDF Fayli (Faqat .pdf, max 10 MB) *
                </label>
                {!certFile ? (
                  <input
                    type="file"
                    required
                    accept="application/pdf,.pdf"
                    disabled={isCertSubmitting}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const res = validatePdfFile(f);
                        if (!res.valid) {
                          onNotify('error', res.error || 'Faqat PDF qabul qilinadi.');
                          e.target.value = '';
                          setCertFile(null);
                          return;
                        }
                        setCertFile(f);
                        setCertUploadStep('idle');
                        setCertUploadError(null);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100"
                  />
                ) : (
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{certFile.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {(certFile.size / (1024 * 1024)).toFixed(2)} MB • PDF
                        </p>
                      </div>
                    </div>
                    {!isCertSubmitting && (
                      <button
                        type="button"
                        onClick={() => {
                          setCertFile(null);
                          setCertUploadStep('idle');
                          setCertUploadError(null);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Faylni o‘chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Progress and status indicators */}
              {(certUploadStep === 'uploading' || certUploadStep === 'saving' || certUploadStep === 'validating') && (
                <div className="space-y-1.5 p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-medium text-blue-950">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-900" />
                      {certUploadMessage || 'Bajarilmoqda...'}
                    </span>
                    <span className="font-mono font-bold text-blue-900">{certUploadPercent}%</span>
                  </div>
                  <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-900 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${certUploadPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {certUploadStep === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-2 text-xs text-red-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="truncate">{certUploadError || 'Xatolik yuz berdi.'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUploadCertificate}
                    className="shrink-0 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-[11px]"
                  >
                    Qayta urinish
                  </button>
                </div>
              )}

              {certUploadStep === 'success' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✓ Muvaffaqiyatli saqlandi</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCertModalOpen(false)}
                  disabled={isCertSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isCertSubmitting || !certFile}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2"
                >
                  {isCertSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {certUploadStep === 'validating'
                          ? 'Tekshirilmoqda...'
                          : certUploadStep === 'uploading'
                          ? `Yuklanmoqda... ${certUploadPercent}%`
                          : certUploadStep === 'saving'
                          ? 'Firestore’ga saqlanmoqda...'
                          : 'Yuklanmoqda...'}
                      </span>
                    </>
                  ) : certUploadStep === 'success' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>✓ Saqlandi</span>
                    </>
                  ) : (
                    <span>Yuklash</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
