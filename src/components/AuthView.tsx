import React, { useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, Lock, Phone, User, BookOpen, Users, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { loginWithPhone, registerStudent } from '../services/authService';
import { formatUzbekPhone } from '../lib/crypto';
import type { SupervisorProfile, UserAccount } from '../types';

interface Props {
  supervisors: SupervisorProfile[];
  onAuthSuccess: (user: UserAccount) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AuthView: React.FC<Props> = ({ supervisors = [], onAuthSuccess, onNotify }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginPhone, setLoginPhone] = useState('+998 ');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Register multi-step wizard state (1 to 4)
  const [regStep, setRegStep] = useState<1 | 2 | 3 | 4>(1);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('+998 ');
  const [regCourse, setRegCourse] = useState<number>(1);
  const [regGroup, setRegGroup] = useState('');
  const [regField, setRegField] = useState('');
  const [regSupervisorId, setRegSupervisorId] = useState('');
  const [regCustomSupervisor, setRegCustomSupervisor] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isRegLoading, setIsRegLoading] = useState(false);

  // Step validation error message
  const [stepError, setStepError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPhone.trim().length < 9) {
      onNotify('error', 'Iltimos, to‘g‘ri telefon raqamingizni kiriting.');
      return;
    }
    setIsLoginLoading(true);
    try {
      const user = await loginWithPhone(loginPhone, loginPassword);
      onNotify('success', `Xush kelibsiz, ${user.fullName}!`);
      onAuthSuccess(user);
    } catch (err: any) {
      onNotify('error', err.message || "Kirishda xatolik yuz berdi.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const validateCurrentStep = (step: number): boolean => {
    setStepError('');
    if (step === 1) {
      if (!regFullName.trim() || regFullName.trim().length < 3) {
        setStepError('F.I.Sh. kamida 3 ta harfdan iborat bo‘lishi shart.');
        return false;
      }
      if (regPhone.replace(/[^0-9]/g, '').length < 9) {
        setStepError('To‘g‘ri O‘zbekiston telefon raqamini kiriting (+998 ...).');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!regField.trim()) {
        setStepError('Ta’lim yo‘nalishi yoki mutaxassislikni kiriting.');
        return false;
      }
      if (!regGroup.trim()) {
        setStepError('Guruh raqamini kiriting (masalan: 314-22).');
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!regSupervisorId) {
        setStepError('Iltimos, ilmiy rahbaringizni tanlang yoki «Boshqa» bandini belgilang.');
        return false;
      }
      if (regSupervisorId === 'other' && !regCustomSupervisor.trim()) {
        setStepError('Iltimos, ilmiy rahbaringiz F.I.Sh. ni yozing.');
        return false;
      }
      return true;
    }
    if (step === 4) {
      if (regPassword.length < 6) {
        setStepError('Parol kamida 6 ta belgidan iborat bo‘lishi kerak.');
        return false;
      }
      if (regPassword !== regConfirmPassword) {
        setStepError('Parollar bir-biriga mos kelmadi.');
        return false;
      }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateCurrentStep(regStep)) {
      setStepError('');
      setRegStep(prev => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev));
    }
  };

  const prevStep = () => {
    setStepError('');
    setRegStep(prev => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep(4)) return;

    setIsRegLoading(true);
    try {
      const { user } = await registerStudent({
        fullName: regFullName.trim(),
        phone: regPhone.trim(),
        course: Number(regCourse),
        group: regGroup.trim(),
        facultyOrField: regField.trim(),
        supervisorId: regSupervisorId === 'other' ? '' : regSupervisorId,
        customSupervisorName: regSupervisorId === 'other' ? regCustomSupervisor.trim() : '',
        password: regPassword,
      });

      onNotify('success', "Ro'yxatdan muvaffaqiyatli o'tdingiz! Profilingiz faollashdi.");
      onAuthSuccess(user);
    } catch (err: any) {
      onNotify('error', err.message || "Ro'yxatdan o'tishda xatolik yuz berdi.");
    } finally {
      setIsRegLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden transition-all">
      {/* Header Tabs */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-100/80 border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            setActiveTab('login');
            setStepError('');
          }}
          className={`min-h-[44px] py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all ${
            activeTab === 'login'
              ? 'bg-white text-blue-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>Tizimga kirish</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('register');
            setStepError('');
          }}
          className={`min-h-[44px] py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all ${
            activeTab === 'register'
              ? 'bg-white text-blue-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Ro‘yxatdan o‘tish</span>
        </button>
      </div>

      <div className="p-4 sm:p-7">
        {activeTab === 'login' ? (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="text-center mb-5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Platformaga kirish</h2>
              <p className="text-xs text-slate-500 mt-1">
                Ro‘yxatdan o‘tgan telefon raqamingiz va parolingizni kiriting
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Telefon raqamingiz *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  required
                  placeholder="+998 (90) 123-45-67"
                  value={loginPhone}
                  onChange={e => setLoginPhone(formatUzbekPhone(e.target.value))}
                  className="w-full pl-10 pr-4 min-h-[44px] py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Parol *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-11 min-h-[44px] py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="w-10 h-10 flex items-center justify-center absolute right-1 top-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  aria-label={showLoginPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoginLoading}
                className="w-full min-h-[44px] py-3 px-4 bg-blue-900 hover:bg-blue-800 active:scale-[0.99] disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {isLoginLoading ? (
                  <span>Tekshirilmoqda...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Kirish</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Hisobingiz yo‘qmi?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setStepError('');
                  }}
                  className="text-blue-900 font-semibold hover:underline"
                >
                  Talaba sifatida ro‘yxatdan o‘ting
                </button>
              </p>
            </div>
          </form>
        ) : (
          /* MOBILE-FIRST REGISTRATION WIZARD */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Step Progress Indicators */}
            <div className="mb-4">
              <div className="flex items-center justify-between gap-1 mb-2">
                {[
                  { step: 1, label: 'Shaxsiy' },
                  { step: 2, label: 'Ta’lim' },
                  { step: 3, label: 'Rahbar' },
                  { step: 4, label: 'Parol' },
                ].map(s => (
                  <div
                    key={s.step}
                    onClick={() => {
                      if (s.step < regStep) setRegStep(s.step as 1 | 2 | 3 | 4);
                    }}
                    className={`flex-1 flex flex-col items-center cursor-pointer transition-all ${
                      regStep === s.step
                        ? 'text-blue-900 font-bold'
                        : regStep > s.step
                        ? 'text-emerald-700 font-semibold'
                        : 'text-slate-400 font-normal'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all ${
                        regStep === s.step
                          ? 'bg-blue-900 text-white shadow-xs'
                          : regStep > s.step
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {regStep > s.step ? <Check className="w-3.5 h-3.5" /> : s.step}
                    </div>
                    <span className="text-[10px] sm:text-xs truncate">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-900 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(regStep / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* Step error banner */}
            {stepError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                <span>⚠️ {stepError}</span>
              </div>
            )}

            {/* STEP 1: PERSONAL INFO */}
            {regStep === 1 && (
              <div className="space-y-3.5 animate-in fade-in">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">1-qadam: Shaxsiy ma’lumotlar</h3>
                  <p className="text-xs text-slate-500">Ism-familiyangiz va telefoningizni kiriting</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    F.I.Sh. (Familiya, Ism, Sharif) *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Masalan: Sobirov Jasur Omonovich"
                      value={regFullName}
                      onChange={e => setRegFullName(e.target.value)}
                      className="w-full pl-10 pr-4 min-h-[44px] py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Telefon raqami (Login sifatida ishlatiladi) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      required
                      placeholder="+998 (90) 123-45-67"
                      value={regPhone}
                      onChange={e => setRegPhone(formatUzbekPhone(e.target.value))}
                      className="w-full pl-10 pr-4 min-h-[44px] py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: EDUCATION */}
            {regStep === 2 && (
              <div className="space-y-3.5 animate-in fade-in">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">2-qadam: Ta’lim ma’lumotlari</h3>
                  <p className="text-xs text-slate-500">Kurs, yo‘nalish va guruhingizni belgilang</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Kurs *
                    </label>
                    <div className="relative">
                      <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <select
                        value={regCourse}
                        onChange={e => setRegCourse(Number(e.target.value))}
                        className="w-full pl-10 pr-8 min-h-[44px] py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                      >
                        <option value={1}>1-kurs (Bakalavr)</option>
                        <option value={2}>2-kurs (Bakalavr)</option>
                        <option value={3}>3-kurs (Bakalavr)</option>
                        <option value={4}>4-kurs (Bakalavr)</option>
                        <option value={5}>Magistratura</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Guruh *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Masalan: 314-22 DI"
                      value={regGroup}
                      onChange={e => setRegGroup(e.target.value)}
                      className="w-full px-3.5 min-h-[44px] py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 uppercase transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ta'lim yo'nalishi / Mutaxassislik *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Dasturiy injiniring"
                    value={regField}
                    onChange={e => setRegField(e.target.value)}
                    className="w-full px-3.5 min-h-[44px] py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: SUPERVISOR */}
            {regStep === 3 && (
              <div className="space-y-3.5 animate-in fade-in">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">3-qadam: Ilmiy rahbar</h3>
                  <p className="text-xs text-slate-500">Sizga biriktirilgan ilmiy rahbarni tanlang</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ilmiy rahbar *
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <select
                      value={regSupervisorId}
                      onChange={e => setRegSupervisorId(e.target.value)}
                      className="w-full pl-10 pr-8 min-h-[44px] py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                    >
                      <option value="">-- Ilmiy rahbarni tanlang --</option>
                      {supervisors.map(sup => (
                        <option key={sup.id} value={sup.id}>
                          {sup.fullName} ({sup.position || 'Kafedra'}, {sup.department || ''})
                        </option>
                      ))}
                      <option value="other">Boshqa (Ro‘yxatda bo‘lmasa)</option>
                    </select>
                  </div>

                  {regSupervisorId === 'other' && (
                    <div className="mt-2.5 animate-in fade-in">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Ilmiy rahbar F.I.Sh. (Admin keyin tasdiqlaydi)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ilmiy rahbar to‘liq ismini yozing"
                        value={regCustomSupervisor}
                        onChange={e => setRegCustomSupervisor(e.target.value)}
                        className="w-full px-3.5 min-h-[44px] py-2 text-base sm:text-sm bg-amber-50/60 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: PASSWORD */}
            {regStep === 4 && (
              <div className="space-y-3.5 animate-in fade-in">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">4-qadam: Xavfsizlik & Parol</h3>
                  <p className="text-xs text-slate-500">Hisobingiz uchun kuchli parol belgilang</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Parol (Kamida 6 belgi) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-11 min-h-[44px] py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="w-10 h-10 flex items-center justify-center absolute right-1 top-1 text-slate-400 hover:text-slate-600 rounded-lg"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Parolni tasdiqlash *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={e => setRegConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 min-h-[44px] py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Navigation Buttons */}
            <div className="pt-3 flex items-center gap-3 border-t border-slate-100">
              {regStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="min-h-[44px] px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Orqaga</span>
                </button>
              )}

              {regStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 min-h-[44px] py-2.5 px-4 bg-blue-900 hover:bg-blue-800 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 ml-auto"
                >
                  <span>Keyingisi</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isRegLoading}
                  className="flex-1 min-h-[44px] py-2.5 px-4 bg-blue-900 hover:bg-blue-800 active:scale-[0.99] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 ml-auto"
                >
                  {isRegLoading ? (
                    <span>Ro‘yxatdan o‘tkazilmoqda...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Ro‘yxatdan o‘tish</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                Akkauntingiz bormi?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setStepError('');
                  }}
                  className="text-blue-900 font-semibold hover:underline"
                >
                  Tizimga kiring
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
