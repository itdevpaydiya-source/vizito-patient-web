import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  MapPin,
  User,
  Calendar,
  Clock,
  Plus,
  X,
  Download,
  Eye,
  Printer,
  FileText,
  AlertCircle,
  Play,
  RotateCcw,
  CheckCircle,
  FileDown,
  Activity,
  UserCheck
} from 'lucide-react';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface PatientData {
  id: string; // UHID
  name: string;
  initials: string;
  avatarColor: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  dob: string;
  phone: string; // Mobile Number
  email: string;
  address: string;
  bloodGroup: string;
  height: string;
  weight: string;
  allergies: string;
  maritalStatus: string;
  totalAppointments: number;
  totalPrescriptions: number;
  ongoingTreatments: number;
  lastVisit: string;
  lastVisitType: string;
  emergency: { name: string; phone: string };
  notes: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  type: string; // Consultation Type
  doctor: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  reason: string;
}

interface PrescriptionItem {
  id: string; // Prescription ID
  date: string;
  diagnosis: string;
  medications: { name: string; dosage: string; frequency: string; duration: string }[];
  templateUsed: string; // Template Used (Spec requirement)
  status: 'Sent' | 'Draft' | 'Expired';
}

interface MedicalRecord {
  id: string;
  name: string;
  uploadDate: string;
  fileSize: string;
  category: string;
}

interface TimelineEvent {
  title: string;
  desc: string;
  date: string;
  time: string;
  type: 'Registered' | 'Consultation' | 'Prescription' | 'Follow-up';
}

// ─── Mock Fallbacks ──────────────────────────────────────────────────────────
const MOCK_PATIENT_DETAILS: Record<string, PatientData> = {
  'PAT123456': {
    id: 'PAT123456',
    name: 'Amit Sharma',
    initials: 'AS',
    avatarColor: 'bg-purple-100 text-purple-700',
    gender: 'Male',
    age: 32,
    dob: '1993-05-14',
    phone: '9876543210',
    email: 'amit.sharma@email.com',
    address: 'H.No. 12-3-45, Banjara Hills, Hyderabad, Telangana - 500034',
    bloodGroup: 'B+',
    height: '175 cm',
    weight: '72 kg',
    allergies: 'Penicillin',
    maritalStatus: 'Married',
    totalAppointments: 18,
    totalPrescriptions: 12,
    ongoingTreatments: 2,
    lastVisit: 'Today',
    lastVisitType: 'In-Clinic Consultation',
    emergency: { name: 'Rahul Sharma (Brother)', phone: '9123456789' },
    notes: 'Patient is responding well to hypertension management routine.'
  },
  'PAT123457': {
    id: 'PAT123457',
    name: 'Priya Singh',
    initials: 'PS',
    avatarColor: 'bg-purple-100 text-purple-700',
    gender: 'Female',
    age: 28,
    dob: '1997-08-20',
    phone: '9123456789',
    email: 'priya.singh@email.com',
    address: 'Flat 4B, Jubilee Hills, Hyderabad, Telangana - 500033',
    bloodGroup: 'O+',
    height: '162 cm',
    weight: '58 kg',
    allergies: 'None',
    maritalStatus: 'Single',
    totalAppointments: 12,
    totalPrescriptions: 8,
    ongoingTreatments: 1,
    lastVisit: 'Yesterday',
    lastVisitType: 'Video Consultation',
    emergency: { name: 'Kavita Singh (Mother)', phone: '9876511111' },
    notes: 'Scheduled for lipid profile review next week.'
  }
};

const MOCK_APPOINTMENTS: Record<string, Appointment[]> = {
  'PAT123456': [
    { id: 'APT-98210', date: '28 May 2025', time: '11:30 AM', type: 'In-Clinic Consultation', doctor: 'Dr. Arjun Reddy', status: 'Completed', reason: 'Chest checkup and BP review' },
    { id: 'APT-97120', date: '10 May 2025', time: '02:00 PM', type: 'Video Consultation', doctor: 'Dr. Arjun Reddy', status: 'Completed', reason: 'Hypertension routine followup' },
    { id: 'APT-96301', date: '12 Apr 2025', time: '10:00 AM', type: 'In-Clinic Consultation', doctor: 'Dr. Arjun Reddy', status: 'Completed', reason: 'Intake analysis' }
  ],
  'PAT123457': [
    { id: 'APT-98211', date: '27 May 2025', time: '10:30 AM', type: 'Video Consultation', doctor: 'Dr. Arjun Reddy', status: 'Completed', reason: 'Regular consult' }
  ]
};

const MOCK_PRESCRIPTIONS: Record<string, PrescriptionItem[]> = {
  'PAT123456': [
    { id: 'RX-2025-0007', date: '28 May 2025', diagnosis: 'Acute Bronchitis', templateUsed: 'General Medicine Pad v2', status: 'Sent', medications: [{ name: 'Azithromycin 500mg', dosage: '500mg', frequency: 'Once daily after food', duration: '5 Days' }, { name: 'Paracetamol 650mg', dosage: '650mg', frequency: 'Thrice daily if fever', duration: '3 Days' }] },
    { id: 'RX-2025-0005', date: '10 May 2025', diagnosis: 'Essential Hypertension', templateUsed: 'Hypertension Care Template', status: 'Sent', medications: [{ name: 'Telmisartan 40mg', dosage: '40mg', frequency: 'Once daily after food', duration: 'Continuous' }] }
  ],
  'PAT123457': [
    { id: 'RX-2025-0008', date: '27 May 2025', diagnosis: 'Mild Acid Reflux', templateUsed: 'Standard GP Template', status: 'Sent', medications: [{ name: 'Pantoprazole 40mg', dosage: '40mg', frequency: 'Once daily before breakfast', duration: '14 Days' }] }
  ]
};

const MOCK_MEDICAL_RECORDS: Record<string, MedicalRecord[]> = {
  'PAT123456': [
    { id: 'DOC-001', name: 'Lipid Profile Report.pdf', uploadDate: '25 May 2025', fileSize: '2.4 MB', category: 'Blood Report' },
    { id: 'DOC-002', name: 'ECG Graph Report.pdf', uploadDate: '12 Apr 2025', fileSize: '4.1 MB', category: 'ECG' }
  ],
  'PAT123457': [
    { id: 'DOC-003', name: 'Thyroid Panel T3 T4 TSH.pdf', uploadDate: '26 May 2025', fileSize: '1.9 MB', category: 'Blood Report' }
  ]
};

const MOCK_TIMELINE_EVENTS: Record<string, TimelineEvent[]> = {
  'PAT123456': [
    { title: 'Prescription Issued', desc: 'Prescription RX-2025-0007 was successfully generated and sent to patient.', date: '28 May 2025', time: '11:45 AM', type: 'Prescription' },
    { title: 'Consultation Completed', desc: 'In-Clinic Consultation APT-98210 completed by Dr. Arjun Reddy.', date: '28 May 2025', time: '11:30 AM', type: 'Consultation' },
    { title: 'Follow-up Created', desc: 'Recommended BP follow-up consultation in 14 days.', date: '28 May 2025', time: '11:30 AM', type: 'Follow-up' },
    { title: 'Patient Registered', desc: 'Patient registered successfully in vizito clinics. UHID PAT123456 allocated.', date: '12 Apr 2025', time: '09:30 AM', type: 'Registered' }
  ],
  'PAT123457': [
    { title: 'Consultation Completed', desc: 'Video Consultation APT-98211 completed successfully.', date: '27 May 2025', time: '10:45 AM', type: 'Consultation' }
  ]
};

const TABS = ['Overview', 'Appointments', 'Prescriptions', 'Medical Records', 'Timeline'] as const;
type ActiveTab = typeof TABS[number];

export default function PatientDetailScreen() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeId = patientId ?? 'PAT123456';
  
  // ─── STATE MANAGEMENT ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('Overview');
  const [patient, setPatient] = useState<PatientData | null>(null);
  
  // Lists
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewRxModalOpen, setIsViewRxModalOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState<PrescriptionItem | null>(null);
  
  const [isViewApptModalOpen, setIsViewApptModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync state with URL parameter tab overrides
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && TABS.includes(urlTab as any)) {
      setActiveTab(urlTab as ActiveTab);
    }
  }, [searchParams]);

  // Load from local storage or mock fallbacks
  useEffect(() => {
    // 1. Details load
    const savedDetails = localStorage.getItem('vizito_patient_details');
    let loadedDetail: PatientData | null = null;
    let detailsDict: Record<string, PatientData> = {};

    if (savedDetails) {
      try {
        detailsDict = JSON.parse(savedDetails);
        loadedDetail = detailsDict[activeId] || null;
      } catch (err) { }
    }

    if (!loadedDetail) {
      // Try fetching from the PatientsScreen basic list matches
      const savedBasic = localStorage.getItem('viziito_patients');
      let basicMatch: any = null;
      if (savedBasic) {
        try {
          const list = JSON.parse(savedBasic);
          basicMatch = list.find((p: any) => p.id === activeId);
        } catch (e) { }
      }

      if (basicMatch) {
        loadedDetail = {
          id: basicMatch.id,
          name: basicMatch.name,
          initials: basicMatch.initials,
          avatarColor: 'bg-purple-100 text-purple-700',
          gender: basicMatch.gender,
          age: basicMatch.age,
          dob: basicMatch.dob || '1995-01-01',
          phone: basicMatch.phone,
          email: basicMatch.email,
          address: basicMatch.address || 'H.No. 45/A, Gachibowli, Hyderabad',
          bloodGroup: 'O+',
          height: '172 cm',
          weight: '68 kg',
          allergies: basicMatch.allergies || 'None',
          maritalStatus: 'Single',
          totalAppointments: basicMatch.appointments || 1,
          totalPrescriptions: 0,
          ongoingTreatments: 1,
          lastVisit: basicMatch.lastVisit || 'Today',
          lastVisitType: basicMatch.lastVisitType || 'In-Clinic Consultation',
          emergency: { name: 'None', phone: 'None' },
          notes: 'Regular checkup.'
        };
      } else {
        loadedDetail = MOCK_PATIENT_DETAILS[activeId] || MOCK_PATIENT_DETAILS['PAT123456'];
      }

      // Sync back to store
      detailsDict[activeId] = loadedDetail;
      localStorage.setItem('vizito_patient_details', JSON.stringify(detailsDict));
    }

    setPatient(loadedDetail);

    // 2. Appointments load
    const savedAppts = localStorage.getItem(`vizito_appts_${activeId}`);
    if (savedAppts) {
      try { setAppointments(JSON.parse(savedAppts)); } catch (err) { }
    } else {
      const initialAppts = MOCK_APPOINTMENTS[activeId] || MOCK_APPOINTMENTS['PAT123456'];
      setAppointments(initialAppts);
      localStorage.setItem(`vizito_appts_${activeId}`, JSON.stringify(initialAppts));
    }

    // 3. Prescriptions load
    const savedGlobalRx = localStorage.getItem('vizito_prescriptions');
    let matchingRx: PrescriptionItem[] = [];
    if (savedGlobalRx) {
      try {
        const allRx = JSON.parse(savedGlobalRx);
        matchingRx = allRx.filter((r: any) => r.patientId === activeId);
      } catch (err) { }
    }
    
    if (matchingRx.length === 0) {
      matchingRx = MOCK_PRESCRIPTIONS[activeId] || MOCK_PRESCRIPTIONS['PAT123456'];
    }
    setPrescriptions(matchingRx);

    // 4. Medical Records load
    setMedicalRecords(MOCK_MEDICAL_RECORDS[activeId] || MOCK_MEDICAL_RECORDS['PAT123456']);

    // 5. Timeline load
    setTimelineEvents(MOCK_TIMELINE_EVENTS[activeId] || MOCK_TIMELINE_EVENTS['PAT123456']);

  }, [activeId]);

  // ─── EDIT PATIENT CORRECTIONS FORM (Formik validation) ──────────────────────
  const editFormik = useFormik({
    initialValues: {
      name: '',
      phone: '',
      gender: 'Male',
      age: '',
      dob: '',
      address: '',
      email: '',
      bloodGroup: 'B+',
      allergies: 'None',
      maritalStatus: 'Single',
      emergencyName: '',
      emergencyPhone: ''
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(3, 'Full Name must be at least 3 characters')
        .required('Full Name is mandatory'),
      phone: Yup.string()
        .matches(/^\d{10}$/, 'Mobile number must be exactly 10 digits')
        .required('Mobile number is mandatory'),
      gender: Yup.string().required('Gender selection is mandatory'),
      address: Yup.string().max(250, 'Address cannot exceed 250 characters'),
      email: Yup.string().email('Invalid email address')
    }),
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.age && !values.dob) {
        errors.age = 'Either Age or Date of Birth is mandatory';
      }
      return errors;
    },
    onSubmit: (values) => {
      if (!patient) return;

      // Validate uniqueness of mobile number (except self)
      const targetPhoneDigits = values.phone.replace(/\D/g, '');
      const savedBasic = localStorage.getItem('viziito_patients');
      let isDuplicate = false;
      if (savedBasic) {
        try {
          const list = JSON.parse(savedBasic);
          isDuplicate = list.some((p: any) => p.id !== activeId && p.phone.replace(/\D/g, '') === targetPhoneDigits);
        } catch (e) { }
      }

      if (isDuplicate) {
        showToast('Duplicate found: Mobile number linked to another patient profile.', 'error');
        return;
      }

      const names = values.name.trim().split(' ');
      const initials = names.length > 1 ? (names[0][0] + names[names.length - 1][0]).toUpperCase() : names[0][0].toUpperCase();

      let calculatedAge = parseInt(values.age);
      if (values.dob && !values.age) {
        const birthYear = new Date(values.dob).getFullYear();
        calculatedAge = new Date().getFullYear() - birthYear;
      }

      const updatedPat: PatientData = {
        ...patient,
        name: values.name,
        dob: values.dob,
        gender: values.gender as any,
        initials,
        phone: values.phone,
        email: values.email,
        address: values.address,
        bloodGroup: values.bloodGroup,
        allergies: values.allergies,
        maritalStatus: values.maritalStatus,
        age: calculatedAge || patient.age,
        emergency: {
          name: values.emergencyName,
          phone: values.emergencyPhone
        }
      };

      setPatient(updatedPat);

      // Save back to details list in localStorage
      const savedDetails = localStorage.getItem('vizito_patient_details');
      if (savedDetails) {
        try {
          const detailsDict = JSON.parse(savedDetails);
          detailsDict[activeId] = updatedPat;
          localStorage.setItem('vizito_patient_details', JSON.stringify(detailsDict));
        } catch (err) { }
      }

      // Sync back basic list in localStorage
      if (savedBasic) {
        try {
          const basicList = JSON.parse(savedBasic);
          const updatedBasic = basicList.map((p: any) => {
            if (p.id === activeId) {
              return {
                ...p,
                name: values.name,
                initials,
                phone: values.phone,
                email: values.email,
                gender: values.gender,
                age: calculatedAge || p.age,
                dob: values.dob,
                allergies: values.allergies
              };
            }
            return p;
          });
          localStorage.setItem('viziito_patients', JSON.stringify(updatedBasic));
        } catch (err) { }
      }

      setIsEditModalOpen(false);
      showToast('Patient details corrected successfully.');
    }
  });

  const handleOpenEdit = () => {
    if (!patient) return;
    editFormik.setValues({
      name: patient.name,
      phone: patient.phone,
      gender: patient.gender,
      age: String(patient.age),
      dob: patient.dob || '',
      address: patient.address || '',
      email: patient.email || '',
      bloodGroup: patient.bloodGroup || 'O+',
      allergies: patient.allergies || 'None',
      maritalStatus: patient.maritalStatus || 'Single',
      emergencyName: patient.emergency.name || '',
      emergencyPhone: patient.emergency.phone || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSimulateDownload = (title: string) => {
    showToast(`Downloading ${title} as PDF...`, 'info');
    setTimeout(() => {
      showToast(`${title} PDF downloaded successfully.`);
    }, 1000);
  };

  const handleSimulatePrint = () => {
    showToast('Spawning Print preview...', 'info');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  if (!patient) {
    return (
      <div className="py-20 text-center text-slate-500 font-extrabold animate-fade">
        Loading patient demographics...
      </div>
    );
  }

  // ─── TAB VIEW: OVERVIEW ─────────────────────────────────────────────────────
  const renderOverviewTab = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Demographics and Contact */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Patient Information Panel */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-left">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Patient Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border-b border-slate-50 pb-2 flex justify-between text-xs">
                <span className="text-slate-400 font-bold">Full Registered Name</span>
                <span className="font-extrabold text-slate-800">{patient.name}</span>
              </div>
              <div className="border-b border-slate-50 pb-2 flex justify-between text-xs">
                <span className="text-slate-400 font-bold">UHID (Patient ID)</span>
                <span className="font-mono font-bold text-slate-800">{patient.id}</span>
              </div>
              <div className="border-b border-slate-50 pb-2 flex justify-between text-xs">
                <span className="text-slate-400 font-bold">Date of Birth</span>
                <span className="font-semibold text-slate-800">{patient.dob || 'Not recorded'}</span>
              </div>
              <div className="border-b border-slate-50 pb-2 flex justify-between text-xs">
                <span className="text-slate-400 font-bold">Age</span>
                <span className="font-bold text-slate-800">{patient.age} Years</span>
              </div>
              <div className="border-b border-slate-50 pb-2 flex justify-between text-xs">
                <span className="text-slate-400 font-bold">Gender</span>
                <span className="font-semibold text-slate-800">{patient.gender}</span>
              </div>
              <div className="border-b border-slate-50 pb-2 flex justify-between text-xs">
                <span className="text-slate-400 font-bold">Marital Status</span>
                <span className="font-semibold text-slate-800">{patient.maritalStatus || 'Single'}</span>
              </div>
              <div className="border-b border-slate-50 pb-2 flex justify-between text-xs">
                <span className="text-slate-400 font-bold">Blood Group</span>
                <span className="font-extrabold text-slate-850">{patient.bloodGroup || 'O+'}</span>
              </div>
            </div>
          </div>

          {/* Contact Information Panel */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-left">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Contact Information</h3>
            
            <div className="space-y-3.5 text-xs">
              <div className="border-b border-slate-50 pb-2 flex justify-between">
                <span className="text-slate-400 font-bold">Mobile Number</span>
                <span className="font-extrabold text-slate-800">{patient.phone}</span>
              </div>
              <div className="border-b border-slate-50 pb-2 flex justify-between">
                <span className="text-slate-400 font-bold">Email Address</span>
                <span className="font-semibold text-slate-800">{patient.email || 'Not provided'}</span>
              </div>
              <div className="border-b border-slate-50 pb-2 flex flex-col gap-1">
                <span className="text-slate-400 font-bold">Address Details</span>
                <span className="font-medium text-slate-700 leading-normal">{patient.address || 'No address added'}</span>
              </div>
            </div>
          </div>

          {/* Clinical Summaries */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Last Visit */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Last Visit</p>
              <h3 className="text-base font-black text-slate-800 mt-1">{patient.lastVisit}</h3>
              <p className="text-[10px] text-[#7C3AED] font-bold mt-1.5">{patient.lastVisitType}</p>
            </div>

            {/* Total Visits */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Visits</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{appointments.length}</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-2">Completed appointments</p>
            </div>

            {/* Allergies */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Allergies</p>
              <h3 className={`text-base font-black mt-1 ${
                patient.allergies && patient.allergies.toLowerCase() !== 'none' ? 'text-rose-600' : 'text-slate-750'
              }`}>
                {patient.allergies || 'None'}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-2">Self reported drug allergies</p>
            </div>

          </div>

        </div>

        {/* Right: Quick Action Buttons & Emergency Contact */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Quick Actions Panel */}
          <div className="bg-[#FAF5FF] border border-purple-100 rounded-3xl p-5 shadow-xs text-left">
            <h3 className="text-xs font-black text-purple-750 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-600" />
              Patient Actions
            </h3>
            
            <div className="space-y-2.5">
              {/* Start Consultation */}
              <button 
                onClick={() => navigate(`/appointments/create?patientId=${activeId}&type=walk_in`)}
                className="w-full flex items-center justify-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-2.5 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-white text-[#7C3AED]" /> Start Consultation
              </button>

              {/* View Appointments */}
              <button 
                onClick={() => { setActiveTab('Appointments'); setSearchParams({ tab: 'Appointments' }); }}
                className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-purple-300 text-slate-700 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> View Appointments
              </button>

              {/* View Prescriptions */}
              <button 
                onClick={() => { setActiveTab('Prescriptions'); setSearchParams({ tab: 'Prescriptions' }); }}
                className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-purple-300 text-slate-700 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" /> View Prescriptions
              </button>
            </div>
          </div>

          {/* Emergency Contact Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs text-left">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Emergency Contact</h3>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-800 truncate">{patient.emergency.name || 'Not provided'}</p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">{patient.emergency.phone || '—'}</p>
              </div>
            </div>
          </div>

          {/* Notes (Internal) */}
          {patient.notes && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs text-left">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Internal Notes</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold italic">"{patient.notes}"</p>
            </div>
          )}

        </div>

      </div>
    );
  };

  // ─── TAB VIEW: APPOINTMENTS ─────────────────────────────────────────────────
  const renderAppointmentsTab = () => {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden animate-fade text-left">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/20">
          <h3 className="text-sm font-extrabold text-slate-850">Appointment History</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Logs of scheduled and finished sessions</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Consultation Type</th>
                <th className="px-5 py-3">Doctor</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.length > 0 ? (
                appointments.map(appt => (
                  <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs font-bold text-slate-800">
                      <p>{appt.date}</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">{appt.time}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-700">{appt.type}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{appt.doctor}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        appt.status === 'Upcoming' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button 
                        onClick={() => { setSelectedAppt(appt); setIsViewApptModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                        title="View Appointment Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">No appointment history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── TAB VIEW: PRESCRIPTIONS ────────────────────────────────────────────────
  const renderPrescriptionsTab = () => {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden animate-fade text-left">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/20">
          <h3 className="text-sm font-extrabold text-slate-850">Prescription History</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Logs of generated pharmaceutical cards</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Prescription ID</th>
                <th className="px-5 py-3">Template Used</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prescriptions.length > 0 ? (
                prescriptions.map(rx => (
                  <tr key={rx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-850">{rx.date}</td>
                    <td className="px-5 py-3.5 text-xs font-mono font-bold text-slate-500">{rx.id}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 font-semibold">{rx.templateUsed}</td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Rx */}
                        <button 
                          onClick={() => { setSelectedRx(rx); setIsViewRxModalOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-[#7C3AED] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="View Rx details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Download PDF */}
                        <button 
                          onClick={() => handleSimulateDownload(rx.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Download PDF statement"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {/* Print Preview */}
                        <button 
                          onClick={() => handleSimulatePrint()}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Print Prescription Pad"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-bold">No prescription records linked.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── TAB VIEW: MEDICAL RECORDS ──────────────────────────────────────────────
  const renderMedicalRecordsTab = () => {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden animate-fade text-left">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/20">
          <h3 className="text-sm font-extrabold text-slate-850">Medical Records</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Uploaded diagnostic files and consultation sheets</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">
                <th className="px-5 py-3">Document Name</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Upload Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {medicalRecords.length > 0 ? (
                medicalRecords.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-850">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <p>{doc.name}</p>
                          <p className="text-[9px] text-slate-450 font-semibold">{doc.fileSize}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 font-semibold">{doc.category}</td>
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-700">{doc.uploadDate}</td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => showToast(`Opening document ${doc.name}...`, 'info')}
                          className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="View Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleSimulateDownload(doc.name)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Download Document"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-bold">No uploaded files associated.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── TAB VIEW: TIMELINE ─────────────────────────────────────────────────────
  const renderTimelineTab = () => {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-fade text-left">
        <h3 className="text-sm font-extrabold text-slate-850 mb-6 border-b border-slate-100 pb-3">Patient Activity Timeline</h3>
        
        <div className="relative border-l border-slate-100 pl-6 ml-3 space-y-6">
          {timelineEvents.map((evt, idx) => (
            <div key={idx} className="relative">
              {/* Point Node */}
              <span className={`absolute -left-[37px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center ${
                evt.type === 'Registered' ? 'text-[#7C3AED] bg-purple-50 border-purple-100' :
                evt.type === 'Consultation' ? 'text-blue-600 bg-blue-50 border-blue-100' :
                evt.type === 'Prescription' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                'text-amber-500 bg-amber-50 border-amber-105'
              }`}>
                {evt.type === 'Registered' && <UserCheck className="w-3.5 h-3.5" />}
                {evt.type === 'Consultation' && <Play className="w-3.5 h-3.5 text-blue-500" />}
                {evt.type === 'Prescription' && <FileText className="w-3.5 h-3.5" />}
                {evt.type === 'Follow-up' && <Clock className="w-3.5 h-3.5" />}
              </span>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-800">{evt.title}</h4>
                  <p className="text-slate-500 font-semibold mt-1 leading-relaxed max-w-xl">{evt.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-slate-400 block">{evt.date}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{evt.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10">

      {/* ─── Header Navigation ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-[#7C3AED] transition-colors cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Patient Management
        </button>
        <div className="flex items-center gap-2">
          {/* Edit Patient (Dedicated Correction Action Modal trigger) */}
          <button
            onClick={handleOpenEdit}
            className="flex items-center gap-2 bg-gradient-to-r from-[#7C3AED] to-[#5C2494] hover:opacity-95 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit Patient
          </button>
        </div>
      </div>

      {/* ─── Profile Avatar card ──────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-left">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-extrabold shrink-0 ${patient.avatarColor}`}>
            {patient.initials}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-slate-800 leading-tight">{patient.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500 font-semibold">
              <span>{patient.gender}</span>
              <span className="text-slate-300">•</span>
              <span>{patient.age} Years</span>
              <span className="text-slate-300">•</span>
              <span>UHID: {patient.id}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-650">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {patient.phone}
              </span>
              {patient.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {patient.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabs Navigation bar ──────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="flex items-end gap-1 px-4 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearchParams({ tab }); }}
              className={`relative px-4.5 py-3.5 text-xs font-black transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab ? 'text-[#7C3AED]' : 'text-slate-450 hover:text-slate-800'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.75 bg-[#7C3AED] rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Active Tab layout ────────────────────────────────────────────── */}
      <div className="w-full">
        {activeTab === 'Overview'     && renderOverviewTab()}
        {activeTab === 'Appointments' && renderAppointmentsTab()}
        {activeTab === 'Prescriptions' && renderPrescriptionsTab()}
        {activeTab === 'Medical Records' && renderMedicalRecordsTab()}
        {activeTab === 'Timeline'     && renderTimelineTab()}
      </div>

      {/* ─── CORRECTION DEDICATED EDIT MODAL ─────────────────────────────────── */}
      {isEditModalOpen && createPortal(
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-fade"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 text-left">
              <div>
                <h3 className="text-base font-black text-slate-850">Correct Patient Demographics</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Edit patient records or fix mobile number typos</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-55 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editFormik.handleSubmit} className="space-y-4 text-left">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={editFormik.values.name}
                  onChange={editFormik.handleChange}
                  onBlur={editFormik.handleBlur}
                  className="form-control"
                />
                {editFormik.touched.name && editFormik.errors.name && (
                  <p className="text-rose-500 text-[10px] font-extrabold mt-1">{editFormik.errors.name}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input
                  type="text"
                  name="phone"
                  value={editFormik.values.phone}
                  onChange={editFormik.handleChange}
                  onBlur={editFormik.handleBlur}
                  className="form-control"
                />
                {editFormik.touched.phone && editFormik.errors.phone && (
                  <p className="text-rose-500 text-[10px] font-extrabold mt-1">{editFormik.errors.phone}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select
                    name="gender"
                    value={editFormik.values.gender}
                    onChange={editFormik.handleChange}
                    className="form-control cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-group">
                    <label className="form-label">Age *</label>
                    <input
                      type="number"
                      name="age"
                      value={editFormik.values.age}
                      onChange={editFormik.handleChange}
                      onBlur={editFormik.handleBlur}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">DOB *</label>
                    <input
                      type="date"
                      name="dob"
                      value={editFormik.values.dob}
                      onChange={editFormik.handleChange}
                      onBlur={editFormik.handleBlur}
                      className="form-control cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              {editFormik.errors.age && (
                <p className="text-rose-500 text-[10px] font-extrabold -mt-2 mb-2">{editFormik.errors.age}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={editFormik.values.email}
                    onChange={editFormik.handleChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select
                    name="bloodGroup"
                    value={editFormik.values.bloodGroup}
                    onChange={editFormik.handleChange}
                    className="form-control cursor-pointer"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  name="address"
                  value={editFormik.values.address}
                  onChange={editFormik.handleChange}
                  className="form-control h-16"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Allergies</label>
                <input
                  type="text"
                  name="allergies"
                  value={editFormik.values.allergies}
                  onChange={editFormik.handleChange}
                  className="form-control"
                />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wide mb-3">Emergency Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Contact Name</label>
                    <input
                      type="text"
                      name="emergencyName"
                      value={editFormik.values.emergencyName}
                      onChange={editFormik.handleChange}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input
                      type="text"
                      name="emergencyPhone"
                      value={editFormik.values.emergencyPhone}
                      onChange={editFormik.handleChange}
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black py-2.5 px-5 rounded-xl cursor-pointer active:scale-95"
                >
                  Save Corrections
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─── APPOINTMENT DETAILS MODAL ───────────────────────────────────────── */}
      {isViewApptModalOpen && selectedAppt && createPortal(
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsViewApptModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100/90 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7C3AED] to-[#5C2494]" />
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mt-1 text-left">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Appointment Voucher</h3>
                <p className="text-[10px] text-slate-500 font-bold font-mono mt-0.5">{selectedAppt.id}</p>
              </div>
              <button onClick={() => setIsViewApptModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="py-4 space-y-3.5 text-xs text-left">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold">Scheduled Date</span>
                <span className="font-extrabold text-slate-800">{selectedAppt.date}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold">Time Slot</span>
                <span className="font-bold text-slate-800">{selectedAppt.time}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold">Consultation Type</span>
                <span className="font-bold text-slate-800">{selectedAppt.type}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold">Assigned Practitioner</span>
                <span className="font-extrabold text-[#7C3AED]">{selectedAppt.doctor}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold">Reason for Visit</span>
                <span className="font-medium text-slate-700 leading-normal text-right max-w-[180px] break-words">{selectedAppt.reason}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400 font-bold">Status</span>
                <span className={`inline-flex items-center text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                  selectedAppt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  selectedAppt.status === 'Upcoming' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                  'bg-rose-50 text-rose-700 border-rose-100'
                }`}>{selectedAppt.status}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setIsViewApptModalOpen(false)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black py-2 px-3.5 rounded-xl cursor-pointer transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── PRESCRIPTION DETAILS MODAL ──────────────────────────────────────── */}
      {isViewRxModalOpen && selectedRx && createPortal(
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsViewRxModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100/90 relative overflow-hidden text-left"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7C3AED] to-[#5C2494]" />
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mt-1">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Prescription Details</h3>
                <p className="text-[10px] text-slate-500 font-bold font-mono mt-0.5">{selectedRx.id}</p>
              </div>
              <button onClick={() => setIsViewRxModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="py-4 space-y-3.5 text-xs">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold">Issue Date</span>
                <span className="font-extrabold text-slate-800">{selectedRx.date}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold">Diagnosis</span>
                <span className="font-bold text-slate-850">{selectedRx.diagnosis}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold">Template Used</span>
                <span className="font-semibold text-slate-700">{selectedRx.templateUsed}</span>
              </div>
              
              <div className="border-t border-dashed border-slate-200 my-4" />
              
              <div className="space-y-3">
                <p className="text-[10px] font-black text-[#7C3AED] uppercase tracking-wider">Medications Prescribed</p>
                {selectedRx.medications.map((m, i) => (
                  <div key={i} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="font-extrabold text-slate-800">{m.name} ({m.dosage})</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Frequency: {m.frequency} · Duration: {m.duration}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button 
                onClick={() => handleSimulateDownload(selectedRx.id)}
                className="bg-purple-50 hover:bg-purple-100 text-[#7C3AED] border border-purple-100 text-xs font-black py-2 px-3.5 rounded-xl cursor-pointer transition-all active:scale-95 mr-auto"
              >
                Download PDF
              </button>
              <button 
                onClick={() => setIsViewRxModalOpen(false)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black py-2 px-3.5 rounded-xl cursor-pointer transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Alert popup */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade flex items-center gap-3 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl max-w-sm">
          <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0 animate-ping" />
          <p className="text-xs font-bold font-sans">{toast.message}</p>
        </div>
      )}

    </div>
  );
}
