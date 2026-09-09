import React from 'react';
import { GraduationCap, ShieldCheck, LogOut, User, Menu, X } from 'lucide-react';
import type { UserAccount, UserRole } from '../types';

interface Props {
  currentUser: UserAccount | null;
  onLogout: () => void;
  onOpenVerifyModal: () => void;
}

export const Navbar: React.FC<Props> = ({ currentUser, onLogout, onOpenVerifyModal }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'superAdmin':
        return { label: 'Super Admin', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'admin':
        return { label: 'Admin', className: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'supervisor':
        return { label: 'Ilmiy Rahbar', className: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'student':
      default:
        return { label: 'Talaba', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
  };

  const roleInfo = currentUser ? getRoleBadge(currentUser.role) : null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 safe-area-pt">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight block leading-tight truncate">
                IQTIDORLI TALABALAR
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium tracking-wide block truncate">
                Ilmiy-innovatsion platforma
              </span>
            </div>
          </div>

          {/* Desktop Right Controls */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onOpenVerifyModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-blue-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-2xs min-h-[44px]"
            >
              <ShieldCheck className="w-4 h-4 text-blue-900" />
              <span>Sertifikatni tekshirish</span>
            </button>

            {currentUser && roleInfo && (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold border border-slate-200 overflow-hidden shrink-0">
                    {currentUser.photoURL || (currentUser as any).avatarUrl ? (
                      <img
                        src={currentUser.photoURL || (currentUser as any).avatarUrl}
                        alt={currentUser.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      currentUser.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-semibold text-slate-900 block leading-tight truncate max-w-[150px]">
                      {currentUser.fullName}
                    </span>
                    <span
                      className={`inline-block px-1.5 py-0.2 text-[10px] font-semibold rounded-md border ${roleInfo.className}`}
                    >
                      {roleInfo.label}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="Tizimdan chiqish"
                  aria-label="Tizimdan chiqish"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile buttons */}
          <div className="md:hidden flex items-center gap-1.5 shrink-0">
            <button
              onClick={onOpenVerifyModal}
              className="min-w-[44px] min-h-[44px] p-2.5 text-slate-600 hover:text-blue-900 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center transition-colors active:scale-95"
              title="Sertifikatni tekshirish"
              aria-label="Sertifikatni tekshirish"
            >
              <ShieldCheck className="w-4 h-4 text-blue-900" />
            </button>

            {currentUser && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="min-w-[44px] min-h-[44px] p-2.5 text-slate-700 rounded-xl hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors active:scale-95"
                aria-label="Menyuni ochish"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && currentUser && roleInfo && (
          <div className="md:hidden py-3 px-2 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-2 bg-slate-50 p-3 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-white font-bold flex items-center justify-center text-sm shadow-xs overflow-hidden shrink-0">
                  {currentUser.photoURL || (currentUser as any).avatarUrl ? (
                    <img
                      src={currentUser.photoURL || (currentUser as any).avatarUrl}
                      alt={currentUser.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    currentUser.fullName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{currentUser.fullName}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{currentUser.phone}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${roleInfo.className}`}>
                {roleInfo.label}
              </span>
            </div>

            <div className="pt-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Tizimdan chiqish</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
