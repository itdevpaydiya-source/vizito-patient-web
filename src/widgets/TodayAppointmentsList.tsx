import React from 'react';
import { MOCK_APPOINTMENTS } from '../mocks/doctorFlowMocks';
import { Video, Building2, ChevronRight, Play, ArrowRight, Plus, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const statusConfig: Record<string, { bg: string; text: string }> = {
  Confirmed: { bg: 'bg-[#FEF3C7]/40 border border-[#D97706]/20', text: 'text-[#D97706]' },
  Upcoming: { bg: 'bg-[#FAF5FF] border border-[#E9D5FF]/30', text: 'text-[#5C2494]' },
  Pending: { bg: 'bg-[#FEF3C7]/40 border border-[#D97706]/20', text: 'text-[#D97706]' },
  'Consultation Started': { bg: 'bg-emerald-50 border border-emerald-200/50', text: 'text-emerald-600' },
  Completed: { bg: 'bg-slate-100 border border-slate-200/50', text: 'text-slate-600' },
  Cancelled: { bg: 'bg-rose-50 border border-rose-200/40', text: 'text-rose-500' },
  'No Show': { bg: 'bg-slate-50 border border-slate-200/30', text: 'text-slate-400' },
};

interface TodayAppointmentsListProps {
  selectedClinic: string | null;
}

const TodayAppointmentsList: React.FC<TodayAppointmentsListProps> = ({ selectedClinic }) => {
  const navigate = useNavigate();

  // Helper to parse time string (e.g. "09:30 AM") into minutes for sorting
  const timeToMinutes = (timeStr: string) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Filter and sort appointments
  const filteredAppointments = MOCK_APPOINTMENTS
    .filter(app => !selectedClinic || app.clinicId === selectedClinic)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  // Constrain to maximum 5 records
  const displayAppointments = filteredAppointments.slice(0, 5);

  const handleWidgetHeaderClick = () => {
    navigate('/appointments?date=today');
  };

  return (
    <div className="glass-panel overflow-hidden flex flex-col h-full hover-grow card-glow-secondary">
      {/* Header (Entire widget clickable to Appointment Management) */}
      <div 
        onClick={handleWidgetHeaderClick}
        className="px-5 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-all group"
      >
        <h3 className="text-base font-bold text-[#2B2B2B] group-hover:text-[#5C2494] transition-colors">
          Today's Appointments
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/appointments?date=today');
          }}
          className="text-xs font-bold text-[#5C2494] hover:text-[#7C3AED] flex items-center gap-1 transition-colors"
        >
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List / Empty State */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[300px] flex flex-col justify-between">
        {displayAppointments.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No appointments scheduled for today.</p>
            <button
              onClick={() => navigate('/appointments/create')}
              className="mt-4 flex items-center justify-center gap-1.5 bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-[#5C2494]/20 text-[#5C2494] px-4 py-2 rounded-xl text-xs font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Consultation
            </button>
          </div>
        ) : (
          /* Appointments List */
          <div className="divide-y divide-slate-100 flex-1">
            {displayAppointments.map(app => {
              const status = statusConfig[app.status] ?? { bg: 'bg-slate-100', text: 'text-slate-600' };
              const isVideo = app.type.toLowerCase().includes('video');

              // Determine actions based on status
              const showStart = ['Confirmed', 'Checked In', 'Pending'].includes(app.status);
              const showContinue = app.status === 'Consultation Started';
              const showPrescription = app.status === 'Completed';

              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50/40 border-l-2 border-transparent hover:border-l-[#5C2494] transition-all cursor-pointer group"
                  onClick={() => navigate(`/appointments/${app.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Left vertical bar */}
                    <div className="w-0.5 h-10 bg-gradient-to-b from-[#5C2494] to-[#7C3AED] rounded-full shrink-0" />

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-[#FAF5FF] border border-[#DEDFE0] flex items-center justify-center shrink-0 overflow-hidden">
                      <span className="text-xs font-bold text-[#5F6368]">{app.initials}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#2B2B2B] truncate">{app.patientName}</span>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${status.bg} ${status.text}`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[#737379] font-semibold">{app.time}</span>
                        <span className="text-slate-200 text-xs">•</span>
                        <span className="flex items-center gap-1 text-[11px] text-[#5F6368] font-medium">
                          {isVideo
                            ? <Video className="w-3 h-3 text-[#5C2494]" />
                            : <Building2 className="w-3 h-3 text-[#7C3AED]" />
                          }
                          {app.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Starts/Continues/Prescriptions) */}
                  <div className="flex items-center gap-2 shrink-0">
                    {showStart && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/appointments/${app.id}/consultation`);
                        }}
                        className="bg-gradient-to-r from-[#5C2494] to-[#7C3AED] hover:opacity-95 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm shadow-purple-500/10"
                      >
                        Start Consultation
                      </button>
                    )}
                    {showContinue && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/appointments/${app.id}/consultation`);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm"
                      >
                        Continue Consultation
                      </button>
                    )}
                    {showPrescription && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/prescriptions');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                      >
                        View Prescription
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayAppointmentsList;
