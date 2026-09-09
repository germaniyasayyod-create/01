import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { InitialSetupBanner } from './components/InitialSetupBanner';
import { StudentDashboard } from './components/StudentDashboard';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { NotificationToast } from './components/NotificationToast';
import { ConfirmModal } from './components/ConfirmModal';
import { PdfViewerModal } from './components/PdfViewerModal';
import { VerifyCertificateModal } from './components/VerifyCertificateModal';
import { EventParticipantsModal } from './components/EventParticipantsModal';
import { StudentProfileModal } from './components/StudentProfileModal';
import {
  getCurrentUserSession,
  logoutUserSession,
  checkSuperAdminExists,
} from './services/authService';
import { subscribeToCollection } from './services/firestoreService';
import { Lock, Radio } from 'lucide-react';
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
} from './types';

export default function App() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isSuperAdminExists, setIsSuperAdminExists] = useState<boolean>(true);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Real-time Firestore Collections
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorProfile[]>([]);
  const [projects, setProjects] = useState<ProjectOrStartup[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Notifications & Modals
  const [toast, setToast] = useState<{
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [confirmModalOptions, setConfirmModalOptions] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  const [pdfModalOptions, setPdfModalOptions] = useState<{
    isOpen: boolean;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    title?: string;
  }>({
    isOpen: false,
  });

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyInitialCertId, setVerifyInitialCertId] = useState('');

  // Event participants & Student profile modals
  const [selectedEventForParticipants, setSelectedEventForParticipants] = useState<EventItem | null>(null);
  const [selectedStudentIdForProfile, setSelectedStudentIdForProfile] = useState<string | null>(null);

  const notify = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({
      id: Date.now().toString(),
      type,
      message,
    });
  };

  const handleOpenStudentProfile = (studentId: string) => {
    setSelectedStudentIdForProfile(studentId);
    window.location.hash = `#student/${studentId}`;
  };

  const handleCloseStudentProfile = () => {
    setSelectedStudentIdForProfile(null);
    if (window.location.hash.startsWith('#student/') || window.location.hash.startsWith('#students/')) {
      window.location.hash = '';
    }
  };

  // Check URL hash for verify links (e.g. #verify/CERT-2026-0001) or student profiles (#student/xyz)
  useEffect(() => {
    const handleHashCheck = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#verify/')) {
        const certCode = hash.replace('#verify/', '');
        setVerifyInitialCertId(certCode);
        setVerifyModalOpen(true);
      } else if (hash.startsWith('#student/')) {
        const stId = hash.replace('#student/', '');
        if (stId) setSelectedStudentIdForProfile(stId);
      } else if (hash.startsWith('#students/')) {
        const stId = hash.replace('#students/', '');
        if (stId) setSelectedStudentIdForProfile(stId);
      }
    };
    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, []);

  // Initial session & superAdmin check
  useEffect(() => {
    const initApp = async () => {
      try {
        const session = getCurrentUserSession();
        if (session) {
          setCurrentUser(session);
        }
        const hasSuperAdmin = await checkSuperAdminExists();
        setIsSuperAdminExists(hasSuperAdmin);
      } catch (err) {
        console.error('Error during app initialization:', err);
      } finally {
        setIsAuthLoading(false);
      }
    };

    initApp();
  }, []);

  // Subscriptions to live real-time collections
  useEffect(() => {
    const unsubStudents = subscribeToCollection<StudentProfile>('students', setStudents);
    const unsubSupervisors = subscribeToCollection<SupervisorProfile>('supervisors', setSupervisors);
    const unsubProjects = subscribeToCollection<ProjectOrStartup>('projects', setProjects);
    const unsubAchievements = subscribeToCollection<Achievement>('achievements', setAchievements);
    const unsubCertificates = subscribeToCollection<CertificateItem>('certificates', setCertificates);
    const unsubEvents = subscribeToCollection<EventItem>('events', setEvents);
    const unsubAnnouncements = subscribeToCollection<Announcement>('announcements', setAnnouncements);

    // Subscriptions only needed for logged in users
    let unsubUsers = () => {};
    let unsubLogs = () => {};

    if (currentUser?.role === 'admin' || currentUser?.role === 'superAdmin') {
      unsubUsers = subscribeToCollection<UserAccount>('users', setAllUsers);
      unsubLogs = subscribeToCollection<AuditLog>('audit_logs', setAuditLogs);
    }

    return () => {
      unsubStudents();
      unsubSupervisors();
      unsubProjects();
      unsubAchievements();
      unsubCertificates();
      unsubEvents();
      unsubAnnouncements();
      unsubUsers();
      unsubLogs();
    };
  }, [currentUser]);

  const handleLogout = async () => {
    if (currentUser) {
      await logoutUserSession(currentUser.id, currentUser.fullName);
    }
    setCurrentUser(null);
    notify('info', 'Tizimdan muvaffaqiyatli chiqildi.');
  };

  const currentStudentProfile = currentUser
    ? students.find(s => s.userId === currentUser.id || s.phone === currentUser.phone) || null
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 selection:bg-blue-900 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <NotificationToast
          id={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalOptions.isOpen}
        title={confirmModalOptions.title}
        message={confirmModalOptions.message}
        confirmText={confirmModalOptions.confirmText}
        isDestructive={confirmModalOptions.isDestructive}
        onConfirm={confirmModalOptions.onConfirm}
        onClose={() => setConfirmModalOptions(prev => ({ ...prev, isOpen: false }))}
      />

      {/* PDF Preview Modal */}
      <PdfViewerModal
        isOpen={pdfModalOptions.isOpen}
        fileUrl={pdfModalOptions.fileUrl}
        fileName={pdfModalOptions.fileName}
        fileSize={pdfModalOptions.fileSize}
        title={pdfModalOptions.title}
        onClose={() => setPdfModalOptions({ isOpen: false })}
      />

      {/* Certificate Verification Modal */}
      <VerifyCertificateModal
        isOpen={verifyModalOpen}
        initialCertId={verifyInitialCertId}
        onClose={() => {
          setVerifyModalOpen(false);
          setVerifyInitialCertId('');
          if (window.location.hash.startsWith('#verify/')) {
            window.location.hash = '';
          }
        }}
      />

      {/* Event Participants Modal */}
      <EventParticipantsModal
        isOpen={!!selectedEventForParticipants}
        event={selectedEventForParticipants}
        students={students}
        supervisors={supervisors}
        onClose={() => setSelectedEventForParticipants(null)}
        onOpenStudentProfile={handleOpenStudentProfile}
      />

      {/* Student Full Profile Modal */}
      <StudentProfileModal
        isOpen={!!selectedStudentIdForProfile}
        studentId={selectedStudentIdForProfile}
        currentUser={currentUser}
        students={students}
        supervisors={supervisors}
        projects={projects}
        achievements={achievements}
        certificates={certificates}
        events={events}
        onClose={handleCloseStudentProfile}
        onOpenPdf={(url, name, size, title) =>
          setPdfModalOptions({
            isOpen: true,
            fileUrl: url,
            fileName: name,
            fileSize: size,
            title,
          })
        }
        onVerifyCertificate={certNumber => {
          handleCloseStudentProfile();
          setVerifyInitialCertId(certNumber);
          setVerifyModalOpen(true);
        }}
        onNotify={notify}
      />

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenVerifyModal={() => setVerifyModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 safe-area-pb">
        {/* Loading Spinner */}
        {isAuthLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-600">Platforma yuklanmoqda...</p>
          </div>
        ) : !currentUser ? (
          /* NOT LOGGED IN */
          <div className="py-4">
            {!isSuperAdminExists && (
              <InitialSetupBanner
                onSuccess={admin => {
                  setIsSuperAdminExists(true);
                  setCurrentUser(admin);
                }}
                onNotify={notify}
              />
            )}

            <AuthView
              supervisors={supervisors}
              onAuthSuccess={user => setCurrentUser(user)}
              onNotify={notify}
            />
          </div>
        ) : !currentUser.isActive ? (
          /* BLOCKED ACCOUNT BANNER */
          <div className="max-w-lg mx-auto bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-rose-950 mb-2">Hisobingiz vaqtincha bloklangan</h2>
            <p className="text-xs text-rose-700 mb-6 leading-relaxed">
              Xavfsizlik qoidalari yoki ma'muriyat qarori bilan profilingiz faoliyati to'xtatilgan. Iltimos, universitet ma'muriyatiga murojaat qiling.
            </p>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              Tizimdan chiqish
            </button>
          </div>
        ) : currentUser.role === 'student' ? (
          /* STUDENT DASHBOARD */
          <StudentDashboard
            currentUser={currentUser}
            studentProfile={currentStudentProfile}
            supervisors={supervisors}
            projects={projects}
            achievements={achievements}
            certificates={certificates}
            events={events}
            announcements={announcements}
            onNotify={notify}
            onOpenPdf={(url, name, size, title) =>
              setPdfModalOptions({
                isOpen: true,
                fileUrl: url,
                fileName: name,
                fileSize: size,
                title,
              })
            }
          />
        ) : currentUser.role === 'supervisor' ? (
          /* SUPERVISOR DASHBOARD */
          <SupervisorDashboard
            currentUser={currentUser}
            supervisors={supervisors}
            students={students}
            projects={projects}
            achievements={achievements}
            onNotify={notify}
            onOpenStudentProfile={handleOpenStudentProfile}
            onOpenPdf={(url, name, size, title) =>
              setPdfModalOptions({
                isOpen: true,
                fileUrl: url,
                fileName: name,
                fileSize: size,
                title,
              })
            }
          />
        ) : (
          /* ADMIN & SUPER ADMIN DASHBOARD */
          <AdminDashboard
            currentUser={currentUser}
            allUsers={allUsers}
            students={students}
            supervisors={supervisors}
            projects={projects}
            achievements={achievements}
            certificates={certificates}
            events={events}
            announcements={announcements}
            auditLogs={auditLogs}
            onNotify={notify}
            onOpenEventParticipants={ev => setSelectedEventForParticipants(ev)}
            onOpenStudentProfile={handleOpenStudentProfile}
            onOpenPdf={(url, name, size, title) =>
              setPdfModalOptions({
                isOpen: true,
                fileUrl: url,
                fileName: name,
                fileSize: size,
                title,
              })
            }
            onConfirmModal={opts =>
              setConfirmModalOptions({
                isOpen: true,
                title: opts.title,
                message: opts.message,
                confirmText: opts.confirmText,
                isDestructive: opts.isDestructive,
                onConfirm: async () => {
                  await opts.onConfirm();
                  setConfirmModalOptions(prev => ({ ...prev, isOpen: false }));
                },
              })
            }
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-xs font-semibold text-slate-800">
              «IQTIDORLI TALABALAR» — Ilmiy-tadqiqot va innovatsion faoliyat axborot tizimi
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              O‘zbekiston Respublikasi Oliy Ta’lim, Fan va Innovatsiyalar Vazirligi tavsiyalari asosida
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
            <span>Cloud Firestore Real-time ulanish faol</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
