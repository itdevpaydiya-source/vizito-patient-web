import React, { useState, useEffect } from 'react';
import { 
  MapPin, Video, MoreVertical, Calendar, Search, 
  X, Check, Film, Mic, MicOff, VideoOff, PhoneOff, 
  AlertCircle, ShieldCheck, Compass, Info 
} from 'lucide-react';
import { MOCK_PATIENT_APPOINTMENTS } from '../../../mocks/patientFlowMocks';

const MyConsultationsScreen = () => {
  // Tabs & Search State
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [appointments, setAppointments] = useState<any[]>([]);

  // Modal State
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [cancelConfirmApt, setCancelConfirmApt] = useState<any>(null);
  const [isVideoRoomOpen, setIsVideoRoomOpen] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callTimer, setCallTimer] = useState(0);

  // Load appointments from mock data combined with localStorage
  useEffect(() => {
    const loadAppointments = () => {
      try {
        const stored = localStorage.getItem('vizito_patient_appointments');
        const customAppointments = stored ? JSON.parse(stored) : [];
        
        // Standardize mock appointments
        const baseMocks = MOCK_PATIENT_APPOINTMENTS.map(apt => ({
          ...apt,
          status: apt.status || 'Upcoming'
        }));

        // Merge keeping custom ones first
        const merged = [...customAppointments, ...baseMocks];
        setAppointments(merged);
      } catch (err) {
        console.error('Error loading appointments:', err);
        setAppointments(MOCK_PATIENT_APPOINTMENTS);
      }
    };

    loadAppointments();
    // Watch for custom booking events from other screens
    window.addEventListener('storage', loadAppointments);
    return () => window.removeEventListener('storage', loadAppointments);
  }, []);

  // Timer for video call simulation
  useEffect(() => {
    let interval: any;
    if (isVideoRoomOpen) {
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [isVideoRoomOpen]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Status style mapping
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'upcoming':
      case 'scheduled':
        return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'cancelled':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Filter logic
  const filteredAppointments = appointments.filter(apt => {
    // Basic search match
    const matchesSearch = 
      apt.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      apt.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.clinicName.toLowerCase().includes(searchTerm.toLowerCase());

    // Type match
    const matchesType = 
      selectedType === 'All' || 
      apt.type.toLowerCase() === selectedType.toLowerCase();

    // Status / Tab division logic
    const isCancelled = apt.status.toLowerCase() === 'cancelled';
    const isCompleted = apt.status.toLowerCase() === 'completed';
    
    // Tab division
    const isUpcomingTab = activeTab === 'upcoming';
    const matchesTab = isUpcomingTab 
      ? (!isCancelled && !isCompleted) 
      : (isCancelled || isCompleted);

    // Status filter dropdown match
    const matchesStatus = 
      selectedStatus === 'All' || 
      apt.status.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesType && matchesTab && matchesStatus;
  });

  const handleCancelApt = (id: string) => {
    const updated = appointments.map(apt => {
      if (apt.id === id) {
        return { ...apt, status: 'Cancelled' };
      }
      return apt;
    });

    setAppointments(updated);
    // Write back to local storage if it was a user created appointment
    try {
      const stored = localStorage.getItem('vizito_patient_appointments');
      if (stored) {
        const parsed = JSON.parse(stored);
        const exists = parsed.some((a: any) => a.id === id);
        if (exists) {
          const updatedStored = parsed.map((a: any) => 
            a.id === id ? { ...a, status: 'Cancelled' } : a
          );
          localStorage.setItem('vizito_patient_appointments', JSON.stringify(updatedStored));
        }
      }
    } catch (e) {
      console.error(e);
    }
    setCancelConfirmApt(null);
  };

  const handleJoinCall = (apt: any) => {
    setSelectedApt(apt);
    setIsVideoRoomOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">My Consultations</h2>
          <p className="text-slate-500 mt-1">Review active, completed, or cancelled doctor consultations.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button 
          onClick={() => { setActiveTab('upcoming'); setSelectedStatus('All'); }}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'upcoming' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Consultations
        </button>
        <button 
          onClick={() => { setActiveTab('past'); setSelectedStatus('All'); }}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'past' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          History & Logs
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by doctor, clinic, or specialization..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-xs text-slate-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold text-slate-600 focus:ring-0 p-0 focus:outline-none cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Online">Online Video</option>
              <option value="In-Clinic">In-Clinic Visit</option>
            </select>
          </div>

          {activeTab === 'past' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent border-0 text-xs font-bold text-slate-600 focus:ring-0 p-0 focus:outline-none cursor-pointer"
              >
                <option value="All">All History</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Consultations List */}
      <div className="space-y-4 max-w-4xl">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((apt) => (
            <div key={apt.id} className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all group relative overflow-hidden">
              {/* Card visual status line */}
              <div className={`absolute left-0 top-0 w-1 h-full ${
                apt.status.toLowerCase() === 'cancelled' 
                  ? 'bg-rose-500' 
                  : apt.status.toLowerCase() === 'completed' 
                  ? 'bg-emerald-500' 
                  : 'bg-teal-500'
              }`}></div>

              {/* Date Block */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100 min-w-[100px] shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {apt.date === 'Today' ? 'Today' : apt.date.split(',')[0]}
                </span>
                <span className="text-xl font-black text-teal-600 my-0.5">{apt.time.split(' ')[0]}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{apt.time.split(' ')[1]}</span>
              </div>

              {/* Details Block */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                      {apt.doctorName}
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBadge(apt.status)}`}>
                        {apt.status}
                      </span>
                    </h4>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">{apt.specialty}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-100/60">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    {apt.type === 'Online' ? <Video className="w-4 h-4 text-teal-600" /> : <MapPin className="w-4 h-4 text-rose-600" />}
                    <span>{apt.type === 'Online' ? 'Online Consultation Room' : apt.clinicName}</span>
                  </div>

                  {/* Actions buttons dynamically mapped based on status */}
                  <div className="flex items-center gap-2">
                    {apt.status.toLowerCase() === 'upcoming' || apt.status.toLowerCase() === 'scheduled' ? (
                      <>
                        <button 
                          onClick={() => setCancelConfirmApt(apt)}
                          className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          Cancel Booking
                        </button>

                        {apt.type === 'Online' ? (
                          <button 
                            onClick={() => handleJoinCall(apt)}
                            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Join Video Call
                          </button>
                        ) : (
                          <button 
                            onClick={() => alert(`Showing Directions to: ${apt.clinicName}`)}
                            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <Compass className="w-3.5 h-3.5" />
                            Clinic Directions
                          </button>
                        )}
                      </>
                    ) : apt.status.toLowerCase() === 'completed' ? (
                      <button 
                        onClick={() => alert('Opening prescription pdf download...')}
                        className="text-xs font-bold text-teal-600 hover:underline"
                      >
                        Download Prescription & Bill
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-slate-300" />
                        Cancelled by patient
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-lg">No Consultations Found</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">There are no consultations fitting the current filters or search query.</p>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelConfirmApt && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            
            <div>
              <h4 className="font-black text-slate-800 text-lg">Cancel Consultation?</h4>
              <p className="text-xs font-semibold text-slate-400 mt-2 leading-relaxed">
                Are you sure you want to cancel your consultation with <span className="text-slate-700 font-bold">{cancelConfirmApt.doctorName}</span> scheduled for <span className="text-teal-600 font-bold">{cancelConfirmApt.date} at {cancelConfirmApt.time}</span>?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelConfirmApt(null)}
                className="w-1/2 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold"
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={() => handleCancelApt(cancelConfirmApt.id)}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dark Fullscreen Video consultation call Overlay */}
      {isVideoRoomOpen && selectedApt && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden animate-in fade-in duration-300">
          {/* Top Info Bar */}
          <div className="p-6 flex justify-between items-center bg-slate-900/40 border-b border-white/5 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
              <div>
                <h4 className="text-white font-extrabold text-sm">Viziito Tele-Consultation</h4>
                <p className="text-slate-400 text-xs mt-0.5">{selectedApt.doctorName} • Cardiologist</p>
              </div>
            </div>
            <div className="text-white bg-slate-800/80 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider">
              {formatTimer(callTimer)}
            </div>
          </div>

          {/* Video Grid Call Display */}
          <div className="flex-1 flex items-center justify-center p-6 relative">
            
            {/* Primary Remote video pane (Doctor preview) */}
            <div className="w-full max-w-3xl h-[60vh] bg-slate-900 rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center">
              {!isVideoOff ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 flex flex-col items-center justify-center">
                    {/* Ring Pulse animation for Connection placeholder */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-teal-500/20 rounded-full animate-ping scale-150 duration-1000"></div>
                      <div className="w-24 h-24 rounded-full bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400 font-extrabold text-2xl shadow-lg relative">
                        {selectedApt.doctorName.split(' ')[1]?.slice(0, 2) || 'DR'}
                      </div>
                    </div>
                    <span className="text-white font-extrabold text-base mt-6">Connecting to Doctor...</span>
                    <span className="text-slate-400 text-xs mt-1 animate-pulse">Establishing secure HD audio/video link</span>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <VideoOff className="w-12 h-12 text-slate-500 mx-auto" />
                  <p className="text-slate-400 font-bold text-sm">Your Camera is Off</p>
                </div>
              )}

              {/* Local Video Overlay Pane (User preview) */}
              <div className="absolute bottom-4 right-4 w-32 h-44 bg-slate-800 border border-white/10 rounded-2xl overflow-hidden shadow-lg flex flex-col items-center justify-center text-center z-20">
                <span className="text-white font-bold text-[10px] uppercase tracking-wider mb-2">My Feed</span>
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold font-mono">
                  MP
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Call Controls Panel */}
          <div className="p-8 bg-slate-950 border-t border-white/5 flex flex-col items-center space-y-4 shrink-0 relative z-10">
            <div className="flex items-center gap-6">
              {/* Mute Button */}
              <button
                type="button"
                onClick={() => setIsMicMuted(!isMicMuted)}
                className={`p-4 rounded-full transition-all ${
                  isMicMuted 
                    ? 'bg-rose-500 text-white hover:bg-rose-600' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* End Call Button */}
              <button
                type="button"
                onClick={() => setIsVideoRoomOpen(false)}
                className="p-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all shadow-lg shadow-rose-600/30 scale-110 active:scale-95"
                title="End Consultation"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              {/* Camera Button */}
              <button
                type="button"
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`p-4 rounded-full transition-all ${
                  isVideoOff 
                    ? 'bg-rose-500 text-white hover:bg-rose-600' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Film className="w-6 h-6" />}
              </button>
            </div>

            {/* Verification Security Badge */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold justify-center">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>End-to-End Encrypted Consultation Session • HIPAA Compliant</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyConsultationsScreen;
