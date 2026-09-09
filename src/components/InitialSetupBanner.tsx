import React, { useState } from 'react';
import { ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react';
import { initializeFirstSuperAdmin } from '../services/authService';
import { formatUzbekPhone } from '../lib/crypto';
import type { UserAccount } from '../types';

interface Props {
  onSuccess: (admin: UserAccount) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const InitialSetupBanner: React.FC<Props> = ({ onSuccess, onNotify }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatUzbekPhone(e.target.value));
  };

  const handleInitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const superAdmin = await initializeFirstSuperAdmin({
        fullName,
        phone,
        password,
      });
      onNotify('success', "Bosh Super Admin hisobi muvaffaqiyatli yaratildi va tizimga kirildi!");
      onSuccess(superAdmin);
    } catch (err: any) {
      onNotify('error', err.message || "Bosh Super Admin yaratishda xatolik yuz berdi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6 text-slate-800 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900">
              Dastlabki tizim sozlash (Super Admin yaratish)
            </h4>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Tizim ma'lumotlar bazasida hozircha bosh Super Admin mavjud emas. Xavfsiz ishlash uchun birinchi boshqaruvchini ro'yxatdan o'tkazing.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 shadow-xs"
        >
          <KeyRound className="w-4 h-4" />
          <span>Super Adminni sozlash</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-blue-100 text-blue-900 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bosh Super Admin sozlash</h3>
                <p className="text-xs text-slate-500">Tizimning to'liq huquqli boshqaruvchisi</p>
              </div>
            </div>

            <form onSubmit={handleInitSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  F.I.Sh. (Familiya, Ism, Sharif)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Karimov Alisher Baxtiyorovich"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Telefon raqami (Login sifatida)
                </label>
                <input
                  type="text"
                  required
                  placeholder="+998 (90) 123-45-67"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Xavfsiz parol (Kamida 6 belgi)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-xs"
                >
                  {isLoading ? (
                    <span>Saqlanmoqda...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Super Adminni faollashtirish</span>
                    </>
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
