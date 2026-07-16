import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { 
  Calendar, Clock, Ban, Building2, Monitor, Home, Edit2, CalendarDays,
  X, ChevronDown, ChevronLeft, ChevronRight, Lock, Plus, Trash2, Check, 
  CheckCircle2, Info, ArrowRight, AlertCircle, FileUp, Settings, SlidersHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Availability {
  id: string;
  clinic: string;
  types: ('In-Clinic' | 'Video Consultation' | 'Home Visit')[]; // Multi-select support
  date: string; // Format: "DD MMM YYYY" e.g., "26 May 2025"
  startTime: string; // e.g. "09:00 AM"
  endTime: string; // e.g. "12:00 PM"
  duration: number; // minutes
  status: 'Available' | 'Blocked' | 'Leave' | 'Requested' | 'Approved' | 'Rejected';
  appointmentsCount?: number;
}

interface Leave {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface HospitalRequest {
  id: string;
  hospitalName: string;
  date: string;
  time: string;
  type: 'In-Clinic' | 'Video Consultation' | 'Home Visit';
  status: 'Requested' | 'Approved' | 'Rejected';
  rejectReason?: string;
}

// ─── Initial Mock Data (Centered around May 2025) ─────────────────────────────
const INITIAL_AVAILABILITIES: Availability[] = [
  { id: 'AV-001', clinic: 'Banjarahills Clinic', types: ['In-Clinic'], date: '26 May 2025', startTime: '09:00 AM', endTime: '12:00 PM', duration: 15, status: 'Available', appointmentsCount: 2 },
  { id: 'AV-002', clinic: 'Dr. Arjun Virtual Clinic', types: ['Video Consultation'], date: '26 May 2025', startTime: '01:00 PM', endTime: '03:00 PM', duration: 15, status: 'Available', appointmentsCount: 0 },
  { id: 'AV-003', clinic: 'City Care Hospital', types: ['In-Clinic', 'Video Consultation'], date: '27 May 2025', startTime: '10:00 AM', endTime: '01:00 PM', duration: 20, status: 'Blocked', appointmentsCount: 0 },
  { id: 'AV-004', clinic: 'Banjarahills Clinic', types: ['Home Visit'], date: '28 May 2025', startTime: '02:00 PM', endTime: '06:00 PM', duration: 30, status: 'Available', appointmentsCount: 1 },
  { id: 'AV-005', clinic: 'City Care Hospital', types: ['In-Clinic'], date: '29 May 2025', startTime: '09:00 AM', endTime: '12:00 PM', duration: 15, status: 'Available', appointmentsCount: 0 },
];

const INITIAL_LEAVES: Leave[] = [
  { id: 'LV-001', type: 'Casual Leave', startDate: '31 May 2025', endDate: '31 May 2025', reason: 'Attending medical conference.' }
];

const INITIAL_REQUESTS: HospitalRequest[] = [
  { id: 'REQ-001', hospitalName: 'Care Hospital Banjara', date: '26 May 2025', time: '04:00 PM - 06:00 PM', type: 'In-Clinic', status: 'Requested' },
  { id: 'REQ-002', hospitalName: 'Apollo Spectra Kondapur', date: '29 May 2025', time: '11:00 AM - 01:00 PM', type: 'Video Consultation', status: 'Approved' }
];

const CLINIC_OPTIONS = ['Banjarahills Clinic', 'City Care Hospital', 'Dr. Arjun Virtual Clinic'];
const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityScreen() {
  const navigate = useNavigate();

  // State collections
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [requests, setRequests] = useState<HospitalRequest[]>([]);

  // Selected date & filters
  const [selectedDate, setSelectedDate] = useState('26 May 2025');
  const [selectedClinicFilter, setSelectedClinicFilter] = useState('All Clinics');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');
  const [dateFilterMode, setDateFilterMode] = useState<'All' | 'Today' | 'This Week' | 'This Month' | 'Custom'>('All');
  const [customFilterStartDate, setCustomFilterStartDate] = useState('26 May 2025');
  const [customFilterEndDate, setCustomFilterEndDate] = useState('28 May 2025');

  const [showClinicDropdown, setShowClinicDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  
  // Modal toggle states
  const [isAddAvOpen, setIsAddAvOpen] = useState(false);
  const [isAddLeaveOpen, setIsAddLeaveOpen] = useState(false);
  const [isBlockSlotsOpen, setIsBlockSlotsOpen] = useState(false);
  const [isRequestAvOpen, setIsRequestAvOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isViewRequestOpen, setIsViewRequestOpen] = useState(false);
  
  // Active target for edits or status changes
  const [activeRequest, setActiveRequest] = useState<HospitalRequest | null>(null);
  const [editingAv, setEditingAv] = useState<Availability | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('');

  // Multiple Slots Block selection
  const [selectedBlockSlots, setSelectedBlockSlots] = useState<string[]>([]);

  // Toast alert status
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load from local storage
  useEffect(() => {
    const savedAv = localStorage.getItem('vizito_availabilities');
    const savedLeaves = localStorage.getItem('vizito_leaves');
    const savedRequests = localStorage.getItem('vizito_requests');

    if (savedAv) {
      try {
        const parsed = JSON.parse(savedAv) as any[];
        const migrated = parsed.map(item => ({
          ...item,
          types: item.types || (item.type ? [item.type] : ['In-Clinic'])
        }));
        setAvailabilities(migrated);
      } catch (e) {
        setAvailabilities(INITIAL_AVAILABILITIES);
      }
    } else {
      setAvailabilities(INITIAL_AVAILABILITIES);
      localStorage.setItem('vizito_availabilities', JSON.stringify(INITIAL_AVAILABILITIES));
    }

    if (savedLeaves) setLeaves(JSON.parse(savedLeaves));
    else {
      setLeaves(INITIAL_LEAVES);
      localStorage.setItem('vizito_leaves', JSON.stringify(INITIAL_LEAVES));
    }

    if (savedRequests) setRequests(JSON.parse(savedRequests));
    else {
      setRequests(INITIAL_REQUESTS);
      localStorage.setItem('vizito_requests', JSON.stringify(INITIAL_REQUESTS));
    }
  }, []);

  // Sync state helpers
  const syncAvailabilities = (updated: Availability[]) => {
    setAvailabilities(updated);
    localStorage.setItem('vizito_availabilities', JSON.stringify(updated));
  };

  const syncLeaves = (updated: Leave[]) => {
    setLeaves(updated);
    localStorage.setItem('vizito_leaves', JSON.stringify(updated));
  };

  const syncRequests = (updated: HospitalRequest[]) => {
    setRequests(updated);
    localStorage.setItem('vizito_requests', JSON.stringify(updated));
  };

  // Helper to parse time string (e.g. "09:00 AM") into minutes for checks
  const timeToMinutes = (timeStr: string) => {
    const [time, modifier] = timeStr.trim().split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Helper to detect time overlaps (Enforces cross-clinic and cross-type validations)
  const checkOverlap = (dateStr: string, startMin: number, endMin: number, excludeId?: string) => {
    return availabilities.some(av => {
      if (av.id === excludeId || av.date !== dateStr || av.status === 'Rejected') return false;
      const avStart = timeToMinutes(av.startTime);
      const avEnd = timeToMinutes(av.endTime);
      // Overlap rule: max(start1, start2) < min(end1, end2)
      return Math.max(startMin, avStart) < Math.min(endMin, avEnd);
    });
  };

  // ─── Filter Options Change ────────────────────────────────────────────────
  const handleClinicFilterChange = (clinic: string) => {
    setSelectedClinicFilter(clinic);
    showToast(`Clinic filter set to ${clinic}`, 'info');
  };

  const handleTypeFilterChange = (type: string) => {
    setSelectedTypeFilter(type);
    showToast(`Consultation format filter set to ${type}`, 'info');
  };

  const handleDateFilterChange = (mode: typeof dateFilterMode) => {
    setDateFilterMode(mode);
    if (mode === 'Today') {
      setSelectedDate('26 May 2025'); // Anchored virtual date
    }
    showToast(`Date filter set to ${mode}`, 'info');
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSelectedClinicFilter('All Clinics');
    setSelectedTypeFilter('All');
    setSelectedDate('26 May 2025');
    setDateFilterMode('All');
    showToast('Filters reset to default.', 'info');
  };

  // Date click from Calendar
  const handleDateClick = (dayNum: number) => {
    const formattedDate = `${dayNum < 10 ? '0' : ''}${dayNum} May 2025`;
    setSelectedDate(formattedDate);
  };

  // ─── Add/Edit Availability Form ──────────────────────────────────────────
  const avFormik = useFormik({
    initialValues: {
      clinic: 'Banjarahills Clinic',
      types: ['In-Clinic'] as string[],
      slotDuration: 15,
      avType: 'single',
      singleDate: '26 May 2025',
      fromDate: '26 May 2025',
      toDate: '28 May 2025',
      startTime: '09:00 AM',
      endTime: '12:00 PM',
      weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as string[]
    },
    validationSchema: Yup.object({
      clinic: Yup.string().required('Clinic selection is mandatory'),
      startTime: Yup.string().required('Start Time is mandatory'),
      endTime: Yup.string().required('End Time is mandatory')
    }),
    onSubmit: (values) => {
      // 1. Time bounds check
      const startMin = timeToMinutes(values.startTime);
      const endMin = timeToMinutes(values.endTime);
      if (startMin >= endMin) {
        showToast('Start Time must be earlier than End Time.', 'error');
        return;
      }

      // 2. Consultation type validation
      if (values.types.length === 0) {
        showToast('At least one consultation type must be selected.', 'error');
        return;
      }

      // 3. Priority validation order checks
      const datesToValidate: string[] = [];

      if (values.avType === 'single') {
        datesToValidate.push(values.singleDate);
      } else {
        const fromTime = new Date(values.fromDate).getTime();
        const toTime = new Date(values.toDate).getTime();
        if (fromTime > toTime) {
          showToast('From Date cannot be greater than To Date.', 'error');
          return;
        }

        // Fill dates list
        let cursor = new Date(values.fromDate);
        const endCursor = new Date(values.toDate);
        while (cursor <= endCursor) {
          const dayName = WEEKDAYS[cursor.getDay()];
          // Filter by weekdays selection
          if (values.weekdays.includes(dayName)) {
            const dateStr = cursor.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            datesToValidate.push(dateStr);
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      }

      // Enforce overlap and leave cross-validation
      for (const d of datesToValidate) {
        // Validate Leave
        const isOnLeave = leaves.some(lv => lv.startDate === d || lv.endDate === d);
        if (isOnLeave) {
          showToast(`Cannot create availability. Doctor has approved leave on ${d}!`, 'error');
          return;
        }

        // Validate overlap
        if (checkOverlap(d, startMin, endMin, editingAv?.id)) {
          showToast(`Overlapping slots detected on ${d}!`, 'error');
          return;
        }
      }

      // Save slots
      if (values.avType === 'single') {
        if (editingAv) {
          const updated = availabilities.map(a => 
            a.id === editingAv.id 
              ? { 
                  ...a, 
                  clinic: values.clinic, 
                  types: values.types as any, 
                  duration: Number(values.slotDuration), 
                  date: values.singleDate, 
                  startTime: values.startTime, 
                  endTime: values.endTime 
                } 
              : a
          );
          syncAvailabilities(updated);
          showToast('Availability updated successfully.', 'success');
        } else {
          const newAv: Availability = {
            id: `AV-${Date.now()}`,
            clinic: values.clinic,
            types: values.types as any,
            date: values.singleDate,
            startTime: values.startTime,
            endTime: values.endTime,
            duration: Number(values.slotDuration),
            status: 'Available',
            appointmentsCount: 0
          };
          syncAvailabilities([...availabilities, newAv]);
          showToast('Availability slot added successfully.', 'success');
        }
      } else {
        const newSlots: Availability[] = [];
        datesToValidate.forEach((d, idx) => {
          newSlots.push({
            id: `AV-${Date.now()}-${idx}`,
            clinic: values.clinic,
            types: values.types as any,
            date: d,
            startTime: values.startTime,
            endTime: values.endTime,
            duration: Number(values.slotDuration),
            status: 'Available',
            appointmentsCount: 0
          });
        });

        if (newSlots.length === 0) {
          showToast('No weekdays matched in the selected range.', 'error');
          return;
        }

        syncAvailabilities([...availabilities, ...newSlots]);
        showToast(`Created ${newSlots.length} slots for checked weekdays.`, 'success');
      }

      setIsAddAvOpen(false);
      setEditingAv(null);
    }
  });

  const handleEditClick = (av: Availability) => {
    setEditingAv(av);
    avFormik.setValues({
      clinic: av.clinic,
      types: av.types,
      slotDuration: av.duration,
      avType: 'single',
      singleDate: av.date,
      fromDate: av.date,
      toDate: av.date,
      startTime: av.startTime,
      endTime: av.endTime,
      weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    });
    setIsAddAvOpen(true);
  };

  const handleDeleteClick = (av: Availability) => {
    if (av.appointmentsCount && av.appointmentsCount > 0) {
      showToast(`Cannot delete availability. Confirmed appointments exist inside this slot!`, 'error');
      return;
    }

    if (window.confirm('Delete this availability?')) {
      const updated = availabilities.filter(a => a.id !== av.id);
      syncAvailabilities(updated);
      showToast('Availability deleted successfully.', 'info');
    }
  };

  // ─── Leave Form ──────────────────────────────────────────────────────────
  const leaveFormik = useFormik({
    initialValues: {
      type: 'Casual Leave',
      startDate: '26 May 2025',
      endDate: '26 May 2025',
      reason: ''
    },
    validationSchema: Yup.object({
      type: Yup.string().required('Leave Type is required'),
      reason: Yup.string().required('Reason is mandatory')
    }),
    onSubmit: (values) => {
      // Validate leaves do not overlap with active schedules or approved portal bookings
      const startSec = new Date(values.startDate).getTime();
      const endSec = new Date(values.endDate).getTime();

      const hasActiveSlots = availabilities.some(av => {
        const avTime = new Date(av.date).getTime();
        return avTime >= startSec && avTime <= endSec && av.status === 'Available';
      });

      if (hasActiveSlots) {
        showToast('Leave cannot overlap with existing active availability slots!', 'error');
        return;
      }

      const newLeave: Leave = {
        id: `LV-${Date.now()}`,
        type: values.type,
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason
      };

      syncLeaves([...leaves, newLeave]);
      showToast('Leave registered successfully.', 'success');
      setIsAddLeaveOpen(false);
      leaveFormik.resetForm();
    }
  });

  // ─── Block Slots Multi-checkbox and Day Form ──────────────────────────────
  const blockFormik = useFormik({
    initialValues: {
      blockType: 'single',
      date: '26 May 2025',
    },
    onSubmit: (values) => {
      if (values.blockType === 'single') {
        if (selectedBlockSlots.length === 0) {
          showToast('Please select at least one time slot to block.', 'error');
          return;
        }

        // Check if any selected slot contains booked appointments
        const hasBookings = availabilities.some(av => 
          av.date === values.date && 
          selectedBlockSlots.includes(av.startTime) && 
          av.appointmentsCount && av.appointmentsCount > 0
        );

        if (hasBookings) {
          showToast('Selected slot contains booked appointments.', 'error');
          return;
        }

        const updated = availabilities.map(av => {
          if (av.date === values.date && selectedBlockSlots.includes(av.startTime)) {
            return { ...av, status: 'Blocked' as const };
          }
          return av;
        });

        syncAvailabilities(updated);
        showToast('Selected slots blocked successfully.', 'success');
      } else {
        // Entire Day
        const daySlots = availabilities.filter(av => av.date === values.date);
        const hasBookings = daySlots.some(av => av.appointmentsCount && av.appointmentsCount > 0);
        if (hasBookings) {
          showToast('Selected slot contains booked appointments.', 'error');
          return;
        }

        const updated = availabilities.map(av => {
          if (av.date === values.date) {
            return { ...av, status: 'Blocked' as const };
          }
          return av;
        });
        syncAvailabilities(updated);
        showToast('Entire day blocked.', 'success');
      }
      setIsBlockSlotsOpen(false);
      setSelectedBlockSlots([]);
    }
  });

  // ─── Hospital Request Handlers ──────────────────────────────────────────────
  const handleAcceptRequest = (req: HospitalRequest) => {
    const hasLeave = leaves.some(lv => lv.startDate === req.date || lv.endDate === req.date);
    if (hasLeave) {
      showToast('Cannot approve. Doctor is on leave on this date.', 'error');
      return;
    }

    const [start, end] = req.time.split(' - ');
    const newAv: Availability = {
      id: `AV-REQ-${req.id}`,
      clinic: req.hospitalName,
      types: [req.type],
      date: req.date,
      startTime: start,
      endTime: end,
      duration: 20,
      status: 'Available',
      appointmentsCount: 0
    };

    syncAvailabilities([...availabilities, newAv]);

    const updated = requests.map(r => r.id === req.id ? { ...r, status: 'Approved' as const } : r);
    syncRequests(updated);
    showToast('Hospital request approved and slot scheduled.', 'success');
  };

  const handleRejectRequest = (req: HospitalRequest) => {
    setActiveRequest(req);
    setRejectReasonText('');
    setIsRejectOpen(true);
  };

  const handleConfirmReject = () => {
    if (!activeRequest || !rejectReasonText.trim()) {
      showToast('Rejection reason is mandatory.', 'error');
      return;
    }

    const updated = requests.map(r => 
      r.id === activeRequest.id 
        ? { ...r, status: 'Rejected' as const, rejectReason: rejectReasonText } 
        : r
    );
    syncRequests(updated);

    showToast(`Request rejected. Reason: ${rejectReasonText}`, 'info');
    setIsRejectOpen(false);
    setActiveRequest(null);
  };

  const requestFormik = useFormik({
    initialValues: {
      hospital: 'Care Hospital Banjara',
      type: 'In-Clinic',
      date: '26 May 2025',
      startTime: '04:00 PM',
      endTime: '06:00 PM'
    },
    onSubmit: (values) => {
      const newReq: HospitalRequest = {
        id: `REQ-${Date.now()}`,
        hospitalName: values.hospital,
        date: values.date,
        time: `${values.startTime} - ${values.endTime}`,
        type: values.type as any,
        status: 'Requested'
      };
      syncRequests([...requests, newReq]);
      showToast('Portal slot request sent successfully.', 'success');
      setIsRequestAvOpen(false);
    }
  });

  // ─── Filter Slots Lists ─────────────────────────────────────────────────────
  const activeSlots = availabilities.filter(av => {
    // Clinic filter
    if (selectedClinicFilter === 'Own Clinic' && av.clinic !== 'Banjarahills Clinic') return false;
    if (selectedClinicFilter === 'Associated Clinics' && !['City Care Hospital', 'Dr. Arjun Virtual Clinic'].includes(av.clinic)) return false;
    if (selectedClinicFilter !== 'All Clinics' && selectedClinicFilter !== 'Own Clinic' && selectedClinicFilter !== 'Associated Clinics' && av.clinic !== selectedClinicFilter) return false;
    
    // Type filter
    const avTypes = av.types || [((av as any).type || 'In-Clinic')];
    if (selectedTypeFilter !== 'All' && !avTypes.includes(selectedTypeFilter as any)) return false;

    // Date filter modes
    if (dateFilterMode === 'Today') {
      return av.date === '26 May 2025';
    }
    if (dateFilterMode === 'This Week') {
      const avDay = parseInt(av.date.split(' ')[0]);
      return avDay >= 25 && avDay <= 31; // May 25 to May 31
    }
    if (dateFilterMode === 'This Month') {
      return av.date.includes('May 2025');
    }
    if (dateFilterMode === 'Custom') {
      const avTime = new Date(av.date).getTime();
      return avTime >= new Date(customFilterStartDate).getTime() && avTime <= new Date(customFilterEndDate).getTime();
    }

    return av.date === selectedDate;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2B2B2B] tracking-tight">Availability Management</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Configure your monthly slots, handle leave logs, and hospital requested schedules</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setEditingAv(null);
              avFormik.resetForm();
              setIsAddAvOpen(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-[#5C2494] to-[#7C3AED] hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Availability
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-[#DEDFE0] rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Clinic Selector */}
          <div className="relative">
            <button
              onClick={() => setShowClinicDropdown(!showClinicDropdown)}
              className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 hover:bg-slate-100 transition-all text-xs font-bold text-slate-700"
            >
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Clinic: {selectedClinicFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
            {showClinicDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowClinicDropdown(false)} />
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-30">
                  <button
                    onClick={() => { handleClinicFilterChange('Own Clinic'); setShowClinicDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-all ${selectedClinicFilter === 'Own Clinic' ? 'text-teal-700 bg-teal-50' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    Own Clinic (Banjarahills)
                  </button>
                  <button
                    onClick={() => { handleClinicFilterChange('Associated Clinics'); setShowClinicDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-all ${selectedClinicFilter === 'Associated Clinics' ? 'text-teal-700 bg-teal-50' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    Associated Clinics
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  {['All Clinics', ...CLINIC_OPTIONS].map(c => (
                    <button
                      key={c}
                      onClick={() => { handleClinicFilterChange(c); setShowClinicDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold transition-all ${selectedClinicFilter === c ? 'text-teal-700 bg-teal-50' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Type filter */}
          <div className="relative">
            <button
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 hover:bg-slate-100 transition-all text-xs font-bold text-slate-700"
            >
              <Monitor className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Format: {selectedTypeFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
            {showTypeDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowTypeDropdown(false)} />
                <div className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-30">
                  {['All', 'In-Clinic', 'Video Consultation', 'Home Visit'].map(t => (
                    <button
                      key={t}
                      onClick={() => { handleTypeFilterChange(t); setShowTypeDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold transition-all ${selectedTypeFilter === t ? 'text-teal-700 bg-teal-50' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Date Range filter */}
          <div className="relative">
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 hover:bg-slate-100 transition-all text-xs font-bold text-slate-700"
            >
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Date Filter: {dateFilterMode}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
            {showDateDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowDateDropdown(false)} />
                <div className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-30">
                  {(['All', 'Today', 'This Week', 'This Month', 'Custom'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => { handleDateFilterChange(d); setShowDateDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold transition-all ${dateFilterMode === d ? 'text-teal-700 bg-teal-50' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Custom Date inputs inline */}
          {dateFilterMode === 'Custom' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <input
                type="text"
                value={customFilterStartDate}
                onChange={e => setCustomFilterStartDate(e.target.value)}
                className="w-24 bg-white border border-slate-150 rounded px-1.5 py-0.5 text-[10px] font-bold outline-none"
                placeholder="26 May 2025"
              />
              <span className="text-[10px] font-bold text-slate-400">to</span>
              <input
                type="text"
                value={customFilterEndDate}
                onChange={e => setCustomFilterEndDate(e.target.value)}
                className="w-24 bg-white border border-slate-150 rounded px-1.5 py-0.5 text-[10px] font-bold outline-none"
                placeholder="28 May 2025"
              />
            </div>
          )}
        </div>

        {/* Reset filter */}
        {(selectedClinicFilter !== 'All Clinics' || selectedTypeFilter !== 'All' || dateFilterMode !== 'All') && (
          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-[#5C2494] hover:underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Grid Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Column 1: Interactive Calendar & Leaves */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Monthly Calendar Card */}
          <div className="bg-white border border-[#DEDFE0] rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#2B2B2B] flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                May 2025
              </h3>
              <div className="flex gap-1">
                <button disabled className="p-1 rounded hover:bg-slate-100 opacity-40 shrink-0">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button disabled className="p-1 rounded hover:bg-slate-100 opacity-40 shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid Header */}
            <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {[...Array(4)].map((_, i) => <div key={`offset-${i}`} />)}

              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                const dateStr = `${day < 10 ? '0' : ''}${day} May 2025`;
                const isSelected = selectedDate === dateStr;
                const matchesClinic = (av: Availability) => selectedClinicFilter === 'All Clinics' || av.clinic === selectedClinicFilter;
                
                const dateSlots = availabilities.filter(av => av.date === dateStr && matchesClinic(av));
                const dateLeaves = leaves.filter(lv => lv.startDate === dateStr || lv.endDate === dateStr);
                const hasLeave = dateLeaves.length > 0;
                
                // Calendar status determinations
                const hasBooked = dateSlots.some(av => av.appointmentsCount && av.appointmentsCount > 0);
                const allSlotsBooked = dateSlots.length > 0 && dateSlots.every(av => av.appointmentsCount && av.appointmentsCount > 0);
                const hasAvailable = dateSlots.some(av => av.status === 'Available');
                const hasBlocked = dateSlots.length > 0 && dateSlots.every(av => av.status === 'Blocked');

                let ringColor = 'border-transparent';
                let indicatorDot = null;
                
                if (hasLeave) {
                  ringColor = 'border-blue-500 bg-blue-50/50';
                  indicatorDot = <span className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full" title="Leave" />;
                } else if (allSlotsBooked) {
                  ringColor = 'border-red-500 bg-red-50/40';
                  indicatorDot = <span className="absolute bottom-1 w-1 h-1 bg-red-500 rounded-full" title="Fully Booked" />;
                } else if (hasBooked && hasAvailable) {
                  ringColor = 'border-amber-400 bg-amber-50/40';
                  indicatorDot = <span className="absolute bottom-1 w-1 h-1 bg-amber-400 rounded-full" title="Partially Available" />;
                } else if (hasAvailable) {
                  ringColor = 'border-emerald-500 bg-emerald-50/40';
                  indicatorDot = <span className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full" title="Available" />;
                } else if (hasBlocked) {
                  ringColor = 'border-slate-400 bg-slate-100/40';
                  indicatorDot = <span className="absolute bottom-1 w-1 h-1 bg-slate-400 rounded-full" title="Blocked" />;
                }

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`h-11 flex flex-col items-center justify-center rounded-xl relative transition-all border ${
                      isSelected 
                        ? 'bg-gradient-to-br from-[#5C2494] to-[#7C3AED] text-white border-transparent shadow-sm'
                        : `bg-white hover:bg-slate-50 text-slate-700 ${ringColor}`
                    }`}
                  >
                    <span className="text-xs font-black">{day}</span>
                    {!isSelected && indicatorDot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Leave Management Card */}
          <div className="bg-white border border-[#DEDFE0] rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-[#2B2B2B]">Leave Management</h3>
              <button
                onClick={() => setIsAddLeaveOpen(true)}
                className="flex items-center gap-1 text-[10px] font-black text-[#5C2494] hover:underline"
              >
                + Request Leave
              </button>
            </div>
            {leaves.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold text-center py-6">No leave logged yet.</p>
            ) : (
              <div className="space-y-2.5">
                {leaves.map(lv => (
                  <div key={lv.id} className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl relative">
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this leave log?')) {
                          syncLeaves(leaves.filter(l => l.id !== lv.id));
                          showToast('Leave log deleted.', 'info');
                        }
                      }}
                      className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-rose-500 rounded transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="min-w-0 pr-6">
                      <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">{lv.type}</span>
                      <p className="text-[10px] text-slate-400 font-black mt-1.5">{lv.startDate} - {lv.endDate}</p>
                      <p className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">{lv.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Structured Availability Slots List (Table Format) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#DEDFE0] rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#2B2B2B]">Availability Table</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Showing slots for: {selectedDate}</p>
              </div>
              <button
                onClick={() => setIsBlockSlotsOpen(true)}
                className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
              >
                <Ban className="w-3.5 h-3.5" /> Block Slots
              </button>
            </div>

            {activeSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarDays className="w-12 h-12 text-slate-350 mb-3" />
                <p className="text-xs text-slate-400 font-bold">No availability configured.</p>
                <button
                  onClick={() => setIsAddAvOpen(true)}
                  className="mt-4 flex items-center justify-center gap-1 bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-[#5C2494]/25 text-[#5C2494] px-4 py-2 rounded-xl text-xs font-black transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Configure Slots
                </button>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[600px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-450 bg-slate-50 uppercase">
                      <th className="p-2">Clinic</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Time Slot</th>
                      <th className="p-2">Duration</th>
                      <th className="p-2">Status</th>
                      <th className="p-2 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {activeSlots.map(av => (
                      <tr key={av.id} className="hover:bg-slate-50/50">
                        <td className="p-2 font-bold text-slate-800">{av.clinic}</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            {(av.types || [((av as any).type || 'In-Clinic')]).map(t => (
                              <span key={t} className="bg-slate-100 border border-slate-200 text-slate-655 rounded px-1 text-[8.5px] font-bold whitespace-nowrap">
                                {t.replace(' Consultation', '')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-2 font-mono text-slate-650">{av.startTime} - {av.endTime}</td>
                        <td className="p-2 text-slate-500">{av.duration} min</td>
                        <td className="p-2">
                          <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            av.status === 'Blocked' 
                              ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          }`}>
                            {av.status}
                          </span>
                        </td>
                        <td className="p-2 text-right pr-4">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleEditClick(av)}
                              className="p-1 text-slate-400 hover:text-teal-650 hover:bg-teal-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(av)}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Hospital Requests */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-[#DEDFE0] rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-[#2B2B2B]">Hospital Requests</h3>
              <button
                onClick={() => setIsRequestAvOpen(true)}
                className="flex items-center gap-1 text-[10px] font-black text-[#5C2494] hover:underline"
              >
                + Request
              </button>
            </div>
            {requests.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold text-center py-6">No requests pending.</p>
            ) : (
              <div className="space-y-3">
                {requests.map(req => {
                  const isPending = req.status === 'Requested';
                  const isApproved = req.status === 'Approved';
                  const isRejected = req.status === 'Rejected';
                  return (
                    <div 
                      key={req.id} 
                      className={`p-3.5 border rounded-xl flex flex-col justify-between gap-2.5 ${
                        isApproved 
                          ? 'border-emerald-100 bg-emerald-50/20' 
                          : isRejected 
                            ? 'border-rose-100 bg-rose-50/20' 
                            : 'border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 truncate pr-4">{req.hospitalName}</h4>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            isApproved 
                              ? 'bg-emerald-50 text-emerald-600' 
                              : isRejected 
                                ? 'bg-rose-50 text-rose-500' 
                                : 'bg-amber-50 text-amber-600'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black mt-1.5">{req.date} • {req.time}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{req.type}</p>
                        {isRejected && req.rejectReason && (
                          <p className="text-[10px] text-rose-500 font-bold mt-1 leading-tight bg-rose-50 p-1.5 rounded">
                            Reason: {req.rejectReason}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1.5 mt-1">
                        <button
                          onClick={() => { setActiveRequest(req); setIsViewRequestOpen(true); }}
                          className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold py-1 rounded-lg"
                        >
                          View Details
                        </button>
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleAcceptRequest(req)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-1 rounded-lg"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req)}
                              className="flex-1 border border-slate-200 hover:bg-rose-50 text-rose-600 text-[10px] font-bold py-1 rounded-lg"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Toast Notifications ───────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade flex items-center gap-3 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl max-w-sm">
          <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'error' ? 'bg-red-500' : 'bg-teal-500'}`} />
          <p className="text-xs font-bold">{toast.message}</p>
        </div>
      )}

      {/* ADD/EDIT AVAILABILITY MODAL */}
      {isAddAvOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => { setIsAddAvOpen(false); setEditingAv(null); }}
        >
          <form
            onSubmit={avFormik.handleSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingAv ? 'Edit Availability Slot' : 'Add Availability'}
              </h3>
              <button
                type="button"
                onClick={() => { setIsAddAvOpen(false); setEditingAv(null); }}
                className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 py-1 pr-1">
              {/* Clinic Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Clinic *</label>
                <select
                  name="clinic"
                  value={avFormik.values.clinic}
                  onChange={avFormik.handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  {CLINIC_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Consultation Format Type: Multi-select Checkboxes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Consultation Types *</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {['In-Clinic', 'Video Consultation', 'Home Visit'].map(t => {
                    const isChecked = avFormik.values.types.includes(t);
                    return (
                      <label key={t} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = [...avFormik.values.types];
                            if (e.target.checked) current.push(t);
                            else {
                              const idx = current.indexOf(t);
                              if (idx > -1) current.splice(idx, 1);
                            }
                            avFormik.setFieldValue('types', current);
                          }}
                          className="w-4 h-4 text-teal-650 rounded border-slate-300"
                        />
                        {t}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Slot Duration */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Slot Duration *</label>
                <select
                  name="slotDuration"
                  value={avFormik.values.slotDuration}
                  onChange={avFormik.handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} minutes</option>)}
                </select>
              </div>

              {/* Single vs Range Radio */}
              {!editingAv && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Availability Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                      <input
                        type="radio"
                        name="avType"
                        value="single"
                        checked={avFormik.values.avType === 'single'}
                        onChange={avFormik.handleChange}
                      />
                      Single Date
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                      <input
                        type="radio"
                        name="avType"
                        value="range"
                        checked={avFormik.values.avType === 'range'}
                        onChange={avFormik.handleChange}
                      />
                      Date Range
                    </label>
                  </div>
                </div>
              )}

              {/* Date Inputs */}
              {avFormik.values.avType === 'single' || editingAv ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                  <input
                    type="text"
                    name="singleDate"
                    value={avFormik.values.singleDate}
                    onChange={avFormik.handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                    placeholder="e.g. 26 May 2025"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">From Date</label>
                    <input
                      type="text"
                      name="fromDate"
                      value={avFormik.values.fromDate}
                      onChange={avFormik.handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                      placeholder="e.g. 26 May 2025"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">To Date</label>
                    <input
                      type="text"
                      name="toDate"
                      value={avFormik.values.toDate}
                      onChange={avFormik.handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                      placeholder="e.g. 28 May 2025"
                    />
                  </div>
                </div>
              )}

              {/* Time Slots input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Time *</label>
                  <input
                    type="text"
                    name="startTime"
                    value={avFormik.values.startTime}
                    onChange={avFormik.handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                    placeholder="e.g. 09:00 AM"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Time *</label>
                  <input
                    type="text"
                    name="endTime"
                    value={avFormik.values.endTime}
                    onChange={avFormik.handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                    placeholder="e.g. 12:00 PM"
                  />
                </div>
              </div>

              {/* Recurring Weekdays checkboxes for Range */}
              {avFormik.values.avType === 'range' && !editingAv && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Recurring Weekdays</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                      const isDayChecked = avFormik.values.weekdays.includes(day);
                      return (
                        <label key={day} className="flex items-center gap-1.5 text-xs font-semibold text-slate-650 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isDayChecked}
                            onChange={(e) => {
                              const curr = [...avFormik.values.weekdays];
                              if (e.target.checked) curr.push(day);
                              else {
                                const idx = curr.indexOf(day);
                                if (idx > -1) curr.splice(idx, 1);
                              }
                              avFormik.setFieldValue('weekdays', curr);
                            }}
                            className="w-3.5 h-3.5 text-teal-650 rounded border-slate-300"
                          />
                          {day.substring(0, 3)}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => { setIsAddAvOpen(false); setEditingAv(null); }}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#5C2494] text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all"
              >
                Save Availability
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REQUEST LEAVE MODAL */}
      {isAddLeaveOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsAddLeaveOpen(false)}
        >
          <form
            onSubmit={leaveFormik.handleSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Request Leave</h3>
              <button
                type="button"
                onClick={() => setIsAddLeaveOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 py-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Leave Type *</label>
                <select
                  name="type"
                  value={leaveFormik.values.type}
                  onChange={leaveFormik.handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Medical Leave">Medical Leave</option>
                  <option value="Conference Exemption">Conference Exemption</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date *</label>
                  <input
                    type="text"
                    name="startDate"
                    value={leaveFormik.values.startDate}
                    onChange={leaveFormik.handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                    placeholder="e.g. 26 May 2025"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Date *</label>
                  <input
                    type="text"
                    name="endDate"
                    value={leaveFormik.values.endDate}
                    onChange={leaveFormik.handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                    placeholder="e.g. 26 May 2025"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reason *</label>
                <textarea
                  name="reason"
                  value={leaveFormik.values.reason}
                  onChange={leaveFormik.handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none min-h-[90px]"
                  placeholder="Attending medical conference..."
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsAddLeaveOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#5C2494] text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all"
              >
                Request Leave
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BLOCK SLOTS MODAL (Single, Multiple Checklist, Entire Day) */}
      {isBlockSlotsOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsBlockSlotsOpen(false)}
        >
          <form
            onSubmit={blockFormik.handleSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Block Slots</h3>
              <button
                type="button"
                onClick={() => setIsBlockSlotsOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 py-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Block Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-650 cursor-pointer">
                    <input
                      type="radio"
                      name="blockType"
                      value="single"
                      checked={blockFormik.values.blockType === 'single'}
                      onChange={blockFormik.handleChange}
                    />
                    Multiple Slots Checklist
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-650 cursor-pointer">
                    <input
                      type="radio"
                      name="blockType"
                      value="day"
                      checked={blockFormik.values.blockType === 'day'}
                      onChange={blockFormik.handleChange}
                    />
                    Entire Day
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                <input
                  type="text"
                  name="date"
                  value={blockFormik.values.date}
                  onChange={blockFormik.handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                  placeholder="e.g. 26 May 2025"
                />
              </div>

              {blockFormik.values.blockType === 'single' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Time Slots to Block</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {availabilities.filter(av => av.date === blockFormik.values.date && av.status === 'Available').length === 0 ? (
                      <p className="text-[10px] font-bold text-slate-400 text-center py-4">No active available slots on this date.</p>
                    ) : (
                      availabilities.filter(av => av.date === blockFormik.values.date && av.status === 'Available').map(av => {
                        const isChecked = selectedBlockSlots.includes(av.startTime);
                        return (
                          <label key={av.id} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const curr = [...selectedBlockSlots];
                                if (e.target.checked) curr.push(av.startTime);
                                else {
                                  const idx = curr.indexOf(av.startTime);
                                  if (idx > -1) curr.splice(idx, 1);
                                }
                                setSelectedBlockSlots(curr);
                              }}
                              className="w-4 h-4 text-teal-650 rounded border-slate-350"
                            />
                            <span>{av.startTime} ({av.clinic})</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsBlockSlotsOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-650 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors animate-fade"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all"
              >
                Block Selected
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HOSPITAL REQUEST VIEW DETAILS MODAL */}
      {isViewRequestOpen && activeRequest && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsViewRequestOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-bold text-slate-800">Hospital Slot Request Details</h3>
              <p className="text-[10px] font-mono mt-0.5 text-slate-400">Request Ref: {activeRequest.id}</p>
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-650">
              <div>Requested Hospital: <span className="font-bold text-slate-800">{activeRequest.hospitalName}</span></div>
              <div>Consultation Format: <span className="font-bold text-slate-850">{activeRequest.type}</span></div>
              <div>Requested Date: <span className="font-bold text-slate-800">{activeRequest.date}</span></div>
              <div>Requested Hours: <span className="font-bold text-slate-800">{activeRequest.time}</span></div>
              <div>Status: <span className="font-bold text-slate-800">{activeRequest.status}</span></div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsViewRequestOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-650 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOSPITAL REQUEST PORTAL ACCESS MODAL */}
      {isRequestAvOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsRequestAvOpen(false)}
        >
          <form
            onSubmit={requestFormik.handleSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Request Hospital Portal Slots</h3>
              <button
                type="button"
                onClick={() => setIsRequestAvOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 py-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Hospital *</label>
                <select
                  name="hospital"
                  value={requestFormik.values.hospital}
                  onChange={requestFormik.handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="Care Hospital Banjara">Care Hospital Banjara</option>
                  <option value="Apollo Spectra Kondapur">Apollo Spectra Kondapur</option>
                  <option value="Yashoda Hospital Somajiguda">Yashoda Hospital Somajiguda</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Consultation Type *</label>
                <select
                  name="type"
                  value={requestFormik.values.type}
                  onChange={requestFormik.handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="In-Clinic">In-Clinic Consultation</option>
                  <option value="Video Consultation">Video Consultation</option>
                  <option value="Home Visit">Home Visit</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date *</label>
                <input
                  type="text"
                  name="date"
                  value={requestFormik.values.date}
                  onChange={requestFormik.handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                  placeholder="e.g. 26 May 2025"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Time *</label>
                  <input
                    type="text"
                    name="startTime"
                    value={requestFormik.values.startTime}
                    onChange={requestFormik.handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                    placeholder="e.g. 04:00 PM"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Time *</label>
                  <input
                    type="text"
                    name="endTime"
                    value={requestFormik.values.endTime}
                    onChange={requestFormik.handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none"
                    placeholder="e.g. 06:00 PM"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsRequestAvOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-650 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#5C2494] text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all"
              >
                Send Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REJECT REQUEST MODAL */}
      {isRejectOpen && activeRequest && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsRejectOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-bold text-slate-800">Reject Hospital Slot Request</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Hospital: {activeRequest.hospitalName}</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reason for Rejection *</label>
              <textarea
                value={rejectReasonText}
                onChange={e => setRejectReasonText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-400 focus:bg-white min-h-[80px]"
                placeholder="Doctor unavailable, clinic schedule full..."
                required
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                onClick={() => setIsRejectOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
