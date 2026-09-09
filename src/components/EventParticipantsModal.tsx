import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Calendar,
  MapPin,
  Clock,
  User,
  Phone,
} from 'lucide-react';
import type { EventItem, StudentProfile, SupervisorProfile, EventRegistration } from '../types';
import { subscribeEventRegistrations, getEventRegistrations } from '../services/firestoreService';
import { EmptyState } from './EmptyState';

interface EventParticipantsModalProps {
  isOpen: boolean;
  event: EventItem | null;
  students: StudentProfile[];
  supervisors: SupervisorProfile[];
  onClose: () => void;
  onOpenStudentProfile: (studentId: string) => void;
}

const PAGE_SIZE = 8;

export const EventParticipantsModal: React.FC<EventParticipantsModalProps> = ({
  isOpen,
  event,
  students,
  supervisors,
  onClose,
  onOpenStudentProfile,
}) => {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Real-time listener for event registrations
  useEffect(() => {
    if (!isOpen || !event?.id) {
      setRegistrations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setCurrentPage(1);
    setSearchQuery('');

    // First load fallback/current data once
    getEventRegistrations(event.id, students).then(initial => {
      setRegistrations(initial);
      setIsLoading(false);
    });

    // Attach real-time listener for live updates
    const unsubscribe = subscribeEventRegistrations(event.id, updatedList => {
      if (updatedList.length > 0) {
        setRegistrations(updatedList);
      } else if (event.participantIds && event.participantIds.length > 0) {
        // If event doc has legacy participantIds
        const fallback = event.participantIds.map(sid => {
          const st = students.find(s => s.id === sid);
          return {
            id: `${event.id}_${sid}`,
            eventId: event.id,
            studentId: sid,
            registeredAt: event.createdAt || new Date().toISOString(),
            status: 'Tasdiqlangan' as const,
            studentName: st?.fullName,
            studentPhone: st?.phone,
            studentCourse: st?.course,
            studentGroup: st?.group,
            studentFaculty: st?.facultyOrField,
          };
        });
        setRegistrations(fallback);
      } else {
        setRegistrations([]);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, event?.id, students]);

  if (!isOpen || !event) return null;

  // Resolve student details for each registration
  const enrichedParticipants = registrations.map(reg => {
    const student = students.find(s => s.id === reg.studentId);
    const supervisor = student?.supervisorId
      ? supervisors.find(sup => sup.id === student.supervisorId)
      : null;

    return {
      registration: reg,
      studentId: reg.studentId,
      fullName: student?.fullName || reg.studentName || 'Noma\'lum talaba',
      phone: student?.phone || reg.studentPhone || '',
      course: student?.course || reg.studentCourse || 1,
      group: student?.group || reg.studentGroup || '—',
      facultyOrField: student?.facultyOrField || reg.studentFaculty || '—',
      supervisorName: supervisor?.fullName || student?.customSupervisorName || reg.supervisorName || 'Biriktirilmagan',
      avatarUrl: student?.avatarUrl,
      registeredAt: reg.registeredAt,
    };
  });

  // Filter by search query (F.I.Sh., yo'nalish, guruh)
  const filteredParticipants = enrichedParticipants.filter(p => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      p.fullName.toLowerCase().includes(query) ||
      p.facultyOrField.toLowerCase().includes(query) ||
      p.group.toLowerCase().includes(query) ||
      p.supervisorName.toLowerCase().includes(query)
    );
  });

  // Pagination calculation
  const totalItems = filteredParticipants.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * PAGE_SIZE;
  const paginatedList = filteredParticipants.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div
      id="event-participants-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="event-participants-modal"
        className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900">
                <Users className="w-3.5 h-3.5" />
                <span>{registrations.length} ishtirokchi</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">
                • Real-time Firestore ro‘yxati
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              {event.title}
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {event.date} {event.time && `(${event.time})`}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {event.location}
              </span>
            </div>
          </div>

          <button
            id="close-event-participants-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors shrink-0"
            title="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Stats */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="event-participants-search-input"
              type="text"
              placeholder="F.I.Sh, yo‘nalish yoki guruh bo‘yicha qidirish..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>
          <div className="text-xs text-slate-500 shrink-0 font-medium">
            Jami: <strong className="text-slate-900">{filteredParticipants.length}</strong> nafar ishtirokchi
          </div>
        </div>

        {/* Body: Participant Cards List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Ishtirokchilar ro‘yxati yuklanmoqda...</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="py-8">
              <EmptyState
                title={
                  searchQuery.trim()
                    ? "Qidiruv bo‘yicha ishtirokchi topilmadi"
                    : "Bu tadbirga hali hech kim ro‘yxatdan o‘tmagan."
                }
                description={
                  searchQuery.trim()
                    ? "Iltimos, boshqa kalit so‘z orqali qidirib ko‘ring."
                    : "Talabalar o‘z kabinetlaridan ushbu tadbirga ro‘yxatdan o‘tganda ular avtomatik real-time paydo bo‘ladi."
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paginatedList.map(participant => (
                <div
                  key={participant.registration.id || participant.studentId}
                  id={`participant-card-${participant.studentId}`}
                  onClick={() => onOpenStudentProfile(participant.studentId)}
                  className="bg-slate-50/70 hover:bg-blue-50/50 rounded-2xl border border-slate-200 hover:border-blue-300 p-4 transition-all duration-150 flex flex-col justify-between cursor-pointer group shadow-2xs hover:shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                        {participant.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-950 truncate">
                            {participant.fullName}
                          </h4>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-900 rounded-md shrink-0">
                            {participant.course}-kurs
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {participant.facultyOrField}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-2.5 border border-slate-100 text-xs space-y-1 text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Guruh:</span>
                        <strong className="font-mono text-slate-800">{participant.group}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Ilmiy rahbar:</span>
                        <span className="font-medium text-slate-800 text-right truncate max-w-[170px]" title={participant.supervisorName}>
                          {participant.supervisorName}
                        </span>
                      </div>
                      {participant.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Aloqa:</span>
                          <span className="font-mono text-slate-700">{participant.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(participant.registeredAt).toLocaleDateString()}
                    </span>

                    <button
                      type="button"
                      id={`view-profile-btn-${participant.studentId}`}
                      onClick={e => {
                        e.stopPropagation();
                        onOpenStudentProfile(participant.studentId);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-900 bg-white hover:bg-blue-100/70 border border-blue-200 rounded-lg transition-colors group-hover:bg-blue-900 group-hover:text-white"
                    >
                      <span>Profilni ko‘rish</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 text-xs">
            <div className="text-slate-500">
              Sahifa <strong className="text-slate-900">{validCurrentPage}</strong> / {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <button
                id="event-participants-prev-page-btn"
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Oldingi</span>
              </button>

              <button
                id="event-participants-next-page-btn"
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors font-semibold"
              >
                <span>Keyingi</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
