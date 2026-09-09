import React, { useState } from 'react';
import {
  User,
  Users,
  FolderGit2,
  Rocket,
  Trophy,
  FileText,
  Phone,
  Mail,
  Building,
  GraduationCap,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { EmptyState } from './EmptyState';
import { ProfilePhotoUploader } from './ProfilePhotoUploader';
import { updateSupervisorSelfProfilePhoto } from '../services/firestoreService';
import type {
  UserAccount,
  SupervisorProfile,
  StudentProfile,
  ProjectOrStartup,
  Achievement,
} from '../types';

interface Props {
  currentUser: UserAccount;
  supervisors: SupervisorProfile[];
  students: StudentProfile[];
  projects: ProjectOrStartup[];
  achievements: Achievement[];
  onNotify?: (type: 'success' | 'error' | 'info', msg: string) => void;
  onOpenPdf: (url: string, name?: string, size?: number, title?: string) => void;
  onOpenStudentProfile?: (studentId: string) => void;
}

type TabType = 'profile' | 'students' | 'projects' | 'startups' | 'achievements';

export const SupervisorDashboard: React.FC<Props> = ({
  currentUser,
  supervisors = [],
  students = [],
  projects = [],
  achievements = [],
  onNotify,
  onOpenPdf,
  onOpenStudentProfile,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('students');

  // Match supervisor by phone or userId
  const myProfile = supervisors.find(
    s => s.userId === currentUser.id || s.phone === currentUser.phone
  );

  const supervisorId = myProfile?.id || '';

  // Assigned students to this supervisor
  const myStudents = students.filter(s => s.supervisorId === supervisorId);
  const myStudentIds = new Set(myStudents.map(s => s.id));

  // Projects and achievements by assigned students
  const myProjects = projects.filter(
    p => p.type === 'loyiha' && (p.supervisorId === supervisorId || myStudentIds.has(p.studentId))
  );
  const myStartups = projects.filter(
    p => p.type === 'startap' && (p.supervisorId === supervisorId || myStudentIds.has(p.studentId))
  );
  const myAchievements = achievements.filter(a => myStudentIds.has(a.studentId));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-900 text-white flex items-center justify-center text-xl font-bold shadow-xs overflow-hidden shrink-0">
            {myProfile?.avatarUrl || myProfile?.photoURL ? (
              <img
                src={myProfile.avatarUrl || myProfile.photoURL}
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
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded-lg">
                Ilmiy rahbar
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {myProfile?.position || 'O‘qituvchi / Ilmiy xodim'} • {myProfile?.department || 'Kafedra'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div className="text-center px-3 border-r border-slate-200">
            <span className="text-xs text-slate-500 block">Talabalar</span>
            <strong className="text-lg text-slate-900">{myStudents.length}</strong>
          </div>
          <div className="text-center px-3 border-r border-slate-200">
            <span className="text-xs text-slate-500 block">Loyihalar</span>
            <strong className="text-lg text-slate-900">{myProjects.length}</strong>
          </div>
          <div className="text-center px-3">
            <span className="text-xs text-slate-500 block">Yutuqlar</span>
            <strong className="text-lg text-slate-900">{myAchievements.length}</strong>
          </div>
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
            className="w-full min-h-[44px] px-3.5 py-2.5 text-base bg-white border border-slate-200 rounded-xl font-medium text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-purple-900"
          >
            <option value="students">👥 Biriktirilgan talabalar ({myStudents.length})</option>
            <option value="projects">📂 Talabalar loyihalari ({myProjects.length})</option>
            <option value="startups">🚀 Startaplar ({myStartups.length})</option>
            <option value="achievements">🏆 Yutuqlar ({myAchievements.length})</option>
            <option value="profile">👤 Profil ma'lumotlarim</option>
          </select>
        </div>
      </div>

      {/* Tabs (tablets & desktop) */}
      <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {[
          { id: 'students', label: `Biriktirilgan talabalar (${myStudents.length})`, icon: Users },
          { id: 'projects', label: `Talabalar loyihalari (${myProjects.length})`, icon: FolderGit2 },
          { id: 'startups', label: `Startaplar (${myStartups.length})`, icon: Rocket },
          { id: 'achievements', label: `Yutuqlar (${myAchievements.length})`, icon: Trophy },
          { id: 'profile', label: 'Profil ma\'lumotlarim', icon: User },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: STUDENTS */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Menga biriktirilgan iqtidorli talabalar</h2>
            <p className="text-xs text-slate-500">Sizning ilmiy rahbarligingiz ostida faoliyat yuritayotgan talabalar ro‘yxati.</p>
          </div>

          {myStudents.length === 0 ? (
            <EmptyState
              title="Biriktirilgan talabalar yo'q"
              description="Hozircha sizga biriktirilgan talabalar mavjud emas. Talabalar ro'yxatdan o'tganda yoki admin biriktirganda shu yerda ko'rinadi."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myStudents.map(student => (
                <div key={student.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                        {student.avatarUrl || student.photoURL ? (
                          <img
                            src={student.avatarUrl || student.photoURL}
                            alt={student.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          student.fullName.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{student.fullName}</h3>
                        <p className="text-xs text-slate-500 font-mono">{student.phone}</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                      <div>Yo‘nalish: <strong>{student.facultyOrField}</strong></div>
                      <div>Kurs va guruh: <strong>{student.course}-kurs, {student.group}</strong></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </span>

                    <button
                      type="button"
                      id={`supervisor-view-student-${student.id}`}
                      onClick={() => onOpenStudentProfile?.(student.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Profilni ko‘rish</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Talabalarimning ilmiy loyihalari</h2>
            <p className="text-xs text-slate-500">Sizning ilmiy rahbarligingiz ostidagi talabalar tomonidan topshirilgan loyihalar.</p>
          </div>

          {myProjects.length === 0 ? (
            <EmptyState title="Loyihalar mavjud emas" description="Talabalaringiz hali ilmiy loyiha taqdim etishmagan." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myProjects.map(proj => (
                <div key={proj.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold text-slate-900">{proj.title}</h3>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700">
                        {proj.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3 line-clamp-3">{proj.description}</p>
                    <div className="space-y-1 text-xs text-slate-500 mb-4">
                      <div>Talaba: <strong className="text-slate-900">{proj.studentName}</strong></div>
                      <div>Yo‘nalish: {proj.field}</div>
                      <div>Mualliflar: {proj.authorNames}</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {proj.fileUrl ? (
                      <button
                        onClick={() => onOpenPdf(proj.fileDataUrl || proj.fileUrl!, proj.fileName, proj.fileSize, proj.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span>PDF Hujjatni ko‘rish</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">PDF mavjud emas</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STARTUPS */}
      {activeTab === 'startups' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Talabalar startaplari</h2>
            <p className="text-xs text-slate-500">Talabalaringiz tomonidan ishlab chiqilayotgan startap tashabbuslari.</p>
          </div>

          {myStartups.length === 0 ? (
            <EmptyState title="Startaplar mavjud emas" description="Talabalaringiz tomonidan startaplar yuklanmagan." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myStartups.map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3 line-clamp-3">{item.description}</p>
                    <div className="space-y-1 text-xs text-slate-500 mb-4">
                      <div>Muallif talaba: <strong className="text-slate-900">{item.studentName}</strong></div>
                      <div>Soha: {item.field}</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {item.fileUrl && (
                      <button
                        onClick={() => onOpenPdf(item.fileDataUrl || item.fileUrl!, item.fileName, item.fileSize, item.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span>PDF Hujjatni ko‘rish</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ACHIEVEMENTS */}
      {activeTab === 'achievements' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Talabalar yutuqlari</h2>
            <p className="text-xs text-slate-500">Talabalaringiz erishgan tanlov, olimpiada va musobaqa natijalari.</p>
          </div>

          {myAchievements.length === 0 ? (
            <EmptyState title="Yutuqlar mavjud emas" description="Talabalaringiz hali yutuq yuklamagan." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAchievements.map(ach => (
                <div key={ach.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                        {ach.category}
                      </span>
                      <span className="text-xs text-slate-500">{ach.status}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">{ach.title}</h3>
                    <p className="text-xs text-slate-600 mb-2 line-clamp-2">{ach.description}</p>
                    <p className="text-xs text-slate-500">Talaba: <strong className="text-slate-900">{ach.studentName}</strong></p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-4">
                    {ach.fileUrl && (
                      <button
                        onClick={() => onOpenPdf(ach.fileDataUrl || ach.fileUrl!, ach.fileName, ach.fileSize, ach.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span>Tasdiqlovchi PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-2xl">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Ilmiy rahbar rasmiy anketasi</h2>

          {/* Profil rasmi yuklash/o'chirish */}
          <div className="mb-6 p-5 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
              Profil rasmi
            </h3>
            <ProfilePhotoUploader
              currentPhotoUrl={myProfile?.avatarUrl || myProfile?.photoURL}
              userName={currentUser.fullName}
              userId={currentUser.id}
              canEdit={true}
              onPhotoUploaded={async url => {
                await updateSupervisorSelfProfilePhoto(
                  myProfile?.id || currentUser.id,
                  currentUser.id,
                  url,
                  currentUser
                );
              }}
              onPhotoDeleted={async () => {
                await updateSupervisorSelfProfilePhoto(
                  myProfile?.id || currentUser.id,
                  currentUser.id,
                  '',
                  currentUser
                );
              }}
              onNotify={onNotify}
              size="lg"
            />
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 block">F.I.Sh.</span>
              <span className="text-base font-bold text-slate-900">{currentUser.fullName}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Telefon raqami</span>
                <span className="text-sm font-mono font-semibold text-slate-900">{currentUser.phone}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Elektron pochta</span>
                <span className="text-sm font-semibold text-slate-900">{myProfile?.email || 'Kiritilmagan'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Lavozimi</span>
                <span className="text-sm font-semibold text-slate-900">{myProfile?.position || 'Kafedra o‘qituvchisi'}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Ilmiy darajasi</span>
                <span className="text-sm font-semibold text-slate-900">{myProfile?.academicDegree || 'Magistr / PhD / DSc'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Kafedra / Bo‘lim</span>
              <span className="text-sm font-semibold text-slate-900">{myProfile?.department || 'Kafedra belgilanmagan'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
