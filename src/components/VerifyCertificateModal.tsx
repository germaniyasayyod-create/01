import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, XCircle, Award, Calendar, User, ShieldCheck, X } from 'lucide-react';
import { getCertificateByNumber } from '../services/firestoreService';
import type { CertificateItem } from '../types';

interface Props {
  isOpen: boolean;
  initialCertId?: string;
  onClose: () => void;
}

export const VerifyCertificateModal: React.FC<Props> = ({
  isOpen,
  initialCertId = '',
  onClose,
}) => {
  const [certIdInput, setCertIdInput] = useState(initialCertId);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [certData, setCertData] = useState<CertificateItem | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialCertId) {
      setCertIdInput(initialCertId);
      performSearch(initialCertId);
    }
  }, [initialCertId]);

  const performSearch = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setErrorMessage('Iltimos, sertifikat raqamini kiriting.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSearched(true);
    setCertData(null);

    try {
      const result = await getCertificateByNumber(trimmed);
      if (result) {
        setCertData(result);
      } else {
        setErrorMessage(`"${trimmed}" raqamli sertifikat ma'lumotlar bazasidan topilmadi.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Tekshirishda xatolik yuz berdi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(certIdInput);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-900 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sertifikatni tekshirish</h3>
              <p className="text-xs text-slate-500">QR-kod yoki sertifikat unikal ID orqali verifikatsiya</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="mb-6">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Sertifikat ID raqami
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Masalan: CERT-2026-0001"
              value={certIdInput}
              onChange={e => setCertIdInput(e.target.value.toUpperCase())}
              className="w-full pl-4 pr-24 py-3 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !certIdInput.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              {isLoading ? (
                <span>Tekshirilmoqda...</span>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Tekshirish</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Verification Result */}
        {searched && !isLoading && (
          <div>
            {certData ? (
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Sertifikat haqiqiy va tasdiqlangan</span>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex items-start gap-2 text-slate-700">
                    <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 text-xs block">Talaba F.I.Sh.:</span>
                      <strong className="text-slate-900 text-base">{certData.studentName}</strong>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-slate-700">
                    <Award className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 text-xs block">Sertifikat nomi / Tadbir:</span>
                      <span className="text-slate-800 font-medium">
                        {certData.title} • {certData.eventTitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 text-xs block">Berilgan sana:</span>
                      <span className="text-slate-800 font-medium">{certData.issueDate}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-900">
                    <span>ID: <code className="font-mono font-bold">{certData.certificateNumber}</code></span>
                    <span className="px-2 py-0.5 bg-emerald-200/70 text-emerald-900 rounded-md font-medium text-[11px]">
                      Rasmiy ro‘yxatdan o‘tgan
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-center">
                <XCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-rose-900 mb-1">Sertifikat topilmadi</h4>
                <p className="text-xs text-rose-700 leading-relaxed">
                  {errorMessage || "Kiritilgan ID bo'yicha hech qanday sertifikat mavjud emas. Iltimos, raqamni to'g'ri kiritganingizni tekshiring."}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
