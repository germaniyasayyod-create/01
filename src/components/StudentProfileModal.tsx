import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  GraduationCap,
  Briefcase,
  Rocket,
  Trophy,
  Award,
  Calendar,
  FileText,
  QrCode,
  Phone,
  BookOpen,
  Edit2,
  Check,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import type {
  UserAccount,
  StudentProfile,
  SupervisorProfile,
  ProjectOrStartup,
  Achievement,
  CertificateItem,
  EventItem,
} from '../types';
import { EmptyState } from './EmptyState';
import { assignStudentSupervisor, updateStudentProfile } from '../services/firestoreService';

interface StudentProfileModalProps {
  isOpen: boolean;
  studentId: string | null;
  currentUser: UserAccount | null;
  students: StudentProfile[];
  supervisors: SupervisorProfile[];
  projects: ProjectOrStartup[];
  achievements: Achievement[];
  certificates: CertificateItem[];
  events: EventItem[];
  onClose: () => void;
  onOpenPdf: (url: string, name?: string, size?: number, title?: string) => void;
  onVerifyCertificate?: (certNumber: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

type ProfileTab = 'overview' | 'projects' | 'startups' | 'achievements' | 'certificates' | 'events';

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  studentId,
  currentUser,
  students,
  supervisors,
  projects,
  achievements,
  certificates,
  events,
  onClose,
  onOpenPdf,
  onVerifyCertificate,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isEditingSupervisor, setIsEditingSupervisor] = useState(false);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Quick edit mode for admins
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [editCourse, setEditCourse] = useState(1);
  const [editGroup, setEditGroup] = useState('');
  const [editFaculty, setEditFaculty] = useState('');

  // Find target student
  const student = students.find(s => s.id === studentId);
  const mySupervisor = student?.supervisorId
    ? supervisors.find(sup => sup.id === student.supervisorId)
    : null;

  useEffect(() => {
    if (student) {
      setSelectedSupervisorId(student.supervisorId || '');
      setEditCourse(student.course || 1);
      setEditGroup(student.group || '');
      setEditFaculty(student.facultyOrField || '');
      setIsEditingSupervisor(false);
      setIsEditingBasic(false);
      setActiveTab('overview');
    }
  }, [student, studentId]);

  if (!isOpen || !studentId) return null;

  // Security check:
  // SuperAdmin and Admin: can view all
  // Supervisor: can view only students assigned to them
  // Student: can view only own profile
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superAdmin';
  const isSupervisor = currentUser?.role === 'supervisor';
  const isCurrentStudent = currentUser?.role === 'student' && (student?.userId === currentUser.id || student?.phone === currentUser.phone);

  // Find supervisor profile of currentUser if supervisor
  const currentSupervisorProfile = isSupervisor
    ? supervisors.find(s => s.phone === currentUser.phone || s.userId === currentUser.id)
    : null;
  const isAssignedSupervisor =
    isSupervisor &&
    Boolean(
      (currentSupervisorProfile && student?.supervisorId === currentSupervisorProfile.id) ||
      (student?.supervisorId && student?.supervisorId === currentUser.id)
    );

  const hasAccess = isAdmin || isAssignedSupervisor || isCurrentStudent;

  // Real filtered data strictly for this student
  const studentProjects = projects.filter(
    p => p.studentId === studentId && p.type === 'loyiha'
  );
  const studentStartups = projects.filter(
    p => p.studentId === studentId && p.type === 'startap'
  );
  const studentAchievements = achievements.filter(a => a.studentId === studentId);
  const studentCertificates = certificates.filter(c => c.studentId === studentId);

  // Events where student is registered
  const studentEvents = events.filter(e => e.participantIds?.includes(studentId));

  const handleSaveSupervisor = async () => {
    if (!student || !currentUser) return;
    setIsSaving(true);
    try {
      await assignStudentSupervisor(student.id, selectedSupervisorId, {
        id: currentUser.id,
        fullName: currentUser.fullName,
        role: currentUser.role,
      });
      setIsEditingSupervisor(false);
      onNotify('success', "Ilmiy rahbar muvaffaqiyatli yangilandi.");
    } catch (err: any) {
      onNotify('error', err.message || "Rahbarni o'zgartirishda xatolik.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBasicInfo = async () => {
    if (!student || !currentUser) return;
    setIsSaving(true);
    try {
      await updateStudentProfile(
        student.id,
        {
          course: editCourse,
          group: editGroup.trim(),
          facultyOrField: editFaculty.trim(),
        },
        {
          id: currentUser.id,
          fullName: currentUser.fullName,
          role: currentUser.role,
        }
      );
      setIsEditingBasic(false);
      onNotify('success', "Talaba ma'lumotlari yangilandi.");
    } catch (err: any) {
      onNotify('error', err.message || "Saqlashda xatolik.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="student-profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="student-profile-modal"
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header with Student Bio */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-linear-to-r from-blue-900 to-indigo-900 text-white relative">
          <button
            id="close-student-profile-modal-btn"
            onClick={onClose}
            className="absolute right-4 top-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
            title="Yopish"
          >
            <X className="w-5 h-5" />
          </button>

          {!student ? (
            <div className="py-8 text-center text-white/80 text-sm font-medium">
              Talaba profili topilmadi.
            </div>
          ) : !hasAccess ? (
            <div className="py-6 flex items-center gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-xs">
              <ShieldAlert className="w-8 h-8 text-amber-300 shrink-0" />
              <div>
                <h3 className="font-bold text-base text-white">Kirish huquqi cheklangan</h3>
                <p className="text-xs text-white/80 mt-1">
                  Siz ushbu talabaning ilmiy rahbari emassiz. Xavfsizlik qoidalariga ko‘ra, faqat o‘zingizga biriktirilgan talabalar profilini ko‘rishingiz mumkin.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 pr-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 border-2 border-white/30 text-white flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-inner shrink-0 overflow-hidden">
                {student.avatarUrl || student.photoURL ? (
                  <img
                    src={student.avatarUrl || student.photoURL}
                    alt={student.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  student.fullName.charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-2xl font-bold text-white truncate">
                    {student.fullName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    {student.course}-kurs talabasi
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-blue-100/90 mt-1">
                  {student.facultyOrField} • Guruh: <span className="font-mono font-bold text-white">{student.group}</span>
                </p>

                <div className="flex items-center gap-4 text-xs text-blue-200/80 mt-2 flex-wrap">
                  {isAdmin && student.phone && (
                    <span className="flex items-center gap-1 font-mono text-white/90">
                      <Phone className="w-3.5 h-3.5 text-blue-300" />
                      {student.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-white/90">
                    <User className="w-3.5 h-3.5 text-blue-300" />
                    Ilmiy rahbar: <strong className="text-white ml-0.5">{mySupervisor ? mySupervisor.fullName : student.customSupervisorName || 'Biriktirilmagan'}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {hasAccess && student && (
          <>
            {/* Quick Metrics Badges Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center gap-4 overflow-x-auto text-xs scrollbar-none">
              <div className="flex items-center gap-1.5 text-slate-600 shrink-0">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                <span>Loyihalar: <strong className="text-slate-900">{studentProjects.length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 shrink-0">
                <Rocket className="w-3.5 h-3.5 text-purple-600" />
                <span>Startaplar: <strong className="text-slate-900">{studentStartups.length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 shrink-0">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>Yutuqlar: <strong className="text-slate-900">{studentAchievements.length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 shrink-0">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sertifikatlar: <strong className="text-slate-900">{studentCertificates.length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-rose-600" />
                <span>Tadbirlar: <strong className="text-slate-900">{studentEvents.length}</strong></span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto bg-white">
              {[
                { id: 'overview', label: "Asosiy ma'lumotlar", icon: User },
                { id: 'projects', label: `Loyihalar (${studentProjects.length})`, icon: Briefcase },
                { id: 'startups', label: `Startaplar (${studentStartups.length})`, icon: Rocket },
                { id: 'achievements', label: `Yutuqlar (${studentAchievements.length})`, icon: Trophy },
                { id: 'certificates', label: `Sertifikatlar (${studentCertificates.length})`, icon: Award },
                { id: 'events', label: `Tadbirlar (${studentEvents.length})`, icon: Calendar },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`student-profile-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id as ProfileTab)}
                    className={`inline-flex items-center gap-1.5 py-3 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'border-blue-900 text-blue-900 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents Area */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {/* TAB 1: OVERVIEW & ASOSIY MA'LUMOTLAR */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Talaba shaxsiy va o‘quv ma’lumotlari</h3>
                        <p className="text-xs text-slate-500">Universitet bazasidagi rasmiy profili.</p>
                      </div>
                      {isAdmin && !isEditingBasic && (
                        <button
                          type="button"
                          onClick={() => setIsEditingBasic(true)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Tahrirlash</span>
                        </button>
                      )}
                    </div>

                    {isEditingBasic ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Kurs</label>
                            <select
                              value={editCourse}
                              onChange={e => setEditCourse(Number(e.target.value))}
                              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                            >
                              <option value={1}>1-kurs</option>
                              <option value={2}>2-kurs</option>
                              <option value={3}>3-kurs</option>
                              <option value={4}>4-kurs</option>
                              <option value={5}>Magistratura</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Guruh</label>
                            <input
                              type="text"
                              value={editGroup}
                              onChange={e => setEditGroup(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Yo‘nalish</label>
                            <input
                              type="text"
                              value={editFaculty}
                              onChange={e => setEditFaculty(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => setIsEditingBasic(false)}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                          >
                            Bekor qilish
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleSaveBasicInfo}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition-colors shadow-xs"
                          >
                            {isSaving ? "Saqlanmoqda..." : "Saqlash"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-slate-400">To‘liq F.I.Sh:</span>
                          <p className="font-bold text-slate-900 text-sm">{student.fullName}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400">Telefon raqam:</span>
                          <p className="font-mono font-semibold text-slate-800">{student.phone}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400">Ta’lim yo‘nalishi:</span>
                          <p className="font-semibold text-slate-800">{student.facultyOrField}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400">Kurs va guruh:</span>
                          <p className="font-semibold text-slate-800">{student.course}-kurs, {student.group} guruhi</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400">Ro‘yxatdan o‘tgan sana:</span>
                          <p className="text-slate-600">{new Date(student.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400">Talaba ID (Firestore):</span>
                          <p className="font-mono text-slate-500 text-[11px] select-all">{student.id}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ilmiy rahbar ma'lumotlari */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Biriktirilgan ilmiy rahbar</h3>
                        <p className="text-xs text-slate-500">Talabaning ilmiy faoliyatiga rahbarlik qiluvchi professor-o‘qituvchi.</p>
                      </div>

                      {isAdmin && !isEditingSupervisor && (
                        <button
                          type="button"
                          onClick={() => setIsEditingSupervisor(true)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Rahbarni o‘zgartirish</span>
                        </button>
                      )}
                    </div>

                    {isEditingSupervisor ? (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Yangi ilmiy rahbarni tanlang:
                          </label>
                          <select
                            value={selectedSupervisorId}
                            onChange={e => setSelectedSupervisorId(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                          >
                            <option value="">Biriktirilmagan</option>
                            {supervisors.map(sup => (
                              <option key={sup.id} value={sup.id}>
                                {sup.fullName} ({sup.department}, {sup.position})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => setIsEditingSupervisor(false)}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                          >
                            Bekor qilish
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleSaveSupervisor}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition-colors shadow-xs"
                          >
                            {isSaving ? "Saqlanmoqda..." : "Saqlash"}
                          </button>
                        </div>
                      </div>
                    ) : mySupervisor ? (
                      <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-sm shrink-0">
                          {mySupervisor.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1 text-xs space-y-1">
                          <h4 className="text-sm font-bold text-slate-900">{mySupervisor.fullName}</h4>
                          <p className="text-slate-600">{mySupervisor.position} • {mySupervisor.academicDegree}</p>
                          <div className="flex items-center gap-4 text-slate-500 pt-1 flex-wrap">
                            <span>Kafedra: <strong>{mySupervisor.department}</strong></span>
                            {isAdmin && <span>Telefon: <strong className="font-mono">{mySupervisor.phone}</strong></span>}
                          </div>
                        </div>
                      </div>
                    ) : student.customSupervisorName ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                        Talaba tomonidan qo‘lda kiritilgan rahbar: <strong>{student.customSupervisorName}</strong>
                        {isAdmin && <span className="block text-slate-600 mt-0.5">Iltimos, yuqoridagi tugma orqali tizimdan rasmiy ilmiy rahbar biriktiring.</span>}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic py-2">
                        Hozircha ilmiy rahbar biriktirilmagan.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: LOYIHALAR */}
              {activeTab === 'projects' && (
                <div className="space-y-4">
                  {studentProjects.length === 0 ? (
                    <EmptyState
                      title="Ma’lumot mavjud emas"
                      description="Ushbu talaba tomonidan hali birorta ham ilmiy loyiha topshirilmagan."
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {studentProjects.map(proj => (
                        <div key={proj.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-sm font-bold text-slate-900">{proj.title}</h4>
                              <span
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-md shrink-0 ${
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
                            <div className="space-y-1 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl mb-3">
                              <div>Soha/yo‘nalish: <strong>{proj.field}</strong></div>
                              <div>Mualliflar: {proj.authorNames}</div>
                              <div>Topshirilgan: {new Date(proj.createdAt).toLocaleDateString()}</div>
                              {proj.reviewNotes && (
                                <div className="text-slate-700 pt-1 border-t border-slate-200/60">
                                  Ekspert xulosasi: {proj.reviewNotes}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            {proj.fileUrl ? (
                              <button
                                type="button"
                                onClick={() => onOpenPdf(proj.fileDataUrl || proj.fileUrl!, proj.fileName, proj.fileSize, proj.title)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-red-600" />
                                <span>PDF Hujjatni ko‘rish</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">PDF yuklanmagan</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: STARTAPLAR */}
              {activeTab === 'startups' && (
                <div className="space-y-4">
                  {studentStartups.length === 0 ? (
                    <EmptyState
                      title="Ma’lumot mavjud emas"
                      description="Ushbu talaba tomonidan startap tashabbuslari kiritilmagan."
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {studentStartups.map(startup => (
                        <div key={startup.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-sm font-bold text-slate-900">{startup.title}</h4>
                              <span
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-md shrink-0 ${
                                  startup.status === 'Tasdiqlangan'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : startup.status === 'Rad etilgan'
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {startup.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mb-3 line-clamp-3">{startup.description}</p>
                            <div className="space-y-1 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl mb-3">
                              <div>Soha: <strong>{startup.field}</strong></div>
                              <div>Mualliflar guruhi: {startup.authorNames}</div>
                              <div>Topshirilgan sana: {new Date(startup.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            {startup.fileUrl ? (
                              <button
                                type="button"
                                onClick={() => onOpenPdf(startup.fileDataUrl || startup.fileUrl!, startup.fileName, startup.fileSize, startup.title)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-red-600" />
                                <span>Biznes reja / PDF</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">Hujjat yuklanmagan</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: YUTUQLAR */}
              {activeTab === 'achievements' && (
                <div className="space-y-4">
                  {studentAchievements.length === 0 ? (
                    <EmptyState
                      title="Ma’lumot mavjud emas"
                      description="Ushbu talaba tomonidan hali yutuq yoki olimpiada natijalari kiritilmagan."
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {studentAchievements.map(ach => (
                        <div key={ach.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-900 rounded-md inline-block mb-1">
                                  {ach.category}
                                </span>
                                <h4 className="text-sm font-bold text-slate-900">{ach.title}</h4>
                              </div>
                              <span
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-md shrink-0 ${
                                  ach.status === 'Tasdiqlangan'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : ach.status === 'Rad etilgan'
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {ach.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mb-3 line-clamp-2">{ach.description}</p>
                            <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl mb-3">
                              Sana: <strong>{ach.date}</strong>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            {ach.fileUrl ? (
                              <button
                                type="button"
                                onClick={() => onOpenPdf(ach.fileDataUrl || ach.fileUrl!, ach.fileName, ach.fileSize, ach.title)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
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

              {/* TAB 5: SERTIFIKATLAR */}
              {activeTab === 'certificates' && (
                <div className="space-y-4">
                  {studentCertificates.length === 0 ? (
                    <EmptyState
                      title="Ma’lumot mavjud emas"
                      description="Ushbu talabaga tegishli sertifikatlar mavjud emas."
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {studentCertificates.map(cert => (
                        <div key={cert.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-50 text-blue-900 rounded-md inline-block mb-1">
                                  {cert.certificateNumber}
                                </span>
                                <h4 className="text-sm font-bold text-slate-900">{cert.title}</h4>
                              </div>
                              <span
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-md shrink-0 ${
                                  cert.status === 'Tasdiqlangan'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {cert.status}
                              </span>
                            </div>

                            <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl mb-3">
                              <div>Tadbir/tanlov: <strong>{cert.eventTitle}</strong></div>
                              <div>Tashkilot: {cert.organizationName}</div>
                              <div>Berilgan sana: {cert.issueDate}</div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                            {cert.fileUrl ? (
                              <button
                                type="button"
                                onClick={() => onOpenPdf(cert.fileDataUrl || cert.fileUrl!, cert.fileName, undefined, cert.title)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-red-600" />
                                <span>PDF ko‘rish</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">PDF yo‘q</span>
                            )}

                            {onVerifyCertificate && (
                              <button
                                type="button"
                                onClick={() => onVerifyCertificate(cert.certificateNumber)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>QR Verifikatsiya</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: TADBIRLAR */}
              {activeTab === 'events' && (
                <div className="space-y-4">
                  {studentEvents.length === 0 ? (
                    <EmptyState
                      title="Ma’lumot mavjud emas"
                      description="Ushbu talaba hozircha birorta ham universitet tadbiriga ro‘yxatdan o‘tmagan."
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {studentEvents.map(ev => (
                        <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-sm font-bold text-slate-900">{ev.title}</h4>
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 rounded-md shrink-0">
                                Ro‘yxatdan o‘tgan
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mb-3 line-clamp-2">{ev.description}</p>
                            <div className="space-y-1 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                              <div>Sana: <strong>{ev.date} {ev.time && `(${ev.time})`}</strong></div>
                              <div>Joylashuv: <strong>{ev.location}</strong></div>
                              <div>Tadbir holati: <span className="font-semibold text-blue-900">{ev.status}</span></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            id="close-student-profile-bottom-btn"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors shadow-2xs"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
