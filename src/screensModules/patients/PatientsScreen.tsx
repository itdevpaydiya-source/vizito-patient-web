import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Search,
  Plus,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Users,
  UserPlus,
  RefreshCw,
  Calendar,
  X,
  Pencil,
  AlertCircle,
  FileText,
  Clock,
  Play,
  RotateCcw,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
type PatientStatus = 'Active' | 'Follow-up Due' | 'In Consultation';

interface Patient {
  id: string; // UHID
  name: string;
  initials: string;
  age: number;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  phone: string; // Mobile Number
  email: string;
  address: string;
  lastVisit: string;
  lastVisitType: 'Walk-In' | 'In-Clinic' | 'Video Consultation' | 'Home Visit';
  status: PatientStatus;
  registrationDate: 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Older';
  clinic: 'Current Clinic' | 'All Clinics';
  appointments: number;
  allergies: string;
}

// ─── Mock Data matching specifications ────────────────────────────────────────
const INITIAL_PATIENTS: Patient[] = [
  { id: 'PAT123456', name: 'Amit Sharma', initials: 'AS', age: 32, dob: '1993-05-14', gender: 'Male', phone: '9876543210', email: 'amit.sharma@email.com', address: 'Banjara Hills, Hyderabad', lastVisit: 'Today', lastVisitType: 'In-Clinic', status: 'Active', registrationDate: 'Today', clinic: 'Current Clinic', appointments: 8, allergies: 'Penicillin' },
  { id: 'PAT123457', name: 'Priya Singh', initials: 'PS', age: 28, dob: '1997-08-20', gender: 'Female', phone: '9123456789', email: 'priya.singh@email.com', address: 'Jubilee Hills, Hyderabad', lastVisit: 'Yesterday', lastVisitType: 'Video Consultation', status: 'Follow-up Due', registrationDate: 'Yesterday', clinic: 'Current Clinic', appointments: 5, allergies: 'None' },
  { id: 'PAT123458', name: 'Ramesh Kumar', initials: 'RK', age: 45, dob: '1980-11-05', gender: 'Male', phone: '9987654321', email: 'ramesh.kumar@email.com', address: 'Gachibowli, Hyderabad', lastVisit: '27 May 2025', lastVisitType: 'Walk-In', status: 'In Consultation', registrationDate: 'This Week', clinic: 'All Clinics', appointments: 12, allergies: 'Sulfa Drugs' },
  { id: 'PAT123459', name: 'Neha Devi', initials: 'ND', age: 35, dob: '1990-03-12', gender: 'Female', phone: '9345678901', email: 'neha.devi@email.com', address: 'Madhapur, Hyderabad', lastVisit: '26 May 2025', lastVisitType: 'Home Visit', status: 'Active', registrationDate: 'This Month', clinic: 'All Clinics', appointments: 6, allergies: 'None' },
  { id: 'PAT123460', name: 'Vikram Singh', initials: 'VS', age: 50, dob: '1975-01-25', gender: 'Male', phone: '9000011223', email: 'vikram.singh@email.com', address: 'Secunderabad, Hyderabad', lastVisit: '24 May 2025', lastVisitType: 'In-Clinic', status: 'Active', registrationDate: 'This Month', clinic: 'Current Clinic', appointments: 3, allergies: 'Dust/Pollen' },
  { id: 'PAT123461', name: 'Anjali Patel', initials: 'AP', age: 29, dob: '1996-07-30', gender: 'Female', phone: '9555566778', email: 'anjali.patel@email.com', address: 'Kondapur, Hyderabad', lastVisit: '22 May 2025', lastVisitType: 'Walk-In', status: 'Follow-up Due', registrationDate: 'Older', clinic: 'Current Clinic', appointments: 4, allergies: 'None' },
  { id: 'PAT123462', name: 'Mohit Jain', initials: 'MJ', age: 41, dob: '1984-09-18', gender: 'Male', phone: '9777788990', email: 'mohit.jain@email.com', address: 'Begumpet, Hyderabad', lastVisit: '15 May 2025', lastVisitType: 'Video Consultation', status: 'Active', registrationDate: 'Older', clinic: 'All Clinics', appointments: 7, allergies: 'Peanuts' },
  { id: 'PAT123463', name: 'Sneha Sharma', initials: 'SS', age: 31, dob: '1994-12-05', gender: 'Female', phone: '9888877665', email: 'sneha.sharma@email.com', address: 'Kukatpally, Hyderabad', lastVisit: '10 May 2025', lastVisitType: 'In-Clinic', status: 'Follow-up Due', registrationDate: 'Older', clinic: 'Current Clinic', appointments: 3, allergies: 'None' },
];

function StatusBadge({ status }: { status: PatientStatus }) {
  const styles: Record<PatientStatus, string> = {
    'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Follow-up Due': 'bg-amber-50 text-amber-700 border-amber-200',
    'In Consultation': 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-black px-2.5 py-0.5 rounded-full border ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function PatientsScreen() {
  const navigate = useNavigate();
  const perPage = 20;

  // ─── STATE MANAGEMENT ──────────────────────────────────────────────────────
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [dateFilter, setDateFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [consultationFilter, setConsultationFilter] = useState('All');
  const [clinicFilter, setClinicFilter] = useState('All Clinics');
  const [sortFilter, setSortFilter] = useState('Recently Added');

  // Active Summary Card Filter
  const [activeCardFilter, setActiveCardFilter] = useState<'All' | 'Today' | 'Active' | 'FollowUp'>('All');

  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [duplicateWarningPatient, setDuplicateWarningPatient] = useState<Patient | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('viziito_patients');
    if (saved) {
      try {
        setPatients(JSON.parse(saved));
      } catch (e) {
        setPatients(INITIAL_PATIENTS);
        localStorage.setItem('viziito_patients', JSON.stringify(INITIAL_PATIENTS));
      }
    } else {
      setPatients(INITIAL_PATIENTS);
      localStorage.setItem('viziito_patients', JSON.stringify(INITIAL_PATIENTS));
    }
  }, []);

  const syncPatients = (list: Patient[]) => {
    setPatients(list);
    localStorage.setItem('viziito_patients', JSON.stringify(list));
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── RESET FILTERS ──────────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setSearchTerm('');
    setDateFilter('All');
    setGenderFilter('All');
    setConsultationFilter('All');
    setClinicFilter('All Clinics');
    setSortFilter('Recently Added');
    setActiveCardFilter('All');
    setCurrentPage(1);
    showToast('All filters reset to default.', 'info');
  };

  // ─── FORM VALIDATION & SUBMISSION via Formik ─────────────────────────────────
  const patientFormik = useFormik({
    initialValues: {
      name: '',
      phone: '',
      gender: 'Male',
      age: '',
      dob: '',
      address: '',
      email: '',
      allergies: 'None'
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(3, 'Full Name must be at least 3 characters')
        .required('Full Name is mandatory'),
      phone: Yup.string()
        .matches(/^\d{10}$/, 'Mobile Number must be exactly 10 digits')
        .required('Mobile Number is mandatory'),
      gender: Yup.string().required('Gender selection is mandatory'),
      address: Yup.string().max(250, 'Address cannot exceed 250 characters'),
      email: Yup.string().email('Invalid email address')
    }),
    validate: (values) => {
      const errors: Record<string, string> = {};
      // Age or DOB is mandatory
      if (!values.age && !values.dob) {
        errors.age = 'Either Age or Date of Birth is mandatory';
      }
      return errors;
    },
    onSubmit: (values) => {
      // Validate mobile uniqueness
      // Clean target mobile input to check digits
      const targetPhoneDigits = values.phone.replace(/\D/g, '');
      const duplicatePatient = patients.find(p => {
        const pDigits = p.phone.replace(/\D/g, '');
        // Do not flag self when editing
        if (isEditModalOpen && selectedPatient && p.id === selectedPatient.id) {
          return false;
        }
        return pDigits === targetPhoneDigits;
      });

      if (duplicatePatient) {
        // Prevent creation & notify/display existing record
        setDuplicateWarningPatient(duplicatePatient);
        showToast(`Duplicate found: Mobile number linked to patient ${duplicatePatient.name} (${duplicatePatient.id})`, 'error');
        return;
      }

      if (isAddModalOpen) {
        // Add new patient
        const newUhid = `PAT${Math.floor(100000 + Math.random() * 900000)}`;
        const initials = values.name.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'PA';
        
        // Calculate age from DOB if DOB entered
        let calculatedAge = parseInt(values.age);
        if (values.dob && !values.age) {
          const birthYear = new Date(values.dob).getFullYear();
          calculatedAge = new Date().getFullYear() - birthYear;
        }

        const newPt: Patient = {
          id: newUhid,
          name: values.name,
          initials,
          age: calculatedAge || 30,
          dob: values.dob || '',
          gender: values.gender as any,
          phone: values.phone,
          email: values.email || `${values.name.toLowerCase().replace(/ /g, '')}@email.com`,
          address: values.address || '',
          lastVisit: 'Today',
          lastVisitType: 'In-Clinic',
          status: 'Active',
          registrationDate: 'Today',
          clinic: 'Current Clinic',
          appointments: 1,
          allergies: values.allergies || 'None'
        };

        const newList = [newPt, ...patients];
        syncPatients(newList);
        
        // Also save profile details record for PatientDetailScreen
        saveMockProfileDetails(newPt);

        setIsAddModalOpen(false);
        patientFormik.resetForm();
        showToast(`Patient ${newPt.name} successfully registered.`);
        // Save navigation rule: Save -> Navigate to Patient Profile
        navigate(`/patients/${newUhid}`);
      } else {
        // Save edited patient (Corrections)
        if (!selectedPatient) return;
        
        let calculatedAge = parseInt(values.age);
        if (values.dob && !values.age) {
          const birthYear = new Date(values.dob).getFullYear();
          calculatedAge = new Date().getFullYear() - birthYear;
        }

        const updatedList = patients.map(p => {
          if (p.id === selectedPatient.id) {
            return {
              ...p,
              name: values.name,
              phone: values.phone,
              gender: values.gender as any,
              age: calculatedAge || p.age,
              dob: values.dob || p.dob,
              address: values.address,
              email: values.email,
              allergies: values.allergies
            };
          }
          return p;
        });

        syncPatients(updatedList);
        updateMockProfileDetails(selectedPatient.id, values);

        setIsEditModalOpen(false);
        setSelectedPatient(null);
        patientFormik.resetForm();
        showToast('Patient details corrected successfully.');
      }
    }
  });

  const handleSaveAndStartConsultation = () => {
    // Manually trigger Formik submit logic with custom navigation override
    patientFormik.validateForm().then(errors => {
      if (Object.keys(errors).length === 0) {
        // Submit details
        const values = patientFormik.values;
        const targetPhoneDigits = values.phone.replace(/\D/g, '');
        const duplicatePatient = patients.find(p => p.phone.replace(/\D/g, '') === targetPhoneDigits);

        if (duplicatePatient) {
          setDuplicateWarningPatient(duplicatePatient);
          showToast(`Duplicate found: Mobile number linked to patient ${duplicatePatient.name}`, 'error');
          return;
        }

        const newUhid = `PAT${Math.floor(100000 + Math.random() * 900000)}`;
        const initials = values.name.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'PA';
        
        let calculatedAge = parseInt(values.age);
        if (values.dob && !values.age) {
          const birthYear = new Date(values.dob).getFullYear();
          calculatedAge = new Date().getFullYear() - birthYear;
        }

        const newPt: Patient = {
          id: newUhid,
          name: values.name,
          initials,
          age: calculatedAge || 30,
          dob: values.dob || '',
          gender: values.gender as any,
          phone: values.phone,
          email: values.email || `${values.name.toLowerCase().replace(/ /g, '')}@email.com`,
          address: values.address || '',
          lastVisit: 'Today',
          lastVisitType: 'In-Clinic',
          status: 'In Consultation', // Set status to In Consultation
          registrationDate: 'Today',
          clinic: 'Current Clinic',
          appointments: 1,
          allergies: values.allergies || 'None'
        };

        const newList = [newPt, ...patients];
        syncPatients(newList);
        saveMockProfileDetails(newPt);

        setIsAddModalOpen(false);
        patientFormik.resetForm();
        
        // Navigation: Save & Start Consultation -> Walk-In Registration / Consultation Details
        showToast(`Registered! Starting Consultation for ${newPt.name}...`);
        navigate(`/appointments/create?patientId=${newUhid}&type=walk_in`);
      } else {
        patientFormik.setTouched({
          name: true,
          phone: true,
          gender: true,
          age: true,
          dob: true
        });
        showToast('Please check the mandatory validation rules.', 'error');
      }
    });
  };

  const saveMockProfileDetails = (pt: Patient) => {
    const newDetail = {
      id: pt.id,
      name: pt.name,
      initials: pt.initials,
      avatarColor: 'bg-purple-100 text-purple-700',
      gender: pt.gender,
      age: pt.age,
      dob: pt.dob || '01 Jan 1995',
      phone: pt.phone,
      email: pt.email,
      address: pt.address,
      bloodGroup: 'O+',
      height: '172 cm',
      weight: '68 kg',
      allergies: pt.allergies,
      maritalStatus: 'Single',
      totalAppointments: 1,
      totalPrescriptions: 0,
      ongoingTreatments: 1,
      lastVisit: 'Today',
      lastVisitType: 'In-Clinic Consultation',
      chronicConditions: [],
      medications: [],
      recentAppointment: {
        date: 'Today',
        time: 'Just Now',
        type: 'In-Clinic Consultation',
        location: 'Clinic Suite A',
        status: 'Completed',
        reason: 'New Registration Checkup'
      },
      emergency: { name: 'None', phone: 'None' },
      notes: 'New patient registered.',
      notesDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      notesByDoctor: 'Dr. Arjun Reddy'
    };

    const savedDetails = localStorage.getItem('vizito_patient_details');
    let detailsDict: Record<string, any> = {};
    if (savedDetails) {
      try { detailsDict = JSON.parse(savedDetails); } catch (err) { }
    }
    detailsDict[pt.id] = newDetail;
    localStorage.setItem('vizito_patient_details', JSON.stringify(detailsDict));
  };

  const updateMockProfileDetails = (id: string, values: any) => {
    const savedDetails = localStorage.getItem('vizito_patient_details');
    if (savedDetails) {
      try {
        const detailsDict = JSON.parse(savedDetails);
        if (detailsDict[id]) {
          detailsDict[id] = {
            ...detailsDict[id],
            name: values.name,
            phone: values.phone,
            gender: values.gender,
            dob: values.dob || detailsDict[id].dob,
            age: parseInt(values.age) || detailsDict[id].age,
            address: values.address,
            email: values.email,
            allergies: values.allergies
          };
          localStorage.setItem('vizito_patient_details', JSON.stringify(detailsDict));
        }
      } catch (err) { }
    }
  };

  // Pre-fill fields for correction modal
  const openEditModal = (pt: Patient) => {
    setSelectedPatient(pt);
    patientFormik.setValues({
      name: pt.name,
      phone: pt.phone,
      gender: pt.gender,
      age: String(pt.age),
      dob: pt.dob || '',
      address: pt.address || '',
      email: pt.email || '',
      allergies: pt.allergies || 'None'
    });
    setIsEditModalOpen(true);
  };

  // ─── FILTER & SORT LOGIC ───────────────────────────────────────────────────
  const filteredPatientsList = useMemo(() => {
    return patients.filter(pt => {
      // 1. Search term check (Minimum 3 characters validation)
      const hasSearch = searchTerm.trim().length >= 3;
      const matchesSearch = !hasSearch || (
        pt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pt.phone.includes(searchTerm) ||
        pt.id.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // 2. Summary Card Auto-Filter Triggers
      if (activeCardFilter === 'Today' && pt.registrationDate !== 'Today') return false;
      if (activeCardFilter === 'Active' && pt.status !== 'Active') return false;
      if (activeCardFilter === 'FollowUp' && pt.status !== 'Follow-up Due') return false;

      // 3. Toolbar Filters
      const matchesDate = dateFilter === 'All' || pt.registrationDate === dateFilter;
      const matchesGender = genderFilter === 'All' || pt.gender === genderFilter;
      const matchesConsultation = consultationFilter === 'All' || pt.lastVisitType === consultationFilter;
      const matchesClinic = clinicFilter === 'All Clinics' || pt.clinic === clinicFilter;

      return matchesSearch && matchesDate && matchesGender && matchesConsultation && matchesClinic;
    });
  }, [patients, searchTerm, activeCardFilter, dateFilter, genderFilter, consultationFilter, clinicFilter]);

  // Sort Logic
  const sortedPatientsList = useMemo(() => {
    const list = [...filteredPatientsList];
    if (sortFilter === 'Name (A-Z)') {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortFilter === 'Name (Z-A)') {
      return list.sort((a, b) => b.name.localeCompare(a.name));
    }
    // Recently Added (Default) - sorting by UHID or list index descending
    return list.sort((a, b) => b.id.localeCompare(a.id));
  }, [filteredPatientsList, sortFilter]);

  // Paginated List
  const totalPages = Math.max(1, Math.ceil(sortedPatientsList.length / perPage));
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return sortedPatientsList.slice(start, start + perPage);
  }, [sortedPatientsList, currentPage]);

  return (
    <div className="w-full animate-fade pb-10">

      {/* ─── Toast System ─────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade flex items-center gap-3 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl max-w-sm">
          <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0 animate-ping" />
          <span className="text-xs font-bold leading-normal">{toast.message}</span>
        </div>
      )}

      {/* ─── Header Section ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Patient Management</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Search, register and manage patient profiles</p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto z-10">
          <button
            onClick={() => handleResetFilters()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-purple-300 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
          <button
            onClick={() => { patientFormik.resetForm(); setDuplicateWarningPatient(null); setIsAddModalOpen(true); }}
            className="flex-1 sm:flex-none bg-gradient-to-r from-[#7C3AED] to-[#5C2494] hover:opacity-95 text-white flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-md text-xs font-black cursor-pointer whitespace-nowrap active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Patient
          </button>
        </div>
      </div>

      {/* ─── Summary Cards Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Card 1: Total Patients */}
        <div 
          onClick={() => { setActiveCardFilter('All'); setCurrentPage(1); }}
          className={`bg-white border rounded-3xl p-5 shadow-xs flex items-center gap-3.5 cursor-pointer transition-all hover-grow ${
            activeCardFilter === 'All' ? 'border-[#7C3AED] bg-[#FAF5FF]/30' : 'border-slate-200/80'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-[#7C3AED] shrink-0 border border-purple-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Patients</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">{patients.length}</h3>
          </div>
        </div>

        {/* Card 2: New Patients Today */}
        <div 
          onClick={() => { setActiveCardFilter('Today'); setCurrentPage(1); }}
          className={`bg-white border rounded-3xl p-5 shadow-xs flex items-center gap-3.5 cursor-pointer transition-all hover-grow ${
            activeCardFilter === 'Today' ? 'border-[#7C3AED] bg-[#FAF5FF]/30' : 'border-slate-200/80'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">New Patients Today</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">
              {patients.filter(p => p.registrationDate === 'Today').length}
            </h3>
          </div>
        </div>

        {/* Card 3: Active Patients */}
        <div 
          onClick={() => { setActiveCardFilter('Active'); setCurrentPage(1); }}
          className={`bg-white border rounded-3xl p-5 shadow-xs flex items-center gap-3.5 cursor-pointer transition-all hover-grow ${
            activeCardFilter === 'Active' ? 'border-[#7C3AED] bg-[#FAF5FF]/30' : 'border-slate-200/80'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Patients</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">
              {patients.filter(p => p.status === 'Active').length}
            </h3>
          </div>
        </div>

        {/* Card 4: Follow-up Patients */}
        <div 
          onClick={() => { setActiveCardFilter('FollowUp'); setCurrentPage(1); }}
          className={`bg-white border rounded-3xl p-5 shadow-xs flex items-center gap-3.5 cursor-pointer transition-all hover-grow ${
            activeCardFilter === 'FollowUp' ? 'border-[#7C3AED] bg-[#FAF5FF]/30' : 'border-slate-200/80'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Follow-up Patients</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">
              {patients.filter(p => p.status === 'Follow-up Due').length}
            </h3>
          </div>
        </div>

      </div>

      {/* ─── Search and Filters Panel ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4 mb-6">
        
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-[#7C3AED] transition-all">
            <Search className="w-4 h-4 text-slate-450 shrink-0" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-transparent border-none focus:outline-none text-xs font-bold text-slate-700 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Additional Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {/* Date */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Registration Date</label>
            <div className="relative">
              <select
                value={dateFilter}
                onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="All">All Dates</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Gender</label>
            <div className="relative">
              <select
                value={genderFilter}
                onChange={e => { setGenderFilter(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="All">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Consultation Type */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Consultation Type</label>
            <div className="relative">
              <select
                value={consultationFilter}
                onChange={e => { setConsultationFilter(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="All">All Types</option>
                <option value="Walk-In">Walk-In</option>
                <option value="In-Clinic">In-Clinic</option>
                <option value="Video Consultation">Video Consultation</option>
                <option value="Home Visit">Home Visit</option>
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Clinic */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Clinic</label>
            <div className="relative">
              <select
                value={clinicFilter}
                onChange={e => { setClinicFilter(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="All Clinics">All Clinics</option>
                <option value="Current Clinic">Current Clinic</option>
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Sort</label>
            <div className="relative">
              <select
                value={sortFilter}
                onChange={e => { setSortFilter(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="Recently Added">Recently Added</option>
                <option value="Name (A-Z)">Name (A-Z)</option>
                <option value="Name (Z-A)">Name (Z-A)</option>
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

      </div>

      {/* ─── Search characters validation note ─── */}
      {searchTerm.trim().length > 0 && searchTerm.trim().length < 3 && (
        <div className="text-amber-600 font-extrabold text-[10px] flex items-center gap-1.5 mb-4 animate-fade pl-1">
          <AlertCircle className="w-3.5 h-3.5" /> Minimum 3 characters required to filter list by search query.
        </div>
      )}

      {/* ─── Patient List Table ────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">
                <th className="px-5 py-3">UHID</th>
                <th className="px-5 py-3">Patient Name</th>
                <th className="px-5 py-3">Mobile Number</th>
                <th className="px-5 py-3">Gender</th>
                <th className="px-5 py-3">Age</th>
                <th className="px-5 py-3">Last Visit</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPatients.length > 0 ? (
                paginatedPatients.map(pt => (
                  <tr 
                    key={pt.id} 
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/patients/${pt.id}`)}
                  >
                    {/* UHID */}
                    <td className="px-5 py-3.5 text-xs font-mono font-bold text-slate-500">{pt.id}</td>
                    
                    {/* Name */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-[10px]">
                          {pt.initials}
                        </div>
                        <span className="text-xs font-extrabold text-slate-800">{pt.name}</span>
                      </div>
                    </td>

                    {/* Mobile Number */}
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-700">{pt.phone}</td>
                    
                    {/* Gender */}
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-500">{pt.gender}</td>
                    
                    {/* Age */}
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-700">{pt.age}</td>
                    
                    {/* Last Visit */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="text-xs font-bold text-slate-700">{pt.lastVisit}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{pt.lastVisitType}</p>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusBadge status={pt.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Profile */}
                        <button 
                          onClick={() => navigate(`/patients/${pt.id}?tab=Overview`)}
                          className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="View Profile Overview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Start Consultation */}
                        <button 
                          onClick={() => navigate(`/appointments/create?patientId=${pt.id}&type=walk_in`)}
                          className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Start Walk-In Consultation"
                        >
                          <Play className="w-4 h-4" />
                        </button>

                        {/* Appointment History */}
                        <button 
                          onClick={() => navigate(`/patients/${pt.id}?tab=Appointments`)}
                          className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Appointment History"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>

                        {/* Prescription History */}
                        <button 
                          onClick={() => navigate(`/patients/${pt.id}?tab=Prescriptions`)}
                          className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Prescription History"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {/* Edit Patient (Corrections) */}
                        <button 
                          onClick={() => openEditModal(pt)}
                          className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Patient Details"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    No patients found. Click "Add Patient" to register a new record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
          <p className="text-xs text-slate-500 font-bold">
            Showing {Math.min((currentPage - 1) * perPage + 1, sortedPatientsList.length)}–{Math.min(currentPage * perPage, sortedPatientsList.length)} of {sortedPatientsList.length} patients
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-550 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-550 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── ADD / EDIT PATIENT DIALOG ───────────────────────────────────────── */}
      {(isAddModalOpen || isEditModalOpen) && createPortal(
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-fade"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <h3 className="text-base font-black text-slate-800">
                {isAddModalOpen ? 'Add Patient' : `Edit Patient Details: ${selectedPatient?.id}`}
              </h3>
              <button
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                className="p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {duplicateWarningPatient && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl p-4 mb-4 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-extrabold uppercase">Duplicate Mobile Number Detected</p>
                  <p className="mt-1 leading-normal">
                    This phone number is already registered to: <b>{duplicateWarningPatient.name}</b> (UHID: <b>{duplicateWarningPatient.id}</b>).
                    Double check the number or navigate to their profile below.
                  </p>
                  <button 
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsEditModalOpen(false);
                      navigate(`/patients/${duplicateWarningPatient.id}`);
                    }}
                    className="mt-2 text-rose-800 underline font-black block cursor-pointer"
                  >
                    View existing patient profile →
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={patientFormik.handleSubmit} className="space-y-4 text-left">
              
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text"
                  name="name"
                  placeholder="Minimum 3 characters"
                  value={patientFormik.values.name}
                  onChange={patientFormik.handleChange}
                  onBlur={patientFormik.handleBlur}
                  className="form-control"
                />
                {patientFormik.touched.name && patientFormik.errors.name && (
                  <p className="text-rose-500 text-[10px] font-extrabold mt-1">{patientFormik.errors.name}</p>
                )}
              </div>

              {/* Mobile Number */}
              <div className="form-group">
                <label className="form-label">Mobile Number (10 Digits) *</label>
                <input 
                  type="text"
                  name="phone"
                  placeholder="e.g. 9876543210"
                  value={patientFormik.values.phone}
                  onChange={e => {
                    setDuplicateWarningPatient(null);
                    patientFormik.handleChange(e);
                  }}
                  onBlur={patientFormik.handleBlur}
                  className="form-control"
                />
                {patientFormik.touched.phone && patientFormik.errors.phone && (
                  <p className="text-rose-500 text-[10px] font-extrabold mt-1">{patientFormik.errors.phone}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gender */}
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select 
                    name="gender"
                    value={patientFormik.values.gender}
                    onChange={patientFormik.handleChange}
                    onBlur={patientFormik.handleBlur}
                    className="form-control cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {patientFormik.touched.gender && patientFormik.errors.gender && (
                    <p className="text-rose-500 text-[10px] font-extrabold mt-1">{patientFormik.errors.gender}</p>
                  )}
                </div>

                {/* Age or DOB mandatory group */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-group">
                    <label className="form-label">Age *</label>
                    <input 
                      type="number"
                      name="age"
                      placeholder="Age"
                      value={patientFormik.values.age}
                      onChange={patientFormik.handleChange}
                      onBlur={patientFormik.handleBlur}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">DOB *</label>
                    <input 
                      type="date"
                      name="dob"
                      value={patientFormik.values.dob}
                      onChange={patientFormik.handleChange}
                      onBlur={patientFormik.handleBlur}
                      className="form-control cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              {patientFormik.errors.age && (
                <p className="text-rose-500 text-[10px] font-extrabold -mt-2 mb-2">{patientFormik.errors.age}</p>
              )}

              {/* Address */}
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea 
                  name="address"
                  placeholder="Maximum 250 characters"
                  value={patientFormik.values.address}
                  onChange={patientFormik.handleChange}
                  onBlur={patientFormik.handleBlur}
                  className="form-control h-16"
                />
                {patientFormik.touched.address && patientFormik.errors.address && (
                  <p className="text-rose-500 text-[10px] font-extrabold mt-1">{patientFormik.errors.address}</p>
                )}
              </div>

              {/* Optional Allergies */}
              <div className="form-group">
                <label className="form-label">Known Allergies</label>
                <input 
                  type="text"
                  name="allergies"
                  placeholder="e.g. Sulfa, Peanuts, None"
                  value={patientFormik.values.allergies}
                  onChange={patientFormik.handleChange}
                  className="form-control"
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer order-3 sm:order-1 active:scale-95"
                >
                  Cancel
                </button>
                {isAddModalOpen && (
                  <button
                    type="button"
                    onClick={handleSaveAndStartConsultation}
                    className="bg-[#5C2494] hover:bg-[#4D1B80] text-white text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer order-2 active:scale-95 whitespace-nowrap"
                  >
                    Save &amp; Start Consultation
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black py-2.5 px-5 rounded-xl cursor-pointer order-1 active:scale-95"
                >
                  {isAddModalOpen ? 'Save' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
