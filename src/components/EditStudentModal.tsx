import React, { useState, useEffect } from 'react';
import { X, Save, Key, ShieldCheck, UserCheck, Eye, EyeOff, Loader2, BookOpen } from 'lucide-react';
import type { StudentProfile, SupervisorProfile, UserRole } from '../types';
import { updateStudentFullByAdmin } from '../services/firestoreService';
import { ProfilePhotoUploader } from './ProfilePhotoUploader';

interface EditStudentModalProps {
  isOpen: boolean;
  student: StudentProfile | null;
  supervisors: SupervisorProfile[];
  actor: { id: string; fullName: string; role: UserRole };
  onClose: () => void;
  onSaveSuccess: () => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  student,
  supervisors,
  actor,
  onClose,
  onSaveSuccess,
  onNotify,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [course, setCourse] = useState<number>(1);
  const [group, setGroup] = useState('');
  const [facultyOrField, setFacultyOrField] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [customSupervisorName, setCustomSupervisorName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // Password reset
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setFullName(student.fullName || '');
      setPhone(student.phone || '');
      setCourse(student.course || 1);
      setGroup(student.group || '');
      setFacultyOrField(student.facultyOrField || '');
      setSupervisorId(student.supervisorId || '');
      setCustomSupervisorName(student.customSupervisorName || '');
      setAvatarUrl(student.avatarUrl || student.photoURL || '');
      setNewPassword('');
      setShowPassword(false);
      setErrorMessage(null);
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage("Talabaning F.I.Sh. kiritilishi shart.");
      return;
    }

    if (!phone.trim()) {
      setErrorMessage("Telefon raqami kiritilishi shart.");
      return;
    }

    if (!facultyOrField.trim()) {
      setErrorMessage("Ta'lim yo'nalishi kiritilishi shart.");
      return;
    }

    if (!group.trim()) {
      setErrorMessage("Guruh kiritilishi shart.");
      return;
    }

    if (newPassword.trim() && newPassword.trim().length < 6) {
      setErrorMessage("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    try {
      setIsSubmitting(true);

      await updateStudentFullByAdmin(actor, student.id, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        course: Number(course),
        group: group.trim().toUpperCase(),
        facultyOrField: facultyOrField.trim(),
        supervisorId: supervisorId || '',
        customSupervisorName: customSupervisorName.trim() || undefined,
        avatarUrl: avatarUrl || '',
        photoURL: avatarUrl || '',
        newPassword: newPassword.trim() || undefined,
      });

      onNotify('success', `${fullName} anketasi muvaffaqiyatli yangilandi!`);
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('Update student error:', err);
      const msg = err?.message || "Talaba ma'lumotlarini saqlashda xatolik yuz berdi.";
      setErrorMessage(msg);
      onNotify('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="edit-student-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        id="edit-student-modal"
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Talaba profilini tahrirlash</h2>
              <p className="text-xs text-slate-500">
                Rasmiy ma'lumotlar, ilmiy rahbar va tizim parolini boshqarish
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-edit-student-modal-btn"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Section 1: Profil Rasmi */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Profil rasmi
            </h3>
            <ProfilePhotoUploader
              currentPhotoUrl={avatarUrl}
              userName={fullName || student.fullName}
              userId={student.userId || student.id}
              canEdit={true}
              onPhotoUploaded={url => setAvatarUrl(url)}
              onPhotoDeleted={() => setAvatarUrl('')}
              onNotify={onNotify}
              size="lg"
            />
          </div>

          {/* Section 2: Asosiy Ma'lumotlar */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Asosiy ma'lumotlar
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                F.I.Sh. (Familiya, Ism, Sharif) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Masalan: Karimov Alisher Baxtiyor o‘g‘li"
                className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Telefon raqami (Login) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+998 (90) 123-45-67"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Guruh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={group}
                  onChange={e => setGroup(e.target.value)}
                  placeholder="Masalan: 611-20"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm uppercase bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ta'lim yo'nalishi / Fakultet <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={facultyOrField}
                  onChange={e => setFacultyOrField(e.target.value)}
                  placeholder="Masalan: Dasturiy injiniring"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kurs <span className="text-rose-500">*</span>
                </label>
                <select
                  value={course}
                  onChange={e => setCourse(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-xs"
                >
                  <option value={1}>1-kurs</option>
                  <option value={2}>2-kurs</option>
                  <option value={3}>3-kurs</option>
                  <option value={4}>4-kurs</option>
                  <option value={5}>5-kurs / Magistr</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Ilmiy Rahbar */}
          <div className="space-y-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
            <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-700" />
              <span>Biriktirilgan ilmiy rahbar</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ro‘yxatdan tanlang:
              </label>
              <select
                value={supervisorId}
                onChange={e => setSupervisorId(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-xs"
              >
                <option value="">Biriktirilmagan</option>
                {supervisors.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.department || s.position})
                  </option>
                ))}
              </select>
            </div>

            {!supervisorId && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Yoki talaba kiritgan ilmiy rahbar ismi:
                </label>
                <input
                  type="text"
                  value={customSupervisorName}
                  onChange={e => setCustomSupervisorName(e.target.value)}
                  placeholder="Agar tizimda mavjud bo'lmasa, nomini kiriting"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-xs"
                />
              </div>
            )}
          </div>

          {/* Section 4: Yangi Parol (Ixtiyoriy) */}
          <div className="space-y-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
            <div className="flex items-center gap-2 text-amber-900">
              <Key className="w-4 h-4 text-amber-600 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Yangi parol o'rnatish (Ixtiyoriy)
              </h3>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Agar talaba parolini unutgan yoki o'zgartirishni so'ragan bo'lsa, bu yerga yangi parol kiriting.
              Bo'sh qoldirilsa, amaldagi parol o'zgarishsiz qoladi.
            </p>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Kamida 6 ta belgi (masalan: YangiParol2026)"
                className="w-full min-h-[44px] pl-3.5 pr-11 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600 shadow-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                title={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              id="save-student-changes-btn"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>O‘zgarishlarni saqlash</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
