import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Users, Clock, DollarSign, TrendingUp, ChevronDown, 
  MapPin, AlertCircle, CheckCircle2, FileText, Ban, UserPlus, 
  ChevronRight, CalendarDays, Siren, Bed, Activity, Search, ShieldCheck,
  Check, RefreshCw, X, ShieldAlert, AlertTriangle, UserCheck, Heart, Send
} from 'lucide-react';
import { 
  MOCK_BEDS, 
  MOCK_EMERGENCIES, 
  MOCK_DEPARTMENTS 
} from '../../mocks/hospitalFlowMocks';

interface Emergency {
  id: string;
  type: string;
  details: string;
  severity: string;
  time: string;
}

interface Appointment {
  time: string;
  patient: string;
  doctor: string;
  dept: string;
  type: string;
  status: string;
}

interface Doctor {
  name: string;
  dept: string;
  type: string;
  status: string;
}

export const HospitalDashboardEngine = () => {
  const navigate = useNavigate();
  
  const userString = localStorage.getItem('vizito_user');
  let hospitalName = 'Hospital Admin';
  if (userString) {
    try {
      const user = JSON.parse(userString);
      if (user?.fullName || user?.full_name) {
        hospitalName = user.fullName || user.full_name;
      }
    } catch (e) {
      console.error(e);
    }
  }
  
  // ─── FILTER STATES ──────────────────────────────────────────────────────────
  const [dateFilter, setDateFilter] = useState('Today, 14 May 2025');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showLocDropdown, setShowLocDropdown] = useState(false);
  
  // ─── LIVE DATA STATES ────────────────────────────────────────────────────────
  const [emergencies, setEmergies] = useState<Emergency[]>(MOCK_EMERGENCIES);
  const [bedsBreakdown, setBedsBreakdown] = useState(MOCK_BEDS.breakdown);
  const [bedViewMode, setBedViewMode] = useState<'percent' | 'available'>('percent');
  const [refreshTime, setRefreshTime] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Search & filter states
  const [apptSearch, setApptSearch] = useState('');
  const [apptDeptFilter, setApptDeptFilter] = useState('All');
  const [docSearch, setDocSearch] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState('All');

  // Chart interaction states
  const [revenueTimeframe, setRevenueTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [hoveredRevenueIndex, setHoveredRevenueIndex] = useState<number | null>(null);
  const [hoveredDonutIndex, setHoveredDonutIndex] = useState<number | null>(null);

  // Simulated notifications feed
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Trauma Team pre-alerted for incoming Ambulance.', type: 'critical', time: 'Just Now' },
    { id: 2, text: 'Dr. Priya Sharma marked availability for Cardiology.', type: 'info', time: '10m ago' },
    { id: 3, text: 'Ambulance Unit-04 dispatched to Sector 12.', type: 'dispatch', time: '15m ago' }
  ]);

  // Set initial refresh time
  useEffect(() => {
    const now = new Date();
    setRefreshTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, []);

  // ─── CORE METRICS CALCULATION (DYNAMIC BASED ON FILTERS) ───────────────────
  const getFilterMultiplier = () => {
    let mult = 1.0;
    if (locationFilter.includes('OPD')) mult = 0.6;
    else if (locationFilter.includes('ICU')) mult = 0.2;
    else if (locationFilter.includes('Emergency')) mult = 0.3;

    if (dateFilter.includes('Tomorrow')) mult *= 0.8;
    else if (dateFilter.includes('Yesterday')) mult *= 1.1;

    return mult;
  };

  const mult = getFilterMultiplier();
  const baseAppointments = 48;
  const baseDoctors = 16;
  const baseStaff = 38;
  const baseRevenue = 185450;

  const currentAppointments = Math.round(baseAppointments * mult);
  const currentDoctors = Math.max(1, Math.round(baseDoctors * (locationFilter === 'All Locations' ? 1 : 0.4)));
  const currentStaff = Math.max(2, Math.round(baseStaff * (locationFilter === 'All Locations' ? 1 : 0.5)));
  const currentRevenue = Math.round(baseRevenue * mult);

  // Sparkline data coordinates
  const sparklineData1 = "M0 18 Q10 8 20 14 T40 4 T60 16 T80 10 T100 2";
  const sparklineData2 = "M0 16 Q10 12 20 18 T40 10 T60 6 T80 14 T100 4";
  const sparklineData3 = "M0 14 Q10 16 20 10 T40 12 T60 4 T80 18 T100 8";
  const sparklineData4 = "M0 18 Q10 6 20 12 T40 14 T60 8 T80 10 T100 2";

  // ─── ACTION HANDLERS ────────────────────────────────────────────────────────
  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      setRefreshTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsRefreshing(false);
      addNotification('Dashboard metrics and sync logs refreshed.', 'info');
    }, 800);
  };

  const addNotification = (text: string, type: 'info' | 'critical' | 'dispatch' | 'success') => {
    const newNotif = {
      id: Date.now(),
      text,
      type,
      time: 'Just Now'
    };
    setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);
  };

  const simulateNewEmergency = () => {
    const types = ['Cardiac Arrest', 'Stroke Protocol', 'Pediatric Trauma', 'Severe Burns', 'Respiratory Distress'];
    const severities = ['Critical', 'Critical', 'High', 'High', 'Medium'];
    const details = [
      'ETA 4 mins, CPR in progress',
      'ETA 8 mins, Patient unresponsive',
      'Walk-in, Fall from 2nd floor',
      'ETA 6 mins, Chemical accident',
      'ETA 2 mins, Oxygen sat 84%'
    ];
    const randomIndex = Math.floor(Math.random() * types.length);
    
    const newEm: Emergency = {
      id: `em_${Date.now()}`,
      type: types[randomIndex],
      details: details[randomIndex],
      severity: severities[randomIndex],
      time: 'Just Now'
    };

    setEmergies(prev => [newEm, ...prev]);
    addNotification(`NEW CRITICAL CASE: ${newEm.type} - ${newEm.details}`, 'critical');
  };

  const resolveEmergency = (id: string, type: string) => {
    setEmergies(prev => prev.filter(e => e.id !== id));
    addNotification(`Case resolved and logged: ${type}`, 'success');
  };

  const prepareICUBed = (id: string, type: string) => {
    // Modify beds state to reflect one ICU bed being occupied
    setBedsBreakdown(prev => prev.map(bed => {
      if (bed.type === 'ICU' && bed.available > 0) {
        return {
          ...bed,
          occupied: bed.occupied + 1,
          available: bed.available - 1
        };
      }
      return bed;
    }));
    setEmergies(prev => prev.filter(e => e.id !== id));
    addNotification(`ICU Bed locked for incoming patient (${type}).`, 'success');
  };

  const assignGeneralBed = () => {
    let success = false;
    setBedsBreakdown(prev => prev.map(bed => {
      if (bed.type === 'General Ward' && bed.available > 0) {
        success = true;
        return {
          ...bed,
          occupied: bed.occupied + 1,
          available: bed.available - 1
        };
      }
      return bed;
    }));
    
    if (success) {
      addNotification('Walk-in patient admitted: General Ward bed assigned.', 'success');
    } else {
      addNotification('Error: General Ward bed capacity reached.', 'critical');
    }
  };

  const bookAmbulance = () => {
    addNotification('Ambulance Unit-08 booked & routed to Emergency location.', 'dispatch');
  };

  // ─── RAW SEED DATA ──────────────────────────────────────────────────────────
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([
    { time: '09:00 AM', patient: 'Rahul Verma', doctor: 'Dr. Priya Sharma', dept: 'Cardiology', type: 'In-Person', status: 'Scheduled' },
    { time: '09:30 AM', patient: 'Sneha Patel', doctor: 'Dr. Amit Singh', dept: 'Dermatology', type: 'In-Person', status: 'Scheduled' },
    { time: '10:00 AM', patient: 'Karan Mehta', doctor: 'Dr. Neha Gupta', dept: 'Orthopedics', type: 'In-Person', status: 'Scheduled' },
    { time: '10:30 AM', patient: 'Anjali Desai', doctor: 'Dr. Priya Sharma', dept: 'Cardiology', type: 'Online', status: 'Scheduled' },
    { time: '11:00 AM', patient: 'Vivek Joshi', doctor: 'Dr. Amit Singh', dept: 'Dermatology', type: 'In-Person', status: 'Scheduled' },
  ]);

  const [doctorAvailability, setDoctorAvailability] = useState<Doctor[]>([
    { name: 'Dr. Priya Sharma', dept: 'Cardiology', type: 'In-Person', status: 'Available' },
    { name: 'Dr. Amit Singh', dept: 'Dermatology', type: 'In-Person', status: 'Available' },
    { name: 'Dr. Neha Gupta', dept: 'Orthopedics', type: 'In-Person', status: 'Available' },
    { name: 'Dr. Rohit Verma', dept: 'Pediatrics', type: 'In-Person', status: 'On Leave' },
    { name: 'Dr. Seema Iyer', dept: 'Gynecology', type: 'In-Person', status: 'Available' },
  ]);

  const topDepartments = [
    { name: 'Cardiology', appointments: 325, revenue: '₹4,25,000' },
    { name: 'Dermatology', appointments: 280, revenue: '₹2,85,000' },
    { name: 'Orthopedics', appointments: 210, revenue: '₹2,15,000' },
    { name: 'Pediatrics', appointments: 190, revenue: '₹1,65,000' },
    { name: 'Gynecology', appointments: 175, revenue: '₹1,25,000' },
  ];

  // ─── INTERACTIVE DATA FILTERING ─────────────────────────────────────────────
  const filteredAppointments = upcomingAppointments.filter(app => {
    const matchesSearch = app.patient.toLowerCase().includes(apptSearch.toLowerCase()) || 
                          app.doctor.toLowerCase().includes(apptSearch.toLowerCase());
    const matchesDept = apptDeptFilter === 'All' || app.dept === apptDeptFilter;
    return matchesSearch && matchesDept;
  });

  const filteredDoctors = doctorAvailability.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(docSearch.toLowerCase()) || 
                          doc.dept.toLowerCase().includes(docSearch.toLowerCase());
    const matchesStatus = docStatusFilter === 'All' || doc.status === docStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleDoctorStatus = (name: string) => {
    setDoctorAvailability(prev => prev.map(doc => {
      if (doc.name === name) {
        const nextStatus = doc.status === 'Available' ? 'On Leave' : 'Available';
        addNotification(`${doc.name} status updated to ${nextStatus}.`, 'info');
        return { ...doc, status: nextStatus };
      }
      return doc;
    }));
  };

  // Chart data definitions
  const chartData = {
    weekly: {
      points: [
        { label: 'Mon', val: 120, x: 0, y: 68 },
        { label: 'Tue', val: 150, x: 30, y: 55 },
        { label: 'Wed', val: 130, x: 60, y: 62 },
        { label: 'Thu', val: 170, x: 90, y: 48 },
        { label: 'Fri', val: 190, x: 120, y: 42 },
        { label: 'Sat', val: 160, x: 150, y: 50 },
        { label: 'Sun', val: 240, x: 180, y: 20 },
      ],
      path: "M0 68 L30 55 L60 62 L90 48 L120 42 L150 50 L180 20",
      fill: "M0 68 L30 55 L60 62 L90 48 L120 42 L150 50 L180 20 L180 80 L0 80 Z"
    },
    monthly: {
      points: [
        { label: 'Week 1', val: 480, x: 0, y: 65 },
        { label: 'Week 2', val: 590, x: 60, y: 45 },
        { label: 'Week 3', val: 510, x: 120, y: 52 },
        { label: 'Week 4', val: 780, x: 180, y: 15 },
      ],
      path: "M0 65 L60 45 L120 52 L180 15",
      fill: "M0 65 L60 45 L120 52 L180 15 L180 80 L0 80 Z"
    }
  };

  const activeChart = chartData[revenueTimeframe];

  // Donut data calculations
  const donutData = [
    { label: 'Completed', value: 612, pct: 49, color: 'stroke-emerald-400 fill-none' },
    { label: 'Scheduled', value: 420, pct: 34, color: 'stroke-amber-400 fill-none' },
    { label: 'Cancelled', value: 128, pct: 10, color: 'stroke-rose-400 fill-none' },
    { label: 'No Show', value: 88, pct: 7, color: 'stroke-slate-400 fill-none' },
  ];

  return (
    <div className="space-y-6 animate-fade pb-10">
      
      {/* ─── GREETING HEADER ROW ───────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-sm">
        
        {/* Abstract shapes behind */}
        <div className="absolute top-0 right-0 w-80 h-full opacity-5 pointer-events-none bg-gradient-to-l from-purple-400 to-transparent" />

        <div className="space-y-4 z-10 w-full md:w-auto">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex flex-wrap items-center gap-2">
              Good Morning, {hospitalName}! 👋
            </h1>
            <p className="text-sm font-semibold text-slate-500 mt-1 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75`}></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Practice active: City Care Hospital control center
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-extrabold flex items-center gap-1 cursor-pointer hover:bg-slate-200 transition-colors" onClick={triggerRefresh}>
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
                Auto-Synced: {refreshTime}
              </span>
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date filter dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 transition-colors"
              >
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                {dateFilter}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>
              {showDateDropdown && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowDateDropdown(false)} />
                  <div className="absolute left-0 mt-1.5 w-48 bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-30 animate-fade">
                    {['Today, 14 May 2025', 'Tomorrow, 15 May 2025', 'Yesterday, 13 May 2025'].map(d => (
                      <button 
                        key={d} 
                        onClick={() => { setDateFilter(d); setShowDateDropdown(false); addNotification(`Date filter set to ${d}`, 'info'); }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-[#FFF2ED] hover:text-[#5C2494] transition-colors"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Location filter dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowLocDropdown(!showLocDropdown)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {locationFilter}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>
              {showLocDropdown && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowLocDropdown(false)} />
                  <div className="absolute left-0 mt-1.5 w-48 bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-30 animate-fade">
                    {['All Locations', 'Block A - OPD', 'Block B - ICU', 'Block C - Emergency'].map(l => (
                      <button 
                        key={l} 
                        onClick={() => { setLocationFilter(l); setShowLocDropdown(false); addNotification(`Location scope changed to ${l}`, 'info'); }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-[#FFF2ED] hover:text-[#5C2494] transition-colors"
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hospital Vector Illustration matching mockup */}
        <div className="relative w-72 h-32 md:h-36 shrink-0 z-10 flex items-end justify-center select-none group">
          <svg viewBox="0 0 280 140" className="w-full h-full transform group-hover:scale-[1.02] transition-transform duration-300">
            {/* Sun/Light Glow */}
            <circle cx="210" cy="40" r="28" fill="#FFF2ED" opacity="0.8" />
            <circle cx="210" cy="40" r="16" fill="#FFE5DB" opacity="0.5" />
            
            {/* Background Clouds */}
            <path d="M40 70 a10 10 0 0 1 18 -4 a15 15 0 0 1 26 4 z" fill="#F1F5F9" opacity="0.7" />
            <path d="M230 65 a8 8 0 0 1 14 -3 a12 12 0 0 1 20 3 z" fill="#F1F5F9" opacity="0.6" />

            {/* Background Trees */}
            <path d="M30 115 C30 100, 42 100, 42 115 Z" fill="#E2E8F0" />
            <circle cx="230" cy="98" r="16" fill="#FCE7F3" opacity="0.4" />
            <circle cx="230" cy="98" r="12" fill="#FFE4E6" opacity="0.3" />
            <circle cx="48" cy="106" r="10" fill="#FEF3C7" opacity="0.4" />

            {/* Hospital Building Base structure */}
            <rect x="70" y="50" width="130" height="65" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
            <rect x="95" y="32" width="80" height="83" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
            
            {/* Hospital Red Cross Logo */}
            <circle cx="135" cy="50" r="10" fill="#5C2494" className="animate-pulse" />
            <rect x="132" y="45" width="6" height="10" rx="1" fill="#FFFFFF" />
            <rect x="130" y="47" width="10" height="6" rx="1" fill="#FFFFFF" />

            {/* Windows grids */}
            <rect x="80" y="65" width="10" height="10" rx="2" fill="#FFE5DB" />
            <rect x="180" y="65" width="10" height="10" rx="2" fill="#FFE5DB" />
            <rect x="80" y="85" width="10" height="10" rx="2" fill="#FFF2ED" />
            <rect x="180" y="85" width="10" height="10" rx="2" fill="#FFF2ED" />

            <rect x="110" y="70" width="14" height="12" rx="2" fill="#F8FAFC" stroke="#E2E8F0" />
            <rect x="150" y="70" width="14" height="12" rx="2" fill="#F8FAFC" stroke="#E2E8F0" />
            
            {/* Entry Glass Doors */}
            <path d="M125 115 L125 102 C125 99, 145 99, 145 102 L145 115 Z" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5" />

            {/* Ground / Street */}
            <line x1="10" y1="115" x2="270" y2="115" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" />

            {/* Ambulance Van */}
            <g transform="translate(15, 0)">
              {/* Wheels */}
              <circle cx="160" cy="115" r="5" fill="#475569" />
              <circle cx="180" cy="115" r="5" fill="#475569" />
              {/* Body */}
              <rect x="145" y="93" width="45" height="20" rx="3" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
              <path d="M172 93 L188 93 C189 93, 190 94, 190 96 L188 105 L172 105 Z" fill="#FFE5DB" />
              {/* Details */}
              <rect x="155" y="99" width="10" height="8" rx="1" fill="#5C2494" opacity="0.9" />
              {/* Siren */}
              <circle cx="150" cy="91" r="2.5" fill="#EF4444" className="animate-ping" />
            </g>

            {/* Decorative Minimal Plants */}
            <circle cx="215" cy="113" r="5" fill="#FED7AA" />
            <circle cx="222" cy="114" r="4" fill="#FDBA74" />
            <circle cx="55" cy="113" r="5" fill="#CBD5E1" />
          </svg>
        </div>
      </div>

      {/* ─── LIVE EMERGENCY NOTIFIER / DISPATCH BOARD ──────────────────────── */}
      {emergencies.length > 0 && (
        <div className="bg-red-50/70 border border-red-200 rounded-3xl p-5 shadow-sm relative overflow-hidden animate-fade flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="absolute top-0 left-0 w-2 h-full bg-red-500 animate-pulse" />
          
          <div className="flex items-center gap-3.5 pl-2">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0 shadow-sm animate-bounce">
              <Siren className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-red-950 uppercase tracking-wide">ACTIVE CRITICAL DISPATCHES</h3>
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  {emergencies.length} CASES
                </span>
              </div>
              <p className="text-xs text-red-700 font-semibold mt-1 max-w-3xl">
                Immediate action required: {emergencies[0].type} ({emergencies[0].details}) - ETA {emergencies[0].time}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center">
            <button 
              onClick={() => prepareICUBed(emergencies[0].id, emergencies[0].type)}
              className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Bed className="w-3.5 h-3.5" /> Prepare ICU Bed
            </button>
            <button 
              onClick={() => resolveEmergency(emergencies[0].id, emergencies[0].type)}
              className="bg-white hover:bg-slate-50 border border-red-200 text-red-700 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95"
            >
              Resolve / Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── QUICK ACTIONS ROW ────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Command Center Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <button 
            onClick={simulateNewEmergency}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-red-50 hover:bg-red-100/80 border border-red-100 transition-all hover:scale-[1.03] active:scale-95 group shadow-xs w-full text-center cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center mb-2.5 shadow-sm group-hover:animate-pulse">
              <Siren className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-red-950">Trigger Emergency</span>
            <span className="text-[10px] text-red-600 font-semibold mt-1">Add Active ETA Case</span>
          </button>

          <button 
            onClick={assignGeneralBed}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 transition-all hover:scale-[1.03] active:scale-95 group shadow-xs w-full text-center cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-2.5 shadow-sm">
              <Bed className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-emerald-950">Admit Walk-in</span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1">Assign General Bed</span>
          </button>

          <button 
            onClick={bookAmbulance}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 transition-all hover:scale-[1.03] active:scale-95 group shadow-xs w-full text-center cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center mb-2.5 shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-indigo-950">Dispatch Ambulance</span>
            <span className="text-[10px] text-indigo-600 font-semibold mt-1">Route Rescue Vehicle</span>
          </button>

          <button 
            onClick={() => navigate('/appointments/create')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-purple-50 hover:bg-purple-100/80 border border-purple-100 transition-all hover:scale-[1.03] active:scale-95 group shadow-xs w-full text-center cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center mb-2.5 shadow-sm">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-purple-950">Add Doctor</span>
            <span className="text-[10px] text-purple-600 font-semibold mt-1">Config Availability</span>
          </button>

          <button 
            onClick={() => setBedViewMode(prev => prev === 'percent' ? 'available' : 'percent')}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/85 transition-all hover:scale-[1.03] active:scale-95 group shadow-xs w-full text-center col-span-2 md:col-span-1 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-600 text-white flex items-center justify-center mb-2.5 shadow-sm">
              <RefreshCw className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-slate-850">Toggle Bed View</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1">{bedViewMode === 'percent' ? 'Show Available count' : 'Show Occupancy %'}</span>
          </button>
        </div>
      </div>

      {/* ─── STAT CARDS ROW ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Today's Appointments */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover-grow">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl translate-x-4 -translate-y-4" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Appointments</span>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{currentAppointments}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FFF2ED] flex items-center justify-center text-[#5C2494] shrink-0 shadow-xs border border-[#E9D5FF]">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 z-10">
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> ↑ 18% <span className="text-slate-400 font-semibold">vs yesterday</span>
            </span>
            {/* Sparkline */}
            <svg className="w-20 h-8 text-[#5C2494]" viewBox="0 0 100 20" fill="none">
              <path d={sparklineData1} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: Active Doctors */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover-grow">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl translate-x-4 -translate-y-4" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-extrabold">Active Doctors</span>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{currentDoctors}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7]/40 flex items-center justify-center text-amber-500 shrink-0 shadow-xs border border-amber-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 z-10">
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> ↑ 14% <span className="text-slate-400 font-semibold">vs yesterday</span>
            </span>
            {/* Sparkline */}
            <svg className="w-20 h-8 text-amber-500" viewBox="0 0 100 20" fill="none">
              <path d={sparklineData2} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 3: Staff Available */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover-grow">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl translate-x-4 -translate-y-4" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-extrabold font-sans">Staff Active</span>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{currentStaff}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs border border-indigo-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 z-10">
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> ↑ 8% <span className="text-slate-400 font-semibold">vs yesterday</span>
            </span>
            {/* Sparkline */}
            <svg className="w-20 h-8 text-indigo-500" viewBox="0 0 100 20" fill="none">
              <path d={sparklineData3} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 4: Daily Revenue */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover-grow">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl translate-x-4 -translate-y-4" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-extrabold">Scope Revenue</span>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">₹{currentRevenue.toLocaleString()}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#E6F4EA] flex items-center justify-center text-emerald-600 shrink-0 shadow-xs border border-emerald-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 z-10">
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> ↑ 22% <span className="text-slate-400 font-semibold">vs yesterday</span>
            </span>
            {/* Sparkline */}
            <svg className="w-20 h-8 text-emerald-500" viewBox="0 0 100 20" fill="none">
              <path d={sparklineData4} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

      </div>

      {/* ─── MIDDLE CONTENT GRID ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Upcoming Appointments (Spans 5 Cols) */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-2">
              <h3 className="text-base font-extrabold text-slate-800">Upcoming Appointments</h3>
              
              <div className="flex items-center gap-2">
                {/* Department filter */}
                <select 
                  value={apptDeptFilter}
                  onChange={(e) => setApptDeptFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 outline-none cursor-pointer"
                >
                  <option value="All">All Depts</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Orthopedics">Orthopedics</option>
                </select>

                <button onClick={() => navigate('/appointments')} className="text-xs font-bold text-[#5C2494] hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-3.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by Patient or Doctor..."
                value={apptSearch}
                onChange={(e) => setApptSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-purple-400"
              />
              {apptSearch && (
                <button className="absolute right-2.5 top-1/2 -translate-y-1/2" onClick={() => setApptSearch('')}>
                  <X className="w-3 h-3 text-slate-400 hover:text-slate-650" />
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-550 font-semibold">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Patient</th>
                    <th className="pb-2">Doctor</th>
                    <th className="pb-2">Department</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((app, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 font-extrabold text-slate-700">{app.time}</td>
                        <td className="py-2.5 font-bold text-slate-800">{app.patient}</td>
                        <td className="py-2.5 text-slate-600">{app.doctor}</td>
                        <td className="py-2.5"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{app.dept}</span></td>
                        <td className="py-2.5 text-right">
                          <span className="bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5 font-black text-[9px]">
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 font-semibold">No matching appointments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="text-center pt-3 border-t border-slate-100 mt-2">
            <button onClick={() => navigate('/appointments')} className="text-xs font-bold text-[#5C2494] hover:underline inline-flex items-center gap-1 cursor-pointer">
              Go to Appointments module →
            </button>
          </div>
        </div>

        {/* Doctor Availability (Spans 4 Cols) */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-2">
              <h3 className="text-base font-extrabold text-slate-800">Doctor Availability</h3>
              <div className="flex items-center gap-2">
                <select 
                  value={docStatusFilter}
                  onChange={(e) => setDocStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 outline-none cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Available">Available</option>
                  <option value="On Leave">On Leave</option>
                </select>
                <button onClick={() => navigate('/availability')} className="text-xs font-bold text-[#5C2494] hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Doctor Search */}
            <div className="relative mb-3.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search doctors or specialties..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-purple-400"
              />
              {docSearch && (
                <button className="absolute right-2.5 top-1/2 -translate-y-1/2" onClick={() => setDocSearch('')}>
                  <X className="w-3 h-3 text-slate-400 hover:text-slate-650" />
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-550 font-semibold">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">
                    <th className="pb-2">Doctor</th>
                    <th className="pb-2">Department</th>
                    <th className="pb-2 text-right">Status Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDoctors.length > 0 ? (
                    filteredDoctors.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 font-bold text-slate-800">{doc.name}</td>
                        <td className="py-2.5 text-slate-400">{doc.dept}</td>
                        <td className="py-2.5 text-right">
                          <button 
                            onClick={() => toggleDoctorStatus(doc.name)}
                            className={`rounded-full px-2.5 py-0.5 font-black text-[9px] border transition-colors cursor-pointer ${
                              doc.status === 'Available' 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' 
                                : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                            }`}
                            title="Click to toggle status"
                          >
                            {doc.status}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400 font-semibold">No doctors matching criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="text-center pt-3 border-t border-slate-100 mt-2">
            <button onClick={() => navigate('/availability')} className="text-xs font-bold text-[#5C2494] hover:underline inline-flex items-center gap-1 cursor-pointer">
              Go to Availability roster →
            </button>
          </div>
        </div>

        {/* Live Logs / Recent Activities (Spans 3 Cols) */}
        <div className="col-span-12 lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-extrabold text-slate-800">Live Operation Log</h3>
              <button onClick={() => setNotifications([])} className="text-[10px] font-bold text-slate-400 hover:text-slate-650 cursor-pointer">Clear all</button>
            </div>
            <div className="space-y-3.5 overflow-y-auto max-h-[220px] pr-1 modal-scrollbar">
              {notifications.length > 0 ? (
                notifications.map((act) => (
                  <div key={act.id} className="flex gap-2.5 items-start animate-fade">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs border ${
                      act.type === 'critical' ? 'bg-red-50 text-red-500 border-red-100' :
                      act.type === 'dispatch' ? 'bg-indigo-50 text-indigo-500 border-indigo-100' :
                      act.type === 'success' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                      'bg-[#FAF5FF] text-purple-500 border-purple-100'
                    }`}>
                      {act.type === 'critical' ? <Siren className="w-3.5 h-3.5" /> :
                       act.type === 'dispatch' ? <Activity className="w-3.5 h-3.5" /> :
                       act.type === 'success' ? <Check className="w-3.5 h-3.5" /> :
                       <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 leading-tight break-words">{act.text}</p>
                      <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">{act.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 font-semibold flex flex-col items-center">
                  <ShieldCheck className="w-8 h-8 text-slate-200 mb-2" />
                  No events logged. Operations normal.
                </div>
              )}
            </div>
          </div>
          <div className="text-center pt-3 border-t border-slate-100 mt-4">
            <button onClick={() => navigate('/notifications')} className="text-xs font-bold text-[#5C2494] hover:underline inline-flex items-center gap-1 cursor-pointer">
              Open Alerts Center →
            </button>
          </div>
        </div>

      </div>

      {/* ─── BOTTOM CHARTS & BEDS ROW ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Revenue Overview Line Chart (Spans 5 Cols) */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-base font-extrabold text-slate-800">Financial Overview</h3>
            
            <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-0.5">
              <button 
                onClick={() => setRevenueTimeframe('weekly')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-black transition-colors cursor-pointer ${revenueTimeframe === 'weekly' ? 'bg-white text-purple-750 shadow-xs' : 'text-slate-400 hover:text-slate-650'}`}
              >
                Weekly
              </button>
              <button 
                onClick={() => setRevenueTimeframe('monthly')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-black transition-colors cursor-pointer ${revenueTimeframe === 'monthly' ? 'bg-white text-purple-750 shadow-xs' : 'text-slate-400 hover:text-slate-650'}`}
              >
                Monthly
              </button>
            </div>
          </div>
          
          <div className="space-y-1 mb-4 relative">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Projected Revenue</span>
            <div className="flex items-end gap-2">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                ₹{hoveredRevenueIndex !== null ? (activeChart.points[hoveredRevenueIndex].val * 1000).toLocaleString() : (currentRevenue * 6.5).toLocaleString()}
              </h2>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center mb-1 gap-0.5">
                <TrendingUp className="w-3 h-3" /> ↑ 16% <span className="text-slate-400 font-semibold">from last scope</span>
              </span>
            </div>
            {hoveredRevenueIndex !== null && (
              <span className="absolute right-0 top-0 text-[10px] font-extrabold bg-purple-50 text-purple-750 border border-purple-100 rounded px-2 py-0.5 animate-fade">
                {activeChart.points[hoveredRevenueIndex].label}: ₹{(activeChart.points[hoveredRevenueIndex].val * 1000).toLocaleString()}
              </span>
            )}
          </div>

          {/* SVG line chart with hover guidelines */}
          <div className="w-full relative pt-2 select-none">
            <svg viewBox="0 0 180 80" className="w-full h-24 overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="dashboardRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.00" />
                </linearGradient>
                <filter id="svgGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              
              {/* Horizontal gridlines */}
              <line x1="0" y1="20" x2="180" y2="20" stroke="#F1F5F9" strokeWidth="0.8" strokeDasharray="2,2" />
              <line x1="0" y1="40" x2="180" y2="40" stroke="#F1F5F9" strokeWidth="0.8" strokeDasharray="2,2" />
              <line x1="0" y1="60" x2="180" y2="60" stroke="#F1F5F9" strokeWidth="0.8" strokeDasharray="2,2" />
              
              {/* Chart area fill */}
              <path d={activeChart.fill} fill="url(#dashboardRevenueGrad)" className="transition-all duration-300" />
              
              {/* Chart Line */}
              <path d={activeChart.path} fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" filter="url(#svgGlow)" className="transition-all duration-300" />
              
              {/* Interactive Tooltip Guideline */}
              {hoveredRevenueIndex !== null && (
                <>
                  <line 
                    x1={activeChart.points[hoveredRevenueIndex].x} 
                    y1={10} 
                    x2={activeChart.points[hoveredRevenueIndex].x} 
                    y2={75} 
                    stroke="#D8B4FE" 
                    strokeWidth="1" 
                    strokeDasharray="2,2" 
                  />
                  <circle 
                    cx={activeChart.points[hoveredRevenueIndex].x} 
                    cy={activeChart.points[hoveredRevenueIndex].y} 
                    r="4" 
                    fill="#7C3AED" 
                    stroke="#FFFFFF" 
                    strokeWidth="1.5" 
                  />
                </>
              )}

              {/* Hover detection zones */}
              {activeChart.points.map((pt, i) => (
                <rect 
                  key={i}
                  x={pt.x - 10} 
                  y={0} 
                  width={20} 
                  height={80} 
                  fill="transparent" 
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredRevenueIndex(i)}
                  onMouseLeave={() => setHoveredRevenueIndex(null)}
                />
              ))}
            </svg>
            <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 px-0.5">
              {activeChart.points.map((pt, i) => (
                <span key={i} className={hoveredRevenueIndex === i ? 'text-purple-600 font-extrabold' : ''}>
                  {pt.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Bed Occupancy Tracker (Spans 4 Cols) */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Bed className="w-4 h-4 text-purple-500" />
                <h3 className="text-base font-extrabold text-slate-800">Bed Occupancy</h3>
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                {Math.round((bedsBreakdown.reduce((acc, curr) => acc + curr.occupied, 0) / bedsBreakdown.reduce((acc, curr) => acc + curr.total, 0)) * 100)}% Full
              </span>
            </div>

            <div className="space-y-4 py-1">
              {bedsBreakdown.map((bed, idx) => {
                const percentage = Math.round((bed.occupied / bed.total) * 100);
                const isCritical = percentage >= 85;
                const isWarning = percentage >= 70 && percentage < 85;
                
                let progressColor = 'bg-emerald-500';
                let textColor = 'text-emerald-600';
                let cardBorder = 'hover:border-emerald-300';
                if (isCritical) {
                  progressColor = 'bg-red-500';
                  textColor = 'text-red-600';
                  cardBorder = 'hover:border-red-300';
                } else if (isWarning) {
                  progressColor = 'bg-amber-500';
                  textColor = 'text-amber-600';
                  cardBorder = 'hover:border-amber-300';
                }

                return (
                  <div key={idx} className={`p-2.5 rounded-xl border border-slate-100 transition-all ${cardBorder} hover:shadow-xs group`}>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                      <span className="flex items-center gap-1 group-hover:text-purple-700 transition-colors">
                        {bed.type}
                      </span>
                      <span className={`${textColor} font-black`}>
                        {bedViewMode === 'percent' 
                          ? `${percentage}%` 
                          : `${bed.available} Avail / ${bed.total} Total`
                        }
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`${progressColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-center pt-2.5 border-t border-slate-100 mt-2">
            <button onClick={() => navigate('/hospital-beds')} className="text-xs font-bold text-[#5C2494] hover:underline inline-flex items-center gap-1 cursor-pointer">
              Open Bed Allocator →
            </button>
          </div>
        </div>

        {/* Appointments Overview Donut & Legend (Spans 3 Cols) */}
        <div className="col-span-12 lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-extrabold text-slate-800">Status Ratio</h3>
              <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded">Ratio</span>
            </div>

            <div className="flex flex-col items-center justify-center py-2.5 gap-4">
              {/* SVG Donut Chart */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center group">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  {/* Base slice */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F1F5F9" strokeWidth="4.2" />
                  
                  {/* Completed (49%) - Starts at 0 offset */}
                  <circle 
                    cx="18" cy="18" r="15.915" 
                    className="stroke-[#34D399] fill-none transition-all duration-300 cursor-pointer hover:stroke-emerald-500" 
                    strokeWidth={hoveredDonutIndex === 0 ? "5.2" : "4.2"}
                    strokeDasharray="49 51" 
                    strokeDashoffset="0" 
                    onMouseEnter={() => setHoveredDonutIndex(0)}
                    onMouseLeave={() => setHoveredDonutIndex(null)}
                  />
                  
                  {/* Scheduled (34%) - Starts at -49 */}
                  <circle 
                    cx="18" cy="18" r="15.915" 
                    className="stroke-[#FBBF24] fill-none transition-all duration-300 cursor-pointer hover:stroke-amber-500" 
                    strokeWidth={hoveredDonutIndex === 1 ? "5.2" : "4.2"}
                    strokeDasharray="34 66" 
                    strokeDashoffset="-49" 
                    onMouseEnter={() => setHoveredDonutIndex(1)}
                    onMouseLeave={() => setHoveredDonutIndex(null)}
                  />
                  
                  {/* Cancelled (10%) - Starts at -83 */}
                  <circle 
                    cx="18" cy="18" r="15.915" 
                    className="stroke-[#FB7185] fill-none transition-all duration-300 cursor-pointer hover:stroke-rose-500" 
                    strokeWidth={hoveredDonutIndex === 2 ? "5.2" : "4.2"}
                    strokeDasharray="10 90" 
                    strokeDashoffset="-83" 
                    onMouseEnter={() => setHoveredDonutIndex(2)}
                    onMouseLeave={() => setHoveredDonutIndex(null)}
                  />
                  
                  {/* No Show (7%) - Starts at -93 */}
                  <circle 
                    cx="18" cy="18" r="15.915" 
                    className="stroke-[#94A3B8] fill-none transition-all duration-300 cursor-pointer hover:stroke-slate-500" 
                    strokeWidth={hoveredDonutIndex === 3 ? "5.2" : "4.2"}
                    strokeDasharray="7 93" 
                    strokeDashoffset="-93" 
                    onMouseEnter={() => setHoveredDonutIndex(3)}
                    onMouseLeave={() => setHoveredDonutIndex(null)}
                  />
                </svg>
                {/* Central counter */}
                <div className="absolute text-center select-none pointer-events-none">
                  {hoveredDonutIndex !== null ? (
                    <>
                      <span className="block text-base font-black text-slate-800 leading-none">{donutData[hoveredDonutIndex].value}</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide mt-1 block">
                        {donutData[hoveredDonutIndex].label}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block text-lg font-black text-slate-800 leading-none">1,248</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1 block">Total</span>
                    </>
                  )}
                </div>
              </div>

              {/* Donut Legend */}
              <div className="w-full space-y-1.5 text-xs font-semibold text-slate-650">
                {donutData.map((item, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-1 rounded-lg transition-colors cursor-pointer ${
                      hoveredDonutIndex === i ? 'bg-slate-50 text-slate-900 font-extrabold' : ''
                    }`}
                    onMouseEnter={() => setHoveredDonutIndex(i)}
                    onMouseLeave={() => setHoveredDonutIndex(null)}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        i === 0 ? 'bg-emerald-400' :
                        i === 1 ? 'bg-amber-400' :
                        i === 2 ? 'bg-rose-400' :
                        'bg-slate-400'
                      }`} /> 
                      {item.label}
                    </span>
                    <span className="font-extrabold text-[10px]">{item.value} ({item.pct}%)</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
          <div className="text-center pt-2.5 border-t border-slate-100 mt-2">
            <span className="text-[10px] text-slate-400 font-extrabold">Hover slices to inspect data metrics</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default HospitalDashboardEngine;
