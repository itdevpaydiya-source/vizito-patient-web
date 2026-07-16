import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Plus, ChevronDown, Calendar, Video, Building2, Home,
  ChevronLeft, ChevronRight, MoreVertical, X,
  Phone, Clock, MapPin, CreditCard, MessageSquare,
  FileText, RotateCcw, Ban, Stethoscope, CheckCircle2,
  Filter, CalendarDays, ListFilter, Search, AlertCircle, FileUp
} from 'lucide-react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

// ─── External Types & Mock Data ───────────────────────────────────────────────
import { INITIAL_APPOINTMENTS } from './mockAppointments';
import type {
  TimelineEntry,
  Medicine,
  Prescription,
  Appointment
} from './mockAppointments';

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  Pending: { bg: 'bg-amber-50 border border-amber-200/50', text: 'text-amber-700' },
  Confirmed: { bg: 'bg-emerald-50 border border-emerald-200/50', text: 'text-emerald-700' },
  'Checked In': { bg: 'bg-teal-50 border border-teal-200/50', text: 'text-teal-700' },
  'Consultation Started': { bg: 'bg-indigo-50 border border-indigo-200/50', text: 'text-indigo-700' },
  Completed: { bg: 'bg-slate-100 border border-slate-200/50', text: 'text-slate-600' },
  Cancelled: { bg: 'bg-rose-50 border border-rose-200/50', text: 'text-rose-600' },
  'No Show': { bg: 'bg-slate-50 border border-slate-200/30', text: 'text-slate-400' },
};

const PAYMENT_CONFIG: Record<string, { bg: string; text: string }> = {
  Paid: { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700' },
  Pending: { bg: 'bg-amber-50 text-amber-600', text: 'text-amber-700' },
  Waived: { bg: 'bg-slate-100 text-slate-500', text: 'text-slate-500' },
};

const CLINIC_FILTER_OPTIONS = ['Last Selected Clinic', 'All Clinics', 'Own Clinic', 'Associated Clinics'];
const TYPE_FILTER_OPTIONS = ['All', 'Walk-In', 'In-Clinic', 'Video Consultation', 'Home Visit'];
const DATE_FILTER_OPTIONS = ['Today', 'Yesterday', 'Tomorrow', 'This Week', 'This Month', 'Custom Range'];
const STATUS_FILTER_OPTIONS = ['All', 'Pending', 'Confirmed', 'Checked In', 'Consultation Started', 'Completed', 'Cancelled', 'No Show'];
const SORT_FILTER_OPTIONS = [
  'Appointment Time (Ascending)', 
  'Appointment Time (Descending)', 
  'Recently Created', 
  'Patient Name (A-Z)'
];

const TypeIcon = ({ type }: { type: string }) => {
  if (type === 'Video Consultation') return <Video className="w-3.5 h-3.5 text-[#5C2494]" />;
  if (type === 'Home Visit') return <Home className="w-3.5 h-3.5 text-[#7C3AED]" />;
  if (type === 'Walk-In') return <Plus className="w-3.5 h-3.5 text-teal-600" />;
  return <Building2 className="w-3.5 h-3.5 text-teal-600" />;
};

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-xs text-slate-400 font-bold shrink-0 w-28 uppercase tracking-wider">{label}</span>
    <div className="text-right text-xs font-black text-slate-700 leading-normal">{children}</div>
  </div>
);

const formatDateToDisplay = (dateStr: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[monthIndex]} ${year}`;
  }
  return dateStr;
};

const convertDisplayDateToISO = (dateStr: string) => {
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  const parts = dateStr.split(' ');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = months[parts[1]] ?? '01';
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr;
};

export default function AppointmentsScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Appointments database state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Prescription editing states
  const [medicines, setMedicines] = useState<{ name: string; dosage: string; duration: string }[]>([
    { name: '', dosage: '', duration: '' }
  ]);
  const [generalAdvice, setGeneralAdvice] = useState('');
  const [isPrescriptionCompleted, setIsPrescriptionCompleted] = useState(false);

  // Load current prescription if it exists on the selected appointment
  useEffect(() => {
    if (selectedApp) {
      const rx = selectedApp.prescription;
      if (rx) {
        setMedicines(rx.medicines || [{ name: '', dosage: '', duration: '' }]);
        setGeneralAdvice(rx.generalAdvice || '');
        setIsPrescriptionCompleted(rx.isCompleted || false);
      } else {
        setMedicines([{ name: '', dosage: '', duration: '' }]);
        setGeneralAdvice('');
        setIsPrescriptionCompleted(false);
      }
    }
  }, [selectedApp]);

  // File Upload Handling
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedApp) return;
    const file = files[0];

    const newDoc = {
      name: file.name,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB'
    };

    const updated = appointments.map(a => {
      if (a.id === selectedApp.id) {
        const updatedDocs = [...(a.documents || []), newDoc];
        const newTimeline = [
          ...a.timeline,
          { label: `Document Uploaded: ${file.name}`, time: new Date().toLocaleString() }
        ];
        return { ...a, documents: updatedDocs, timeline: newTimeline };
      }
      return a;
    });

    syncAppointments(updated);

    setSelectedApp({
      ...selectedApp,
      documents: [...(selectedApp.documents || []), newDoc],
      timeline: [
        ...selectedApp.timeline,
        { label: `Document Uploaded: ${file.name}`, time: new Date().toLocaleString() }
      ]
    });

    showToast('File uploaded successfully.', 'success');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Filter Dropdowns states
  const [selectedDateFilter, setSelectedDateFilter] = useState('Today');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');
  const [selectedClinicFilter, setSelectedClinicFilter] = useState('Last Selected Clinic');

  // Custom Date Range states
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Prescription UI Form state
  const [showRxForm, setShowRxForm] = useState(false);
  const [selectedSortFilter, setSelectedSortFilter] = useState('Appointment Time (Ascending)');

  // Dropdown open states
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showClinicDropdown, setShowClinicDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Details Tab
  const [activeDetailTab, setActiveDetailTab] = useState<'Overview' | 'Consultation' | 'Prescription' | 'Documents' | 'Timeline'>('Overview');

  // Modals state
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ name: string; date: string; size: string } | null>(null);
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDownloadFile = (docName: string) => {
    if (!selectedApp) return;
    const dummyContent = `VIZIITO HEALTHCARE CLINICAL RECORD\n=================================\nDocument Name: ${docName}\nPatient Name: ${selectedApp.patient}\nPatient ID: ${selectedApp.patientId}\nDate of Record: ${selectedApp.date}\nClinical Location: ${selectedApp.location}\nConsulting Physician: Dr. Arjun Reddy\n\nClinical Report Summary:\n- Patient presented with: ${selectedApp.reason || 'N/A'}\n- ECG/Diagnostic Observations: Regular intervals, normal physiological bounds.\n- Recommending follow-up as advised.\n\n*** Generated via Viziito Practice Web Portal ***`;
    
    const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const cleanName = docName.endsWith('.pdf') 
      ? docName.replace('.pdf', '.txt') 
      : docName.endsWith('.txt') 
        ? docName 
        : `${docName}.txt`;
        
    link.download = cleanName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${cleanName} successfully.`, 'success');
  };

  // Load database and sync URL search parameters
  useEffect(() => {
    // Local storage load
    const saved = localStorage.getItem('vizito_appointments');
    let loadedApps = INITIAL_APPOINTMENTS;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        loadedApps = parsed.map((app: any) => ({
          timeline: [],
          documents: [],
          ...app
        }));
      } catch (e) {
        loadedApps = INITIAL_APPOINTMENTS;
      }
    } else {
      localStorage.setItem('vizito_appointments', JSON.stringify(INITIAL_APPOINTMENTS));
    }
    setAppointments(loadedApps);

    // URL search parameters check (Redirected from dashboard)
    const paramDate = searchParams.get('date');
    const paramStatus = searchParams.get('status');
    if (paramDate === 'today') {
      setSelectedDateFilter('Today');
    }
    if (paramStatus === 'upcoming') {
      setSelectedStatusFilter('All Statuses'); // show all to view upcoming
      setSelectedDateFilter('This Month');
    }
  }, [searchParams, location.key]);

  // Sync to local storage
  const syncAppointments = (updated: Appointment[]) => {
    setAppointments(updated);
    localStorage.setItem('vizito_appointments', JSON.stringify(updated));
  };

  // Reschedule Formik Form
  const rescheduleFormik = useFormik({
    initialValues: {
      date: '2025-05-28',
      time: '10:30 AM'
    },
    validationSchema: Yup.object({
      date: Yup.string().required('Date is required'),
      time: Yup.string().required('Time is required')
    }),
    onSubmit: (values) => {
      if (!selectedApp) return;
      const displayDate = formatDateToDisplay(values.date);
      const updated = appointments.map(a => {
        if (a.id === selectedApp.id) {
          const newTimeline = [
            ...a.timeline,
            { label: 'Appointment Rescheduled', time: `${displayDate}, ${values.time}` }
          ];
          return { ...a, date: displayDate, time: values.time, timeline: newTimeline };
        }
        return a;
      });
      syncAppointments(updated);
      setSelectedApp({ 
        ...selectedApp, 
        date: displayDate, 
        time: values.time, 
        timeline: [
          ...selectedApp.timeline, 
          { label: 'Appointment Rescheduled', time: `${displayDate}, ${values.time}` }
        ] 
      });
      setIsRescheduleOpen(false);
      showToast('Appointment rescheduled successfully.', 'success');
    }
  });

  // Clinical Consultation Formik Form
  const consultationFormik = useFormik({
    initialValues: {
      chiefComplaint: '',
      symptoms: '',
      diagnosis: '',
      clinicalNotes: ''
    },
    validationSchema: Yup.object({
      chiefComplaint: Yup.string().required('Chief complaint is required'),
      clinicalNotes: Yup.string().required('Clinical notes are required')
    }),
    onSubmit: (values) => {
      if (!selectedApp) return;
      const updated = appointments.map(a => {
        if (a.id === selectedApp.id) {
          const newTimeline = [
            ...a.timeline,
            { label: 'Consultation Completed', time: new Date().toLocaleString() }
          ];
          return { 
            ...a, 
            status: 'Completed' as const,
            chiefComplaint: values.chiefComplaint,
            symptoms: values.symptoms,
            diagnosis: values.diagnosis,
            clinicalNotes: values.clinicalNotes,
            timeline: newTimeline
          };
        }
        return a;
      });
      syncAppointments(updated);
      setSelectedApp({ 
        ...selectedApp, 
        status: 'Completed',
        chiefComplaint: values.chiefComplaint,
        symptoms: values.symptoms,
        diagnosis: values.diagnosis,
        clinicalNotes: values.clinicalNotes,
        timeline: [
          ...selectedApp.timeline, 
          { label: 'Consultation Completed', time: new Date().toLocaleString() }
        ]
      });
      showToast('Consultation completed successfully.', 'success');
      // Automatically switch to Prescription tab upon completing consultation
      setActiveDetailTab('Prescription');
    }
  });

  // Helper to parse time string (e.g. "09:30 AM") into minutes for sorting
  const timeToMinutes = (timeStr: string) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSelectedDateFilter('Today');
    setSelectedStatusFilter('All');
    setSelectedTypeFilter('All');
    setSelectedClinicFilter('Last Selected Clinic');
    setSelectedSortFilter('Appointment Time (Ascending)');
    setSearchQuery('');
    setCustomStartDate('');
    setCustomEndDate('');
    setCurrentPage(1);
    showToast('Filters reset to default.', 'info');
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActiveRowMenuId(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Helper to parse ISO date string (YYYY-MM-DD) -> Date
  const parseISODateString = (isoStr: string) => {
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  };

  // Helper to parse date string (DD MMM YYYY) -> Date
  const parseDateString = (dateStr: string) => {
    const parts = dateStr.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthName = parts[1].slice(0, 3);
      const year = parseInt(parts[2], 10);
      
      const months: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };
      
      const month = months[monthName] !== undefined ? months[monthName] : 0;
      return new Date(year, month, day);
    }
    return new Date();
  };

  // ─── Filter & Search Logic ──────────────────────────────────────────────────
  const filtered = appointments.filter(a => {
    // Search Query (Minimum 3 characters validation)
    if (searchQuery.trim().length >= 3) {
      const query = searchQuery.toLowerCase();
      const matchSearch = 
        a.id.toLowerCase().includes(query) ||
        a.patient.toLowerCase().includes(query) ||
        a.phone.includes(query) ||
        a.patientId.toLowerCase().includes(query);
      if (!matchSearch) return false;
    }

    // Date Filter logic (dynamic — based on real current date)
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const toDisplayDate = (d: Date) => `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    if (selectedDateFilter === 'Today' && a.date !== toDisplayDate(today)) return false;
    if (selectedDateFilter === 'Yesterday' && a.date !== toDisplayDate(yesterday)) return false;
    if (selectedDateFilter === 'Tomorrow' && a.date !== toDisplayDate(tomorrow)) return false;
    if (selectedDateFilter === 'This Week') {
      const dayOfWeek = today.getDay(); // 0=Sun
      const monday = new Date(today); monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      const apptDate = parseDateString(a.date);
      apptDate.setHours(12, 0, 0, 0);
      if (apptDate < monday || apptDate > sunday) return false;
    }
    if (selectedDateFilter === 'This Month') {
      const apptDate = parseDateString(a.date);
      if (apptDate.getMonth() !== today.getMonth() || apptDate.getFullYear() !== today.getFullYear()) return false;
    }
    if (selectedDateFilter === 'Custom Range') {
      if (customStartDate && customEndDate) {
        const apptDate = parseDateString(a.date);
        const start = parseISODateString(customStartDate);
        const end = parseISODateString(customEndDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        apptDate.setHours(12, 0, 0, 0); // normalize
        if (apptDate < start || apptDate > end) return false;
      }
    }

    // Status Filter
    if (selectedStatusFilter !== 'All' && a.status !== selectedStatusFilter) return false;

    // Consultation Type Filter
    if (selectedTypeFilter !== 'All' && a.type !== selectedTypeFilter) return false;

    // Clinic Filter (Last Selected / Own / Associated)
    if (selectedClinicFilter === 'Own Clinic' && a.location !== 'Banjarahills Clinic') return false;
    if (selectedClinicFilter === 'Associated Clinics' && !['City Care Hospital', 'Dr. Arjun Virtual Clinic'].includes(a.location)) return false;
    if (selectedClinicFilter === 'Last Selected Clinic' && a.location !== 'Banjarahills Clinic') return false;
    if (selectedClinicFilter !== 'All Clinics' && selectedClinicFilter !== 'Own Clinic' && selectedClinicFilter !== 'Associated Clinics' && selectedClinicFilter !== 'Last Selected Clinic' && a.location !== selectedClinicFilter) return false;

    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (selectedSortFilter === 'Appointment Time (Ascending)') {
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    }
    if (selectedSortFilter === 'Appointment Time (Descending)') {
      return timeToMinutes(b.time) - timeToMinutes(a.time);
    }
    if (selectedSortFilter === 'Recently Created') {
      return b.id.localeCompare(a.id);
    }
    if (selectedSortFilter === 'Patient Name (A-Z)') {
      return a.patient.localeCompare(b.patient);
    }
    return 0;
  });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated = sorted.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Status Handlers from list row
  const handleCheckIn = (apt: Appointment) => {
    const updated = appointments.map(a => {
      if (a.id === apt.id) {
        const newTimeline = [
          ...a.timeline,
          { label: 'Patient Checked In', time: new Date().toLocaleString() }
        ];
        return { ...a, status: 'Checked In' as const, timeline: newTimeline };
      }
      return a;
    });
    syncAppointments(updated);
    
    if (selectedApp?.id === apt.id) {
      setSelectedApp({
        ...selectedApp,
        status: 'Checked In' as const,
        timeline: [
          ...selectedApp.timeline,
          { label: 'Patient Checked In', time: new Date().toLocaleString() }
        ]
      });
    }
    showToast('Patient checked in successfully.', 'success');
  };

  const handleStartConsultation = (apt: Appointment) => {
    // Transition status to Consultation Started
    const updated = appointments.map(a => {
      if (a.id === apt.id) {
        const newTimeline = [
          ...a.timeline,
          { label: 'Consultation Started', time: new Date().toLocaleString() }
        ];
        return { ...a, status: 'Consultation Started' as const, timeline: newTimeline };
      }
      return a;
    });
    syncAppointments(updated);
    
    const activeApp = { 
      ...apt, 
      status: 'Consultation Started' as const,
      timeline: [
        ...apt.timeline,
        { label: 'Consultation Started', time: new Date().toLocaleString() }
      ]
    };
    setSelectedApp(activeApp);
    consultationFormik.setValues({
      chiefComplaint: activeApp.chiefComplaint || '',
      symptoms: activeApp.symptoms || '',
      diagnosis: activeApp.diagnosis || '',
      clinicalNotes: activeApp.clinicalNotes || ''
    });
    setActiveDetailTab('Consultation');
    showToast('Consultation started.', 'success');
  };

  const handleContinueConsultation = (apt: Appointment) => {
    setSelectedApp(apt);
    consultationFormik.setValues({
      chiefComplaint: apt.chiefComplaint || '',
      symptoms: apt.symptoms || '',
      diagnosis: apt.diagnosis || '',
      clinicalNotes: apt.clinicalNotes || ''
    });
    setActiveDetailTab('Consultation');
  };

  const handleViewPrescription = (apt: Appointment) => {
    setSelectedApp(apt);
    setActiveDetailTab('Prescription');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start min-h-0 w-full relative">
      {/* ── Main Panel ───────────────────────────────────────────────────── */}
      <div className={`flex-1 min-w-0 space-y-5 transition-all duration-300 w-full ${selectedApp ? 'hidden lg:block lg:max-w-[calc(100%-340px)]' : 'block'}`}>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#2B2B2B] tracking-tight">Appointment Management</h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">View, filter, sort and process your practices' bookings</p>
          </div>
          <button
            onClick={() => navigate('/appointments/create')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#5C2494] to-[#7C3AED] hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Consultation
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div 
            onClick={() => { setSelectedDateFilter('Today'); setSelectedStatusFilter('All'); }}
            className="bg-white border border-slate-200 hover:border-purple-300 cursor-pointer rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-all hover:shadow"
          >
            <div className="w-11 h-11 bg-[#FAF5FF] rounded-xl flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-[#5C2494]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Appointments</p>
              <h4 className="text-2xl font-black text-slate-800 mt-0.5">{appointments.filter(a => {
                const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const now = new Date();
                const todayStr = `${now.getDate()} ${mn[now.getMonth()]} ${now.getFullYear()}`;
                return a.date === todayStr;
              }).length}</h4>
            </div>
          </div>

          <div 
            onClick={() => setSelectedStatusFilter('Pending')}
            className="bg-white border border-slate-200 hover:border-amber-300 cursor-pointer rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-all hover:shadow"
          >
            <div className="w-11 h-11 bg-[#FEF3C7]/40 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#D97706]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
              <h4 className="text-2xl font-black text-slate-800 mt-0.5">{appointments.filter(a => a.status === 'Pending').length}</h4>
            </div>
          </div>

          <div 
            onClick={() => setSelectedStatusFilter('Consultation Started')}
            className="bg-white border border-slate-200 hover:border-indigo-300 cursor-pointer rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-all hover:shadow"
          >
            <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Consultation</p>
              <h4 className="text-2xl font-black text-slate-800 mt-0.5">{appointments.filter(a => a.status === 'Consultation Started').length}</h4>
            </div>
          </div>

          <div 
            onClick={() => setSelectedStatusFilter('Completed')}
            className="bg-white border border-slate-200 hover:border-slate-300 cursor-pointer rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-all hover:shadow"
          >
            <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
              <h4 className="text-2xl font-black text-slate-800 mt-0.5">{appointments.filter(a => a.status === 'Completed').length}</h4>
            </div>
          </div>
        </div>

        {/* Custom Date Range Picker Container */}
        {selectedDateFilter === 'Custom Range' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-3.5 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Custom Date Range:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => { setCustomStartDate(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-purple-400 focus:bg-white transition-all animate-fade"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => { setCustomEndDate(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-purple-400 focus:bg-white transition-all animate-fade"
              />
            </div>
          </div>
        )}

        {/* Filter Bar (Search + Dropdown Filters) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-teal-400 focus:bg-white transition-all placeholder-slate-400"
                placeholder="Search..."
              />
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetFilters}
              className="px-4 py-2.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition-all whitespace-nowrap active:scale-95"
            >
              Reset Filters
            </button>
          </div>

          {/* Filtering Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {/* Date filter dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="w-full flex items-center justify-between gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 hover:bg-slate-100 transition-all"
              >
                <span className="truncate">Date: {selectedDateFilter}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
              {showDateDropdown && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowDateDropdown(false)} />
                  <div className="absolute left-0 top-full mt-1 w-full min-w-[140px] bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-30">
                    {DATE_FILTER_OPTIONS.map(d => (
                      <button
                        key={d}
                        onClick={() => { setSelectedDateFilter(d); setShowDateDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-all ${selectedDateFilter === d ? 'text-teal-700 bg-teal-50' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Status filter dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="w-full flex items-center justify-between gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 hover:bg-slate-100 transition-all"
              >
                <span className="truncate">Status: {selectedStatusFilter}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
              {showStatusDropdown && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowStatusDropdown(false)} />
                  <div className="absolute left-0 top-full mt-1 w-full min-w-[150px] bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-30">
                    {STATUS_FILTER_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => { setSelectedStatusFilter(s); setShowStatusDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-all ${selectedStatusFilter === s ? 'text-teal-700 bg-teal-50' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Type filter dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="w-full flex items-center justify-between gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 hover:bg-slate-100 transition-all"
              >
                <span className="truncate">Type: {selectedTypeFilter}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
              {showTypeDropdown && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowTypeDropdown(false)} />
                  <div className="absolute left-0 top-full mt-1 w-full min-w-[170px] bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-30">
                    {TYPE_FILTER_OPTIONS.map(t => (
                      <button
                        key={t}
                        onClick={() => { setSelectedTypeFilter(t); setShowTypeDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-all ${selectedTypeFilter === t ? 'text-teal-700 bg-teal-50' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Clinic selector dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowClinicDropdown(!showClinicDropdown)}
                className="w-full flex items-center justify-between gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 hover:bg-slate-100 transition-all"
              >
                <span className="truncate">Clinic: {selectedClinicFilter}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
              {showClinicDropdown && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowClinicDropdown(false)} />
                  <div className="absolute left-0 top-full mt-1 w-full min-w-[170px] bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-30 font-sans">
                    {CLINIC_FILTER_OPTIONS.map(c => (
                      <button
                        key={c}
                        onClick={() => { setSelectedClinicFilter(c); setShowClinicDropdown(false); setCurrentPage(1); }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-all ${selectedClinicFilter === c ? 'text-purple-700 bg-purple-50' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {c === 'Own Clinic' ? 'Own Clinic (Banjarahills)' : c}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sort order dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="w-full flex items-center justify-between gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 hover:bg-slate-100 transition-all"
              >
                <span className="truncate">Sort: {selectedSortFilter}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
              {showSortDropdown && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowSortDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1 w-full min-w-[210px] bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-30">
                    {SORT_FILTER_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => { setSelectedSortFilter(s); setShowSortDropdown(false); }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-all ${selectedSortFilter === s ? 'text-teal-700 bg-teal-50' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Appointment List Table / Layout */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Table Headers */}
              <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Appointment ID</div>
                <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient</div>
                <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</div>
                <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</div>
                <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinic</div>
                <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
                <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</div>
              </div>

              {/* Table Rows / Empty States */}
              <div className="divide-y divide-slate-100">
                {paginated.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <Calendar className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="text-sm font-bold text-slate-700">No appointments found.</h3>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the filters or register a walk-in patient.</p>
                    <button
                      onClick={() => navigate('/appointments/create')}
                      className="mt-4 flex items-center justify-center gap-1.5 bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-[#5C2494]/25 text-[#5C2494] px-4 py-2 rounded-xl text-xs font-black transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Consultation
                    </button>
                  </div>
                ) : (
                  paginated.map(apt => {
                    const isSelected = selectedApp?.id === apt.id;
                    const status = STATUS_CONFIG[apt.status] ?? { bg: 'bg-slate-100', text: 'text-slate-600' };

                    // Conditional actions rendering
                    const showStart = ['Confirmed', 'Checked In', 'Pending'].includes(apt.status);
                    const showContinue = apt.status === 'Consultation Started';
                    const showPrescription = apt.status === 'Completed';

                    return (
                      <div
                        key={apt.id}
                        onClick={() => {
                          setSelectedApp(apt);
                          setActiveDetailTab('Overview');
                        }}
                        className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-[#FAF5FF]/20 border-l-4 border-[#5C2494]' 
                            : 'hover:bg-slate-50/50 border-l-4 border-transparent'
                        }`}
                      >
                        {/* ID */}
                        <div className="col-span-2">
                          <span className="text-xs font-bold text-slate-700 font-mono">{apt.id}</span>
                        </div>

                        {/* Patient Profile info */}
                        <div className="col-span-2 flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${apt.avatarColor}`}>
                            {apt.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-800 truncate">
                              {apt.patient}
                              <span className="ml-1 text-slate-400 text-[10px]">{apt.gender === 'M' ? '♂' : '♀'}</span>
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5 truncate">{apt.age} Y • {apt.patientId}</p>
                          </div>
                        </div>

                        {/* Time */}
                        <div className="col-span-1">
                          <div className="flex flex-col text-xs font-semibold text-slate-700 leading-tight">
                            <span>{apt.time}</span>
                            <span className="text-[9px] text-slate-400 font-bold mt-0.5">{apt.date}</span>
                          </div>
                        </div>

                        {/* Consultation Type */}
                        <div className="col-span-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <TypeIcon type={apt.type} />
                            <span className="truncate">{apt.type}</span>
                          </div>
                        </div>

                        {/* Clinic */}
                        <div className="col-span-2">
                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{apt.location}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="col-span-1">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${status.bg} ${status.text}`}>
                            {apt.status}
                          </span>
                        </div>

                        {/* Interactive action buttons */}
                        <div 
                          className="col-span-2 flex items-center justify-end gap-2 relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {apt.status === 'Confirmed' && (
                            <button
                              onClick={() => handleCheckIn(apt)}
                              className="text-[10px] font-black bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1.5 rounded-lg shadow-sm transition-all"
                            >
                              Check In
                            </button>
                          )}
                          {showStart && (
                            <button
                              onClick={() => handleStartConsultation(apt)}
                              className="text-[10px] font-black bg-gradient-to-r from-[#5C2494] to-[#7C3AED] text-white px-2.5 py-1.5 rounded-lg shadow-sm transition-all"
                            >
                              Start
                            </button>
                          )}
                          {showContinue && (
                            <button
                              onClick={() => handleContinueConsultation(apt)}
                              className="text-[10px] font-black bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg shadow-sm transition-all"
                            >
                              Continue
                            </button>
                          )}
                          {showPrescription && (
                            <button
                              onClick={() => handleViewPrescription(apt)}
                              className="text-[10px] font-black bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg transition-all"
                            >
                              Rx
                            </button>
                          )}

                          {/* Row Popup Menu trigger */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveRowMenuId(activeRowMenuId === apt.id ? null : apt.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeRowMenuId === apt.id && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setActiveRowMenuId(null)} />
                                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 shadow-xl rounded-xl py-1.5 z-40 text-left">
                                  <button
                                    onClick={() => {
                                      setActiveRowMenuId(null);
                                      setSelectedApp(apt);
                                      setActiveDetailTab('Overview');
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-500" /> View Details
                                  </button>
                                  {apt.status === 'Confirmed' && (
                                    <button
                                      onClick={() => {
                                        setActiveRowMenuId(null);
                                        handleCheckIn(apt);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-teal-750 hover:bg-teal-50 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Check In
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setActiveRowMenuId(null);
                                      setSelectedApp(apt);
                                      rescheduleFormik.setValues({ date: convertDisplayDateToISO(apt.date), time: apt.time });
                                      setIsRescheduleOpen(true);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reschedule
                                  </button>
                                  {['Pending', 'Confirmed', 'Checked In', 'Consultation Started'].includes(apt.status) && (
                                    <button
                                      onClick={() => {
                                        setActiveRowMenuId(null);
                                        setSelectedApp(apt);
                                        setIsCancelConfirmOpen(true);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-t border-slate-100 mt-1 transition-colors"
                                    >
                                      <Ban className="w-3.5 h-3.5" /> Cancel Booking
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Pagination bar */}
          <div className="px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <p className="text-xs text-slate-400 font-bold">
              Showing {sorted.length === 0 ? 0 : (currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, sorted.length)} of {sorted.length} appointments
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-600 px-3 py-1 bg-white border border-slate-200 rounded-lg">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Per Page:</span>
                <select 
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Appointment Details Panel ─────────────────────────────────────── */}
      {selectedApp && (
        <div className="w-full lg:w-[340px] shrink-0 lg:sticky lg:top-0 space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Appointment Details</h3>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Patient Info Summary */}
            <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${selectedApp.avatarColor}`}>
                  {selectedApp.initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {selectedApp.patient}
                    <span className="ml-1 text-slate-400 text-[11px]">{selectedApp.gender === 'M' ? '♂' : '♀'}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">{selectedApp.age} Years • {selectedApp.patientId}</p>
                </div>
              </div>
            </div>

            {/* 5-Tab Navigation */}
            <div className="flex border-b border-slate-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {(['Overview', 'Consultation', 'Prescription', 'Documents', 'Timeline'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveDetailTab(tab)}
                  className={`flex-1 py-3 text-[10px] font-black text-center border-b-2 whitespace-nowrap transition-colors ${
                    activeDetailTab === tab 
                      ? 'border-[#5C2494] text-[#5C2494]' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-5 max-h-[460px] overflow-y-auto">
              
              {/* OVERVIEW TAB */}
              {activeDetailTab === 'Overview' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-[#2B2B2B] mb-2">General Info</h4>
                    <DetailRow label="ID">
                      <span className="font-mono text-[#5C2494]">{selectedApp.id}</span>
                    </DetailRow>
                    <DetailRow label="Date & Time">
                      {selectedApp.date}, {selectedApp.time}
                    </DetailRow>
                    <DetailRow label="Consultation Type">
                      <div className="flex items-center gap-1.5 justify-end">
                        <TypeIcon type={selectedApp.type} />
                        {selectedApp.type}
                      </div>
                    </DetailRow>
                    <DetailRow label="Location">
                      {selectedApp.location}
                    </DetailRow>
                    <DetailRow label="Status">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${STATUS_CONFIG[selectedApp.status]?.bg} ${STATUS_CONFIG[selectedApp.status]?.text}`}>
                        {selectedApp.status}
                      </span>
                    </DetailRow>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-[#2B2B2B] mb-2">Patient Contact</h4>
                    <DetailRow label="Phone Number">
                      {selectedApp.phone}
                    </DetailRow>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-[#2B2B2B] mb-2">Consultation Notes</h4>
                    <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-200/50 p-2.5 rounded-lg">
                      {selectedApp.reason || 'No clinical reason stated.'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-[#2B2B2B] mb-2">Payment Info</h4>
                    <DetailRow label="Status">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${PAYMENT_CONFIG[selectedApp.paymentStatus]?.bg} ${PAYMENT_CONFIG[selectedApp.paymentStatus]?.text}`}>
                        {selectedApp.paymentStatus}
                      </span>
                    </DetailRow>
                    <DetailRow label="Fee Amount">
                      ₹{selectedApp.amount}
                    </DetailRow>
                  </div>

                  {/* Dynamic actions inside Overview tab */}
                  <div className="pt-2 flex flex-col gap-2">
                    {selectedApp.status === 'Confirmed' && (
                      <button
                        onClick={() => handleCheckIn(selectedApp)}
                        className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-xl text-xs font-black shadow-sm transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Check In
                      </button>
                    )}
                    {['Confirmed', 'Checked In', 'Pending'].includes(selectedApp.status) && (
                      <button
                        onClick={() => handleStartConsultation(selectedApp)}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#5C2494] to-[#7C3AED] hover:opacity-95 text-white py-2 rounded-xl text-xs font-black shadow-sm transition-all"
                      >
                        <Stethoscope className="w-4 h-4" />
                        Start Consultation
                      </button>
                    )}
                    {selectedApp.status === 'Consultation Started' && (
                      <button
                        onClick={() => handleContinueConsultation(selectedApp)}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-black shadow-sm transition-all"
                      >
                        <Stethoscope className="w-4 h-4" />
                        Continue Consultation
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/patients/${selectedApp.patientId}`)}
                      className="w-full border border-slate-200 text-slate-600 hover:bg-slate-50 py-2 rounded-xl text-xs font-bold transition-all text-center"
                    >
                      View Patient Profile
                    </button>
                  </div>
                </div>
              )}

              {/* CONSULTATION TAB */}
              {activeDetailTab === 'Consultation' && (
                <div className="space-y-4">
                  {selectedApp.status === 'Completed' || selectedApp.status === 'Cancelled' ? (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Chief Complaint</span>
                        <p className="text-xs font-semibold text-slate-700 mt-1">{selectedApp.chiefComplaint || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Symptoms</span>
                        <p className="text-xs font-semibold text-slate-700 mt-1">{selectedApp.symptoms || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Diagnosis</span>
                        <p className="text-xs font-semibold text-slate-700 mt-1">{selectedApp.diagnosis || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Clinical Notes</span>
                        <p className="text-xs font-semibold text-slate-700 mt-1">{selectedApp.clinicalNotes || selectedApp.notes || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#5C2494] bg-[#FAF5FF] border border-[#E9D5FF] p-2 rounded-lg mt-3">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Consultation record is completed and locked.
                      </div>
                    </div>
                  ) : (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        // Pre-validate clinicalNotes
                        if (!consultationFormik.values.chiefComplaint) {
                          showToast('Chief Complaint is mandatory.', 'error');
                          return;
                        }
                        if (!consultationFormik.values.clinicalNotes) {
                          showToast('Clinical Notes are mandatory.', 'error');
                          return;
                        }
                        consultationFormik.handleSubmit(e);
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Chief Complaint *</label>
                        <input
                          type="text"
                          name="chiefComplaint"
                          value={consultationFormik.values.chiefComplaint}
                          onChange={consultationFormik.handleChange}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-400 focus:bg-white transition-all"
                          placeholder="e.g., Acute chest tighteness"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Symptoms</label>
                        <input
                          type="text"
                          name="symptoms"
                          value={consultationFormik.values.symptoms}
                          onChange={consultationFormik.handleChange}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-400 focus:bg-white transition-all"
                          placeholder="e.g., Shortness of breath, fatigue"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Diagnosis</label>
                        <input
                          type="text"
                          name="diagnosis"
                          value={consultationFormik.values.diagnosis}
                          onChange={consultationFormik.handleChange}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-400 focus:bg-white transition-all"
                          placeholder="e.g., Angina pectoris suspect"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Clinical Notes *</label>
                        <textarea
                          name="clinicalNotes"
                          value={consultationFormik.values.clinicalNotes}
                          onChange={consultationFormik.handleChange}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-400 focus:bg-white min-h-[100px] transition-all"
                          placeholder="Enter complete clinical observations and medication plans..."
                          required
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            // Update local draft
                            const updated = appointments.map(a => {
                              if (a.id === selectedApp.id) {
                                return {
                                  ...a,
                                  chiefComplaint: consultationFormik.values.chiefComplaint,
                                  symptoms: consultationFormik.values.symptoms,
                                  diagnosis: consultationFormik.values.diagnosis,
                                  clinicalNotes: consultationFormik.values.clinicalNotes
                                };
                              }
                              return a;
                            });
                            syncAppointments(updated);
                            showToast('Consultation draft saved successfully.', 'info');
                          }}
                          className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 rounded-xl text-xs font-bold transition-all text-center"
                        >
                          Save Draft
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-[#5C2494] to-[#7C3AED] hover:opacity-95 text-white py-2 rounded-xl text-xs font-black shadow-sm transition-all"
                        >
                          Complete Info
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* PRESCRIPTION TAB */}
              {activeDetailTab === 'Prescription' && (
                <div className="space-y-4">
                  {isPrescriptionCompleted ? (
                    /* Finalized Read-only View */
                    <div className="space-y-4">
                      <div className="space-y-3 bg-[#EAF7F4] p-4 rounded-xl border border-teal-200/50 text-center">
                        <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto" />
                        <h4 className="text-xs font-black text-teal-800">Finalized Prescription Generated</h4>
                        <p className="text-[10px] text-teal-600 font-bold leading-normal">
                          The prescription has been finalized and transmitted to the patient and associated pharmacies.
                        </p>
                      </div>

                      {/* Display Completed Rx */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-inner bg-slate-50/20">
                        <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2">Rx (Prescription)</h4>
                        <div className="space-y-2.5">
                          {medicines.map((med, index) => (
                            <div key={index} className="bg-white border border-slate-150 p-3 rounded-xl">
                              <p className="text-xs font-black text-slate-800">{med.name || 'N/A'}</p>
                              <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-1">
                                <span>Dosage: {med.dosage || 'N/A'}</span>
                                <span>Duration: {med.duration || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {generalAdvice && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">General Advice</span>
                            <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">{generalAdvice}</p>
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <span>🔒 Finalized prescription locked</span>
                      </div>
                    </div>
                  ) : !showRxForm ? (
                    /* Initial View with Create Prescription option */
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm space-y-4">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">No prescription created yet.</h4>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-normal">
                        Create a digital prescription containing medicines, dosages, and general advice.
                      </p>
                      <button
                        onClick={() => setShowRxForm(true)}
                        className="w-full bg-gradient-to-r from-[#5C2494] to-[#7C3AED] hover:opacity-95 text-white py-2.5 rounded-xl text-xs font-black shadow-sm transition-all animate-fade"
                      >
                        + Create Prescription
                      </button>
                    </div>
                  ) : (
                    /* Interactive Editor Form matching the screenshot */
                    <div className="space-y-4">
                      {/* Card wrapper */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-4 shadow-sm">
                        <h4 className="text-xs font-black text-[#2B2B2B] leading-none mb-1">Rx (Prescription)</h4>

                        {/* List of Medicines */}
                        <div className="space-y-4">
                          {medicines.map((med, index) => (
                            <div key={index} className="space-y-3 pt-3 first:pt-0 border-t border-slate-100 first:border-0 relative group/med">
                              <div className="flex justify-between items-center">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Medicine Name</label>
                                {medicines.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...medicines];
                                      updated.splice(index, 1);
                                      setMedicines(updated);
                                    }}
                                    className="text-[9px] font-black text-rose-600 hover:underline"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                value={med.name}
                                onChange={(e) => {
                                  const updated = [...medicines];
                                  updated[index].name = e.target.value;
                                  setMedicines(updated);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-teal-400 focus:bg-white transition-all placeholder-slate-400"
                                placeholder="e.g. Paracetamol 500mg"
                              />

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dosage</label>
                                  <input
                                    type="text"
                                    value={med.dosage}
                                    onChange={(e) => {
                                      const updated = [...medicines];
                                      updated[index].dosage = e.target.value;
                                      setMedicines(updated);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-teal-400 focus:bg-white transition-all placeholder-slate-400"
                                    placeholder="1-0-1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Duration</label>
                                  <input
                                    type="text"
                                    value={med.duration}
                                    onChange={(e) => {
                                      const updated = [...medicines];
                                      updated[index].duration = e.target.value;
                                      setMedicines(updated);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-teal-400 focus:bg-white transition-all placeholder-slate-400"
                                    placeholder="5 days"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Another Medicine row */}
                        <button
                          type="button"
                          onClick={() => setMedicines([...medicines, { name: '', dosage: '', duration: '' }])}
                          className="w-full flex items-center justify-center gap-1.5 bg-[#EAF7F4]/60 hover:bg-[#EAF7F4] border border-dashed border-teal-500/35 rounded-xl py-2.5 text-xs font-bold text-teal-700 transition-all active:scale-98"
                        >
                          + Add Another Medicine
                        </button>
                      </div>

                      {/* General Advice block */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">General Advice</label>
                        <textarea
                          value={generalAdvice}
                          onChange={(e) => setGeneralAdvice(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-teal-400 focus:bg-white min-h-[90px] transition-all placeholder-slate-400"
                          placeholder="Diet, rest, etc..."
                        />
                      </div>

                      {/* Bottom buttons */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedApp) return;
                            const updated = appointments.map(a => {
                              if (a.id === selectedApp.id) {
                                return {
                                  ...a,
                                  prescription: { medicines, generalAdvice, isCompleted: false }
                                };
                              }
                              return a;
                            });
                            syncAppointments(updated);
                            showToast('Prescription draft saved.', 'info');
                          }}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-black transition-all active:scale-95 text-center"
                        >
                          Save Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedApp) return;
                            // Validation: Must fill at least first medicine name
                            if (!medicines[0].name.trim()) {
                              showToast('Medicine Name is mandatory.', 'error');
                              return;
                            }

                            const newTimeline = [...selectedApp.timeline];
                            if (!newTimeline.some(t => t.label === 'Prescription Created')) {
                              newTimeline.push({ label: 'Prescription Created', time: new Date().toLocaleString() });
                            }
                            if (!newTimeline.some(t => t.label === 'Consultation Completed')) {
                              newTimeline.push({ label: 'Consultation Completed', time: new Date().toLocaleString() });
                            }

                            const updated = appointments.map(a => {
                              if (a.id === selectedApp.id) {
                                return {
                                  ...a,
                                  status: 'Completed' as const,
                                  prescription: { medicines, generalAdvice, isCompleted: true },
                                  timeline: newTimeline
                                };
                              }
                              return a;
                            });
                            syncAppointments(updated);
                            setSelectedApp({
                              ...selectedApp,
                              status: 'Completed',
                              prescription: { medicines, generalAdvice, isCompleted: true },
                              timeline: newTimeline
                            });
                            setIsPrescriptionCompleted(true);
                            showToast('Prescription finalized and completed.', 'success');
                          }}
                          className="flex-1 bg-[#1E4D40] hover:bg-[#15382E] text-white py-3 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 text-center"
                        >
                          Complete Prescription
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DOCUMENTS TAB */}
              {activeDetailTab === 'Documents' && (
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Documents</span>
                    <button 
                      type="button"
                      onClick={triggerFileUpload}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#5C2494] hover:underline cursor-pointer"
                    >
                      <FileUp className="w-3.5 h-3.5" /> Upload File
                    </button>
                  </div>
                  {(!selectedApp.documents || selectedApp.documents.length === 0) ? (
                    <p className="text-xs text-slate-400 font-semibold text-center py-6">No patient files uploaded.</p>
                  ) : (
                    (selectedApp.documents || []).map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/50 transition-all">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">{doc.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">{doc.date} • {doc.size}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => setViewingDoc(doc)}
                            className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-1 rounded cursor-pointer hover:bg-teal-100/80 transition-colors"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleDownloadFile(doc.name)}
                            className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200 transition-colors"
                          >
                            Get
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TIMELINE TAB */}
              {activeDetailTab === 'Timeline' && (
                <div className="space-y-4">
                  <div className="relative border-l border-slate-200 pl-4 space-y-4 ml-2.5 py-1">
                    {(selectedApp.timeline || []).map((entry, idx) => (
                      <div key={idx} className="relative">
                        {/* Dot */}
                        <span className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-[#5C2494] border-2 border-white ring-2 ring-purple-50 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-none">{entry.label}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">{entry.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Toast Notification popup */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade flex items-center gap-3 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl max-w-sm">
          <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'error' ? 'bg-red-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-[#5C2494]'}`} />
          <p className="text-xs font-bold">{toast.message}</p>
        </div>
      )}

      {/* RESCHEDULE MODAL DIALOG */}
      {isRescheduleOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsRescheduleOpen(false)}
        >
          <form
            onSubmit={rescheduleFormik.handleSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Reschedule Booking</h3>
              <button
                type="button"
                onClick={() => setIsRescheduleOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 font-sans">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select New Date</label>
                <input
                  type="date"
                  name="date"
                  value={rescheduleFormik.values.date}
                  onChange={rescheduleFormik.handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-400 focus:bg-white font-sans"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select New Time Slot</label>
                <select
                  name="time"
                  value={rescheduleFormik.values.time}
                  onChange={rescheduleFormik.handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-400 focus:bg-white font-sans"
                  required
                >
                  {['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM','05:00 PM'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsRescheduleOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-[#5C2494] to-[#7C3AED] hover:opacity-95 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all"
              >
                Confirm Reschedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CANCEL BOOKING DIALOG */}
      {isCancelConfirmOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsCancelConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-fade"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-slate-800">Cancel Appointment</h3>
            <p className="text-xs text-slate-500 my-4 leading-relaxed">
              Are you sure you want to cancel the booking for <b>{selectedApp?.patient}</b>? This action will set the status to cancelled.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsCancelConfirmOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                No, Keep
              </button>
              <button
                onClick={() => {
                  if (!selectedApp) return;
                  const updated = appointments.map(a => {
                    if (a.id === selectedApp.id) {
                      const newTimeline = [
                        ...a.timeline,
                        { label: 'Cancelled', time: new Date().toLocaleString() }
                      ];
                      return { ...a, status: 'Cancelled' as const, timeline: newTimeline };
                    }
                    return a;
                  });
                  syncAppointments(updated);
                  setSelectedApp({ 
                    ...selectedApp, 
                    status: 'Cancelled', 
                    timeline: [
                      ...selectedApp.timeline, 
                      { label: 'Cancelled', time: new Date().toLocaleString() }
                    ]
                  });
                  setIsCancelConfirmOpen(false);
                  showToast('Appointment has been cancelled successfully.', 'info');
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black py-2 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {viewingDoc && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setViewingDoc(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Clinical File Viewer</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">File: {viewingDoc.name} ({viewingDoc.size})</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="p-1.5 text-slate-400 hover:text-[#5C2494] hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mock clinical record visualization */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3 font-mono text-[11px] text-slate-600 leading-relaxed max-h-[300px] overflow-y-auto">
              <div className="text-center font-bold text-slate-800 border-b border-dashed border-slate-200 pb-2 mb-2">
                VIZIITO HEALTHCARE LAB/CLINICAL RECORD
              </div>
              <p><b>PATIENT NAME:</b> {selectedApp?.patient}</p>
              <p><b>PATIENT ID:</b> {selectedApp?.patientId}</p>
              <p><b>RECORD DATE:</b> {viewingDoc.date}</p>
              <p><b>LOCATION:</b> {selectedApp?.location}</p>
              <p><b>PHYSICIAN:</b> Dr. Arjun Reddy</p>
              <div className="h-px bg-slate-200/50 my-2" />
              <p className="font-sans text-xs text-slate-700 font-semibold leading-relaxed">
                <b>Summary:</b> Electrocardiogram (ECG) showing regular sinus rhythm with normal physiological PR and QT intervals. 
                QRS complexes are narrow and stable. No diagnostic ST-segment elevations, depressions, or T-wave inversions observed. 
                Vitals checkup indicates normal blood pressure and oxygenation parameters matching target bounds.
              </p>
              <div className="h-px bg-slate-200/50 my-2" />
              <p className="text-[9px] text-slate-400 text-center">*** This is a secure digital record, generated on Viziito Portal. ***</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => handleDownloadFile(viewingDoc.name)}
                className="bg-gradient-to-r from-[#5C2494] to-[#7C3AED] text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-sm shadow-purple-500/10 active:scale-95 text-center cursor-pointer"
              >
                Download File
              </button>
              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
