import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { createPortal } from 'react-dom';
import {
  FileText,
  Search,
  Plus,
  Download,
  Eye,
  MoreVertical,
  Filter,
  Calendar,
  RefreshCw,
  Send,
  Clock,
  User,
  AlertCircle,
  Syringe,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  X,
  Trash2,
  Pencil,
  CheckCircle,
  Printer,
  Save,
  Copy,
  ArrowLeft,
  Check,
  Settings,
  GripVertical,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── External Types & Seed Data ────────────────────────────────────────────────
import { INITIAL_TEMPLATES, DEFAULT_BLOCKS } from './mockTemplates';
import type { PrescriptionTemplate, TemplateBlock } from './mockTemplates';

// ─── Types ────────────────────────────────────────────────────────────────────
type PrescriptionStatus = 'Sent' | 'Draft' | 'Expired';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Prescription {
  id: string;
  patient: string;
  patientId: string;
  initials: string;
  age: number;
  gender: string;
  date: string;
  time: string;
  diagnosis: string;
  status: PrescriptionStatus;
  medications?: Medication[];
  templateUsed?: string;
  consultationType: string;
  location: string;
  vitals?: { bp: string; pulse: string; temp: string; rr: string; spo2: string; weight: string };
  chiefComplaint?: string;
  investigations?: string[];
  advice?: string;
  followUpDate?: string;
  followUpNotes?: string;
  signature?: string;
}

interface Patient {
  id: string;
  name: string;
  initials: string;
  age: number;
  gender: string;
}

// ─── Mock Prescriptions ────────────────────────────────────────────────────────
const MOCK_PRESCRIPTIONS: Prescription[] = [
  { id: 'RX-2026-0007', patient: 'Amit Sharma', patientId: 'PAT123456', initials: 'AS', age: 32, gender: 'Male', date: '14 Jul 2026', time: '11:30 AM', diagnosis: 'Acute Bronchitis', status: 'Sent', templateUsed: 'Universal Clinic Template', consultationType: 'In-Clinic', location: 'Banjarahills Clinic' },
  { id: 'RX-2026-0006', patient: 'Priya Singh', patientId: 'PAT123457', initials: 'PS', age: 28, gender: 'Female', date: '13 Jul 2026', time: '04:15 PM', diagnosis: 'Migraine without aura', status: 'Draft', templateUsed: 'Universal Clinic Template', consultationType: 'Video Consultation', location: 'Dr. Arjun Virtual Clinic' },
  { id: 'RX-2026-0005', patient: 'Ramesh Kumar', patientId: 'PAT123458', initials: 'RK', age: 45, gender: 'Male', date: '13 Jul 2026', time: '10:20 AM', diagnosis: 'Essential Hypertension', status: 'Sent', templateUsed: 'Cardiology Advanced Template', consultationType: 'In-Clinic', location: 'Banjarahills Clinic' },
  { id: 'RX-2026-0004', patient: 'Neha Devi', patientId: 'PAT123459', initials: 'ND', age: 35, gender: 'Female', date: '12 Jul 2026', time: '03:40 PM', diagnosis: 'Type 2 Diabetes Mellitus', status: 'Sent', templateUsed: 'Universal Clinic Template', consultationType: 'Home Visit', location: 'City Care Hospital' },
  { id: 'RX-2026-0003', patient: 'Vikram Singh', patientId: 'PAT123460', initials: 'VS', age: 50, gender: 'Male', date: '12 Jul 2026', time: '11:05 AM', diagnosis: 'Gastroesophageal Reflux', status: 'Expired', templateUsed: 'Universal Clinic Template', consultationType: 'In-Clinic', location: 'City Care Hospital' },
  { id: 'RX-2026-0002', patient: 'Anjali Patel', patientId: 'PAT123461', initials: 'AP', age: 29, gender: 'Female', date: '11 Jul 2026', time: '02:10 PM', diagnosis: 'Iron Deficiency Anemia', status: 'Draft', templateUsed: 'Universal Clinic Template', consultationType: 'Video Consultation', location: 'Dr. Arjun Virtual Clinic' },
  { id: 'RX-2026-0001', patient: 'Mohit Jain', patientId: 'PAT123462', initials: 'MJ', age: 41, gender: 'Male', date: '11 Jul 2026', time: '09:30 AM', diagnosis: 'Allergic Rhinitis', status: 'Sent', templateUsed: 'Universal Clinic Template', consultationType: 'In-Clinic', location: 'Banjarahills Clinic' },
];

const MOCK_MEDS_MAP: Record<string, Medication[]> = {
  'RX-2026-0007': [
    { name: 'Azithromycin 500mg', dosage: '500mg', frequency: 'Once daily after food', duration: '5 Days' },
    { name: 'Paracetamol 650mg', dosage: '650mg', frequency: 'Thrice daily if fever', duration: '3 Days' },
  ],
  'RX-2026-0006': [
    { name: 'Sumatriptan 50mg', dosage: '50mg', frequency: 'Once at onset of headache', duration: 'As needed' },
    { name: 'Naproxen 500mg', dosage: '500mg', frequency: 'Twice daily after meals', duration: '5 Days' },
  ],
  'RX-2026-0005': [
    { name: 'Telmisartan 40mg', dosage: '40mg', frequency: 'Once daily in the morning', duration: 'Continuous' },
  ],
  'RX-2026-0004': [
    { name: 'Metformin 500mg', dosage: '500mg', frequency: 'Twice daily after meals', duration: 'Continuous' },
    { name: 'Glimepiride 1mg', dosage: '1mg', frequency: 'Once daily before breakfast', duration: 'Continuous' },
  ],
  'RX-2026-0003': [
    { name: 'Pantoprazole 40mg', dosage: '40mg', frequency: 'Once daily before food', duration: '14 Days' },
  ],
  'RX-2026-0002': [
    { name: 'Iron Supplement (Ferosig)', dosage: '150mg', frequency: 'Once daily with Vitamin C', duration: '30 Days' },
  ],
  'RX-2026-0001': [
    { name: 'Montelukast 10mg', dosage: '10mg', frequency: 'Once daily at night', duration: '10 Days' },
    { name: 'Fluticasone Nasal Spray', dosage: '50mcg', frequency: '2 sprays in each nostril daily', duration: '15 Days' },
  ]
};

const AVATAR_COLORS: Record<string, string> = {
  AS: 'bg-teal-100 text-teal-700',
  PS: 'bg-pink-100 text-pink-700',
  RK: 'bg-orange-100 text-orange-700',
  ND: 'bg-indigo-100 text-indigo-700',
  VS: 'bg-violet-100 text-violet-700',
  AP: 'bg-amber-100 text-amber-700',
  MJ: 'bg-sky-100 text-sky-700',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: PrescriptionStatus }) {
  const styles: Record<PrescriptionStatus, string> = {
    Sent: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Draft: 'bg-sky-50    text-sky-700    border border-sky-200',
    Expired: 'bg-rose-50   text-rose-700   border border-rose-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${styles[status]}`}>
      {status}
    </span>
  );
}

function Avatar({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-12 h-12 text-sm' : size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-xs';
  const color = AVATAR_COLORS[initials] ?? 'bg-slate-100 text-slate-600';
  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {initials}
    </div>
  );
}

type Tab = 'All Prescriptions' | 'Drafts' | 'Sent' | 'Expired';
type MainView = 'list' | 'templates' | 'builder';

export default function PrescriptionsScreen() {
  const navigate = useNavigate();
  const pageSize = 10;
  const tabs: Tab[] = ['All Prescriptions', 'Drafts', 'Sent', 'Expired'];

  // Views & Routing State
  const [currentView, setCurrentView] = useState<MainView>('list');

  // Databases Loaded from localStorage
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);

  // Filtering & Search
  const [activeTab, setActiveTab] = useState<Tab>('All Prescriptions');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [dateFilter, setDateFilter] = useState('All');
  const [clinicFilter, setClinicFilter] = useState('All Clinics');
  const [templateFilter, setTemplateFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('Latest First');
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isViewRxModalOpen, setIsViewRxModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeMenuRxId, setActiveMenuRxId] = useState<string | null>(null);

  // visual template builder state
  const [builderId, setBuilderId] = useState('');
  const [builderName, setBuilderName] = useState('');
  const [builderSpecialty, setBuilderSpecialty] = useState('General Practice');
  const [builderIsDefault, setBuilderIsDefault] = useState(false);
  const [builderBlocks, setBuilderBlocks] = useState<TemplateBlock[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [activeSettingsBlockId, setActiveSettingsBlockId] = useState<string | null>(null);
  const [isUniversalTemplate, setIsUniversalTemplate] = useState(false);
  const [showBuilderPreview, setShowBuilderPreview] = useState(false);

  // Prescription creation form state
  const [selectedTemplateId, setSelectedTemplateId] = useState('TMP-UNIVERSAL');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFreq, setMedFreq] = useState('');
  const [medDur, setMedDur] = useState('');

  // Investigations builder
  const [investigations, setInvestigations] = useState<string[]>([]);
  const [newInv, setNewInv] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Initialize data
  useEffect(() => {
    // Prescriptions
    const savedRx = localStorage.getItem('vizito_prescriptions');
    let loadedRx: Prescription[] = [];
    if (savedRx) {
      try { loadedRx = JSON.parse(savedRx); }
      catch (e) { loadedRx = MOCK_PRESCRIPTIONS; }
    } else {
      loadedRx = MOCK_PRESCRIPTIONS;
      localStorage.setItem('vizito_prescriptions', JSON.stringify(MOCK_PRESCRIPTIONS));
    }
    setPrescriptions(loadedRx);
    if (loadedRx.length > 0) {
      setSelectedRx(loadedRx[0]);
    }

    // Templates
    const savedTemplates = localStorage.getItem('vizito_templates');
    let loadedTemplates: PrescriptionTemplate[] = [];
    if (savedTemplates) {
      try { loadedTemplates = JSON.parse(savedTemplates); }
      catch (e) { loadedTemplates = INITIAL_TEMPLATES; }
    } else {
      loadedTemplates = INITIAL_TEMPLATES;
      localStorage.setItem('vizito_templates', JSON.stringify(INITIAL_TEMPLATES));
    }
    setTemplates(loadedTemplates);

    // Patients
    const savedPatients = localStorage.getItem('vizito_patients');
    const defaultPatients = [
      { id: 'PAT123456', name: 'Amit Sharma', initials: 'AS', age: 32, gender: 'Male' },
      { id: 'PAT123457', name: 'Priya Singh', initials: 'PS', age: 28, gender: 'Female' },
      { id: 'PAT123458', name: 'Ramesh Kumar', initials: 'RK', age: 45, gender: 'Male' },
      { id: 'PAT123459', name: 'Neha Devi', initials: 'ND', age: 35, gender: 'Female' },
      { id: 'PAT123460', name: 'Vikram Singh', initials: 'VS', age: 50, gender: 'Male' },
      { id: 'PAT123461', name: 'Anjali Patel', initials: 'AP', age: 29, gender: 'Female' },
      { id: 'PAT123462', name: 'Mohit Jain', initials: 'MJ', age: 41, gender: 'Male' }
    ];
    if (savedPatients) {
      try { setPatients(JSON.parse(savedPatients)); }
      catch (e) { setPatients(defaultPatients); }
    } else {
      setPatients(defaultPatients);
      localStorage.setItem('vizito_patients', JSON.stringify(defaultPatients));
    }
  }, []);

  const syncPrescriptions = (updated: Prescription[]) => {
    setPrescriptions(updated);
    localStorage.setItem('vizito_prescriptions', JSON.stringify(updated));
  };

  const syncTemplates = (updated: PrescriptionTemplate[]) => {
    setTemplates(updated);
    localStorage.setItem('vizito_templates', JSON.stringify(updated));
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Close menus
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuRxId(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Filter Prescription List
  const filtered = prescriptions.filter(rx => {
    const matchTab =
      activeTab === 'All Prescriptions' ||
      rx.status === activeTab.replace('s', '');

    const matchSearch =
      rx.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rx.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rx.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus =
      statusFilter === 'All Status' || rx.status === statusFilter;

    const matchDate =
      dateFilter === 'All' || rx.date === dateFilter;

    const matchClinic =
      clinicFilter === 'All Clinics' || rx.location === clinicFilter;

    const matchTemplate =
      templateFilter === 'All' ||
      (templateFilter === 'Universal Template' && rx.templateUsed === 'Universal Clinic Template') ||
      (templateFilter === 'My Templates' && rx.templateUsed !== 'Universal Clinic Template');

    return matchTab && matchSearch && matchStatus && matchDate && matchClinic && matchTemplate;
  }).sort((a, b) => {
    if (sortOrder === 'Latest First') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortOrder === 'Oldest First') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortOrder === 'Patient Name') return a.patient.localeCompare(b.patient);
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tabCounts: Record<Tab, number> = {
    'All Prescriptions': prescriptions.length,
    'Drafts': prescriptions.filter(r => r.status === 'Draft').length,
    'Sent': prescriptions.filter(r => r.status === 'Sent').length,
    'Expired': prescriptions.filter(r => r.status === 'Expired').length,
  };

  // Medicine helper
  const addMedication = () => {
    if (!medName.trim()) {
      showToast('Medicine name is required.', 'error');
      return;
    }
    const newMed: Medication = {
      name: medName,
      dosage: medDosage || 'N/A',
      frequency: medFreq || 'Once daily',
      duration: medDur || 'As needed'
    };
    setMedications(prev => [...prev, newMed]);
    setMedName('');
    setMedDosage('');
    setMedFreq('');
    setMedDur('');
  };

  const removeMedication = (index: number) => {
    setMedications(prev => prev.filter((_, idx) => idx !== index));
  };

  // Investigation helpers
  const addInvestigation = () => {
    if (!newInv.trim()) return;
    setInvestigations(prev => [...prev, newInv.trim()]);
    setNewInv('');
  };

  const removeInvestigation = (index: number) => {
    setInvestigations(prev => prev.filter((_, idx) => idx !== index));
  };

  // Delete Template
  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    syncTemplates(updated);
    showToast('Template deleted successfully.', 'error');
  };

  // Duplicate Template
  const handleDuplicateTemplate = (template: PrescriptionTemplate) => {
    const newId = `TMP-MY-${Math.floor(1000 + Math.random() * 9000)}`;
    const copy: PrescriptionTemplate = {
      ...template,
      id: newId,
      name: `${template.name} Copy`,
      isUniversal: false,
      isDefault: false,
      lastUpdated: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };
    const updated = [...templates, copy];
    syncTemplates(updated);
    showToast('Template duplicated successfully.', 'success');
  };

  // Save/Create Template Builder
  const handleSaveTemplate = () => {
    if (!builderName.trim()) {
      showToast('Template name is required.', 'error');
      return;
    }
    if (builderBlocks.filter(b => b.enabled).length === 0) {
      showToast('At least one block must be enabled.', 'error');
      return;
    }

    let updatedTemplates = [...templates];
    const isEdit = builderId !== '';

    if (isEdit) {
      updatedTemplates = updatedTemplates.map(t => {
        if (t.id === builderId) {
          return {
            ...t,
            name: builderName,
            specialty: builderSpecialty,
            isDefault: builderIsDefault,
            blocks: builderBlocks,
            lastUpdated: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          };
        }
        return t;
      });
    } else {
      const newTemplate: PrescriptionTemplate = {
        id: `TMP-MY-${Math.floor(1000 + Math.random() * 9000)}`,
        name: builderName,
        specialty: builderSpecialty,
        isDefault: builderIsDefault,
        isUniversal: false,
        blocks: builderBlocks,
        lastUpdated: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      };
      updatedTemplates.push(newTemplate);
    }

    // Set other templates to non-default if this is marked as default
    if (builderIsDefault) {
      updatedTemplates = updatedTemplates.map(t => {
        if (t.id !== (isEdit ? builderId : updatedTemplates[updatedTemplates.length - 1].id)) {
          return { ...t, isDefault: false };
        }
        return t;
      });
    }

    syncTemplates(updatedTemplates);
    showToast(isEdit ? 'Template updated successfully.' : 'Template created successfully.', 'success');
    setCurrentView('templates');
  };

  // Launch Template Builder
  const openTemplateBuilder = (template: PrescriptionTemplate | null = null, forceCopy = false) => {
    if (template) {
      setBuilderId(forceCopy ? '' : template.id);
      setBuilderName(forceCopy ? `${template.name} Copy` : template.name);
      setBuilderSpecialty(template.specialty);
      setBuilderIsDefault(template.isDefault);
      setBuilderBlocks([...template.blocks]);
      setIsUniversalTemplate(template.isUniversal && !forceCopy);
    } else {
      setBuilderId('');
      setBuilderName('');
      setBuilderSpecialty('General Practice');
      setBuilderIsDefault(false);
      setBuilderBlocks([...DEFAULT_BLOCKS]);
      setIsUniversalTemplate(false);
    }
    setShowBuilderPreview(false);
    setActiveSettingsBlockId(null);
    setCurrentView('builder');
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (idx: number) => {
    if (isUniversalTemplate) return;
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) return;
    const items = [...builderBlocks];
    const draggedItem = items[draggedIdx];
    items.splice(draggedIdx, 1);
    items.splice(idx, 0, draggedItem);
    setBuilderBlocks(items);
    setDraggedIdx(null);
  };

  // Formik for new template-based prescription creation
  const newRxFormik = useFormik({
    initialValues: {
      patientId: '',
      consultationType: 'In-Clinic',
      location: 'Banjarahills Clinic',
      chiefComplaint: '',
      diagnosis: '',
      bp: '',
      pulse: '',
      temp: '',
      rr: '',
      spo2: '',
      weight: '',
      advice: '',
      followUpDate: '',
      followUpNotes: '',
      status: 'Sent' as PrescriptionStatus
    },
    validationSchema: Yup.object({
      patientId: Yup.string().required('Patient selection is required'),
      diagnosis: Yup.string().required('Diagnosis is required')
    }),
    onSubmit: (values) => {
      const patient = patients.find(p => p.id === values.patientId);
      if (!patient) return;

      const activeTemplate = templates.find(t => t.id === selectedTemplateId) ?? templates[0];

      const newRx: Prescription = {
        id: `RX-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        patient: patient.name,
        patientId: patient.id,
        initials: patient.initials,
        age: patient.age,
        gender: patient.gender,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        diagnosis: values.diagnosis,
        status: values.status,
        templateUsed: activeTemplate.name,
        consultationType: values.consultationType,
        location: values.location,
        medications: medications,
        vitals: {
          bp: values.bp,
          pulse: values.pulse,
          temp: values.temp,
          rr: values.rr,
          spo2: values.spo2,
          weight: values.weight
        },
        chiefComplaint: values.chiefComplaint,
        investigations: investigations,
        advice: values.advice,
        followUpDate: values.followUpDate,
        followUpNotes: values.followUpNotes,
        signature: 'Dr. Arjun Reddy'
      };

      const updated = [newRx, ...prescriptions];
      syncPrescriptions(updated);
      setSelectedRx(newRx);
      setIsNewModalOpen(false);
      showToast('Prescription generated successfully using template.');
    }
  });

  const activeTemplateForForm = templates.find(t => t.id === selectedTemplateId) || templates[0];

  return (
    <div className="w-full animate-fade flex flex-col gap-0 min-h-0">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade flex items-center gap-3 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl max-w-sm">
          <CheckCircle className={`w-5 h-5 shrink-0 ${toast.type === 'error' ? 'text-rose-400' : 'text-teal-400'}`} />
          <span className="text-xs font-bold leading-normal">{toast.message}</span>
        </div>
      )}

      {/* ── VIEW 1: PRESCRIPTION LIST ──────────────────────────────────────── */}
      {currentView === 'list' && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl font-extrabold text-[#2B2B2B] tracking-tight">Prescription Management</h1>
              <p className="text-xs font-semibold text-slate-500 mt-1">Create, template, view and manage practices' prescriptions</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => setCurrentView('templates')}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                Prescription Templates
              </button>
              <button
                onClick={() => {
                  const defaultTpl = templates.find(t => t.isDefault) || templates[0];
                  setSelectedTemplateId(defaultTpl?.id || 'TMP-UNIVERSAL');
                  newRxFormik.resetForm();
                  setMedications([]);
                  setInvestigations([]);
                  setIsNewModalOpen(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-[#5C2494] to-[#7C3AED] hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                New Prescription
              </button>
            </div>
          </div>

          {/* Prescription Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {[
              { title: 'Total Prescriptions', val: prescriptions.length, color: 'bg-teal-50 text-teal-700', icon: FileText },
              { title: 'My Templates', val: templates.filter(t => !t.isUniversal).length, color: 'bg-purple-50 text-purple-700', icon: SlidersHorizontal },
              { title: 'Universal Template', val: 1, color: 'bg-blue-50 text-blue-700', icon: Syringe },
              { title: 'Draft Prescriptions', val: prescriptions.filter(p => p.status === 'Draft').length, color: 'bg-amber-50 text-amber-700', icon: Clock }
            ].map(card => (
              <div key={card.title} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                <div className={`w-11 h-11 ${card.color} rounded-xl flex items-center justify-center shrink-0`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.title}</p>
                  <h4 className="text-2xl font-black text-slate-800 mt-0.5">{card.val}</h4>
                </div>
              </div>
            ))}
          </div>

          {/* Main List Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Table */}
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Tabs */}
                <div className="flex items-center border-b border-slate-100 px-4 pt-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {tabs.map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                      className={`relative shrink-0 px-4 py-3 text-xs font-black transition-colors whitespace-nowrap cursor-pointer ${activeTab === tab ? 'text-purple-700' : 'text-slate-500'}`}
                    >
                      {tab}
                      {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5C2494] rounded-t-full" />}
                    </button>
                  ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search prescription, patient name, ID..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-transparent border-none text-xs font-bold text-slate-700 outline-none placeholder-slate-400"
                    />
                  </div>

                  {/* Template filter */}
                  <select
                    value={templateFilter}
                    onChange={e => setTemplateFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none"
                  >
                    <option value="All">All Templates</option>
                    <option value="Universal Template">Universal Only</option>
                    <option value="My Templates">My Custom Templates</option>
                  </select>

                  {/* Clinic filter */}
                  <select
                    value={clinicFilter}
                    onChange={e => setClinicFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none"
                  >
                    <option value="All Clinics">All Clinics</option>
                    <option value="Banjarahills Clinic">Banjara Hills</option>
                    <option value="Secunderabad Clinic">Secunderabad</option>
                    <option value="Dr. Arjun Virtual Clinic">Virtual Clinic</option>
                  </select>

                  {/* Sort filter */}
                  <select
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none"
                  >
                    <option>Latest First</option>
                    <option>Oldest First</option>
                    <option>Patient Name</option>
                  </select>

                  {(searchTerm || templateFilter !== 'All' || clinicFilter !== 'All Clinics') && (
                    <button
                      onClick={() => { setSearchTerm(''); setTemplateFilter('All'); setClinicFilter('All Clinics'); }}
                      className="text-xs font-black text-rose-600 hover:underline px-2"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Table Layout */}
                <div className="min-w-[900px]">
                  <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-2">Prescription ID</div>
                    <div className="col-span-2">Date / Time</div>
                    <div className="col-span-3">Patient</div>
                    <div className="col-span-2">Consultation Type</div>
                    <div className="col-span-2">Template Used</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {paginated.length === 0 ? (
                      <div className="py-16 text-center text-slate-400">
                        <FileText className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-700">No prescriptions found.</h4>
                      </div>
                    ) : (
                      paginated.map(rx => (
                        <div
                          key={rx.id}
                          onClick={() => setSelectedRx(rx)}
                          className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center cursor-pointer transition-all border-l-4 ${selectedRx?.id === rx.id ? 'bg-[#FAF5FF]/20 border-l-[#5C2494]' : 'border-l-transparent hover:bg-slate-50/50'}`}
                        >
                          <div className="col-span-2 text-xs font-mono font-bold text-slate-700">{rx.id}</div>
                          <div className="col-span-2 text-xs font-semibold text-slate-600">
                            <div>{rx.date}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{rx.time}</div>
                          </div>
                          <div className="col-span-3 flex items-center gap-2.5">
                            <Avatar initials={rx.initials} size="sm" />
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-800 truncate">{rx.patient}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{rx.age} Y · {rx.patientId}</p>
                            </div>
                          </div>
                          <div className="col-span-2 text-xs font-semibold text-slate-600">{rx.consultationType}</div>
                          <div className="col-span-2 text-xs font-bold text-[#5C2494]">{rx.templateUsed || 'Universal Template'}</div>
                          <div className="col-span-1 text-right relative flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => { setSelectedRx(rx); setIsViewRxModalOpen(true); }}
                              className="p-1.5 text-slate-400 hover:text-[#5C2494] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setSelectedRx(rx); setIsDeleteConfirmOpen(true); }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 border border-slate-200 bg-white rounded-lg disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 border border-slate-200 bg-white rounded-lg disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Details */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              {selectedRx && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800">Prescription details</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedRx.id}</p>
                  </div>
                  
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Patient</span>
                      <p className="text-xs font-black text-slate-800 mt-0.5">{selectedRx.patient} ({selectedRx.gender})</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Diagnosis</span>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">{selectedRx.diagnosis}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Template Used</span>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">{selectedRx.templateUsed || 'Universal Template'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Medications ({selectedRx.medications?.length || 0})</span>
                      <div className="space-y-1.5 mt-1">
                        {selectedRx.medications?.map((m, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-150 p-2 rounded-lg text-xs font-bold text-slate-700 flex justify-between">
                            <span>{m.name}</span>
                            <span className="text-slate-400 font-normal">{m.dosage} · {m.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => setIsViewRxModalOpen(true)}
                      className="flex-1 bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-[#5C2494]/25 text-[#5C2494] py-2 rounded-xl text-xs font-black transition-all text-center"
                    >
                      View Pad
                    </button>
                    <button
                      onClick={() => showToast(`Prescription ${selectedRx.id} successfully transmitted via WhatsApp.`)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-black transition-all text-center"
                    >
                      Share Rx
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── VIEW 2: TEMPLATE MANAGEMENT ───────────────────────────────────── */}
      {currentView === 'templates' && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <button
                onClick={() => setCurrentView('list')}
                className="flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider mb-2.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Prescriptions
              </button>
              <h1 className="text-2xl font-extrabold text-[#2B2B2B] tracking-tight">Prescription Templates</h1>
              <p className="text-xs font-semibold text-slate-500 mt-1">Manage reusable prescription layouts and specialty templates</p>
            </div>
            <button
              onClick={() => openTemplateBuilder(null)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#5C2494] to-[#7C3AED] hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Platform Universal Template (Read Only) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Universal Clinic Templates</span>
                  <span className="text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">Read Only</span>
                </div>
                {templates.filter(t => t.isUniversal).map(tpl => (
                  <div key={tpl.id} className="space-y-4">
                    <div>
                      <h3 className="text-base font-black text-slate-800">{tpl.name}</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-1">Default platform configuration containing all standard clinical components.</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tpl.blocks.map(b => (
                        <span key={b.id} className="text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-500 px-2.5 py-1 rounded-lg">
                          {b.title}
                        </span>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedTemplateId(tpl.id);
                          newRxFormik.resetForm();
                          setMedications([]);
                          setInvestigations([]);
                          setIsNewModalOpen(true);
                        }}
                        className="bg-[#5C2494] hover:bg-[#4A1D77] text-white py-2 px-4 rounded-xl text-xs font-black transition-all"
                      >
                        Use Template
                      </button>
                      <button
                        onClick={() => openTemplateBuilder(tpl, true)}
                        className="border border-slate-200 text-slate-600 hover:bg-slate-50 py-2 px-4 rounded-xl text-xs font-bold transition-all"
                      >
                        Create Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Created Templates */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">My Custom Templates ({templates.filter(t => !t.isUniversal).length})</span>
              </div>
              <div className="space-y-4 divide-y divide-slate-100">
                {templates.filter(t => !t.isUniversal).length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">No custom templates built yet.</p>
                ) : (
                  templates.filter(t => !t.isUniversal).map((tpl, index) => (
                    <div key={tpl.id} className={`pt-4 first:pt-0 flex flex-col justify-between gap-3`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-black text-slate-800">
                            {tpl.name}
                            {tpl.isDefault && (
                              <span className="ml-2 text-[9px] font-black bg-teal-50 text-teal-700 border border-teal-200 rounded px-1.5 py-0.5">Default</span>
                            )}
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{tpl.specialty} · Updated {tpl.lastUpdated}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openTemplateBuilder(tpl)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateTemplate(tpl)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTemplateId(tpl.id);
                            newRxFormik.resetForm();
                            setMedications([]);
                            setInvestigations([]);
                            setIsNewModalOpen(true);
                          }}
                          className="bg-teal-700 hover:bg-teal-800 text-white py-1.5 px-3 rounded-lg text-[10px] font-black shadow-sm transition-all"
                        >
                          Use
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── VIEW 3: VISUAL TEMPLATE BUILDER ────────────────────────────────── */}
      {currentView === 'builder' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
            <div>
              <button
                onClick={() => setCurrentView('templates')}
                className="flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider mb-2.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Cancel & Back
              </button>
              <h1 className="text-xl font-black text-slate-800">
                {builderId ? 'Edit Layout Template' : 'Visual Prescription Builder'}
              </h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBuilderPreview(!showBuilderPreview)}
                className="border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 px-4 rounded-xl text-xs font-bold transition-all"
              >
                {showBuilderPreview ? 'Back to Editor' : 'Layout Preview'}
              </button>
              <button
                onClick={handleSaveTemplate}
                className="bg-teal-700 hover:bg-teal-800 text-white py-2.5 px-5 rounded-xl text-xs font-black shadow-sm transition-all"
              >
                Save Layout Template
              </button>
            </div>
          </div>

          {/* Builder Body */}
          {!showBuilderPreview ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* Left Config Panel */}
              <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Template Settings</h3>
                
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Template Name *</label>
                    <input
                      type="text"
                      value={builderName}
                      onChange={e => setBuilderName(e.target.value)}
                      placeholder="e.g. Pediatrics Outpatient Template"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Clinical Specialty</label>
                    <input
                      type="text"
                      value={builderSpecialty}
                      onChange={e => setBuilderSpecialty(e.target.value)}
                      placeholder="e.g. Pediatrics"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={builderIsDefault}
                      onChange={e => setBuilderIsDefault(e.target.checked)}
                      className="w-4 h-4 text-teal-600 focus:ring-teal-500 rounded border-slate-350"
                    />
                    <span className="text-xs font-bold text-slate-700">Set as my default layout template</span>
                  </label>
                </div>
              </div>

              {/* Right Drag & Reorder Canvas */}
              <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-4">
                  <h3 className="text-sm font-bold text-slate-800">Visual Layout Canvas</h3>
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Drag block rows to reorder layout. Toggles hide blocks from the form.
                  </span>
                </div>

                <div className="space-y-2">
                  {builderBlocks.map((block, index) => {
                    const isSettingsOpen = activeSettingsBlockId === block.id;

                    return (
                      <div
                        key={block.id}
                        draggable={!isUniversalTemplate}
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(index)}
                        className={`flex flex-col border border-slate-150 rounded-xl bg-white p-3.5 transition-all relative ${draggedIdx === index ? 'opacity-40 border-dashed border-teal-500' : 'hover:border-slate-300'}`}
                      >
                        <div className="flex items-center justify-between gap-3.5">
                          {/* Drag handle */}
                          {!isUniversalTemplate && (
                            <div className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-4 h-4" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-black text-slate-800">{block.title}</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Original block: {block.name}</p>
                          </div>

                          {/* Block settings/actions */}
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={block.enabled}
                                onChange={(e) => {
                                  if (isUniversalTemplate) return;
                                  const updated = [...builderBlocks];
                                  updated[index].enabled = e.target.checked;
                                  setBuilderBlocks(updated);
                                }}
                                className="w-3.5 h-3.5 text-teal-600 focus:ring-teal-500 rounded border-slate-300"
                              />
                              <span className="text-[10px] font-black uppercase text-slate-500">Enabled</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                if (isUniversalTemplate) return;
                                setActiveSettingsBlockId(isSettingsOpen ? null : block.id);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Inline block settings expander */}
                        {isSettingsOpen && (
                          <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4.5 animate-fade bg-slate-50/50 p-3 rounded-lg">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Edit Section Title</label>
                              <input
                                type="text"
                                value={block.title}
                                onChange={e => {
                                  const updated = [...builderBlocks];
                                  updated[index].title = e.target.value;
                                  setBuilderBlocks(updated);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5 justify-center">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={block.required}
                                  onChange={e => {
                                    const updated = [...builderBlocks];
                                    updated[index].required = e.target.checked;
                                    setBuilderBlocks(updated);
                                  }}
                                  className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300"
                                />
                                <span className="text-[10px] font-bold text-slate-600">Mark as Mandatory</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={block.hideLabel}
                                  onChange={e => {
                                    const updated = [...builderBlocks];
                                    updated[index].hideLabel = e.target.checked;
                                    setBuilderBlocks(updated);
                                  }}
                                  className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300"
                                />
                                <span className="text-[10px] font-bold text-slate-600">Hide Section Label</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Live layout preview mockup */
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 sm:p-10 max-w-xl mx-auto shadow-inner">
              <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-md text-xs space-y-5">
                <div className="border-b-2 border-slate-200 pb-3 flex justify-between">
                  <div>
                    <h3 className="font-extrabold text-teal-800 text-sm">Dr. Arjun Reddy, MD</h3>
                    <p className="text-[9px] text-slate-400 mt-0.5">Banjara Hills, Hyderabad</p>
                  </div>
                  <h4 className="font-bold text-[9px] text-slate-400 uppercase text-right">Layout Preview Only</h4>
                </div>

                <div className="space-y-4">
                  {builderBlocks.filter(b => b.enabled).map(block => (
                    <div key={block.id} className="border-b border-slate-100 pb-2.5 last:border-none">
                      {!block.hideLabel && (
                        <h4 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          {block.title} {block.required && <span className="text-rose-500">*</span>}
                        </h4>
                      )}
                      
                      {block.id === 'doctor_info' && <p className="text-slate-600 font-semibold">Dr. Arjun Reddy · Reg No: AP-2015-88329</p>}
                      {block.id === 'patient_info' && <p className="text-slate-600 font-semibold">John Doe · 35 Y · Male · PAT-PREVIEW</p>}
                      {block.id === 'vitals' && <p className="text-slate-400 italic">BP: 120/80 mmHg · Pulse: 72 bpm · Temp: 98.4 °F</p>}
                      {block.id === 'chief_complaint' && <p className="text-slate-600">Sample chief clinical complaint record.</p>}
                      {block.id === 'diagnosis' && <p className="text-slate-700 font-bold">Acute Respiratory Tract Infection suspect</p>}
                      {block.id === 'medicines' && (
                        <div className="space-y-1 mt-1 pl-1">
                          <p className="font-bold text-slate-800">1. Amoxicillin 500mg (1-0-1 · 5 days)</p>
                        </div>
                      )}
                      {block.id === 'investigations' && <p className="text-slate-500 font-mono">Complete Blood Count (CBC) test requested.</p>}
                      {block.id === 'advice' && <p className="text-slate-500 leading-normal">Drink lukewarm water and get plenty of rest.</p>}
                      {block.id === 'follow_up' && <p className="text-slate-500">Return for review after 5 days.</p>}
                      {block.id === 'signature' && (
                        <div className="pt-2 text-right">
                          <span className="font-serif italic text-teal-800 text-sm">Arjun Reddy</span>
                          <p className="text-[9px] text-slate-400">Authorized Signature</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── MODALS ────────────────────────────────────────────────────────── */}

      {/* NEW TEMPLATE-BASED PRESCRIPTION MODAL */}
      {isNewModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setIsNewModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-[95%] sm:w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto modal-scrollbar animate-fade"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-800">Create Template Prescription</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={newRxFormik.handleSubmit} className="space-y-4">
              {/* Template selection bar */}
              <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
                <div>
                  <label className="block text-[10px] font-bold text-[#5C2494] uppercase tracking-wider mb-1">Prescription Layout Template</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.specialty})</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                  Changing the template will immediately re-configure the layout fields below to match the selected layouts.
                </p>
              </div>

              {/* Form blocks sorted dynamically based on template config */}
              <div className="space-y-4">
                {activeTemplateForForm.blocks.filter(b => b.enabled).map(block => (
                  <div key={block.id} className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 shadow-xs">
                    {!block.hideLabel && (
                      <h4 className="text-[10px] font-extrabold text-slate-650 uppercase tracking-wide border-b border-slate-50 pb-1.5">
                        {block.title} {block.required && <span className="text-rose-500">*</span>}
                      </h4>
                    )}

                    {/* Block inputs */}
                    {block.id === 'doctor_info' && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 font-bold">Doctor Name</span>
                          <p className="font-extrabold text-slate-800 mt-0.5">Dr. Arjun Reddy, MD</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold">Registration Number</span>
                          <p className="font-semibold text-slate-750 mt-0.5">AP-2015-88329</p>
                        </div>
                      </div>
                    )}

                    {block.id === 'patient_info' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Patient *</label>
                            <select
                              name="patientId"
                              value={newRxFormik.values.patientId}
                              onChange={newRxFormik.handleChange}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                              required
                            >
                              <option value="">-- Choose Patient --</option>
                              {patients.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Consultation Type</label>
                            <select
                              name="consultationType"
                              value={newRxFormik.values.consultationType}
                              onChange={newRxFormik.handleChange}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                            >
                              <option>In-Clinic</option>
                              <option>Video Consultation</option>
                              <option>Home Visit</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clinic Center</label>
                            <select
                              name="location"
                              value={newRxFormik.values.location}
                              onChange={newRxFormik.handleChange}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                            >
                              <option>Banjarahills Clinic</option>
                              <option>Secunderabad Clinic</option>
                              <option>Dr. Arjun Virtual Clinic</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {block.id === 'vitals' && (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { name: 'bp', label: 'BP (mmHg)' },
                          { name: 'pulse', label: 'Pulse (bpm)' },
                          { name: 'temp', label: 'Temp (°F)' },
                          { name: 'rr', label: 'RR (/min)' },
                          { name: 'spo2', label: 'SpO2 (%)' },
                          { name: 'weight', label: 'Weight (kg)' }
                        ].map(f => (
                          <div key={f.name}>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">{f.label}</label>
                            <input
                              type="text"
                              name={f.name}
                              value={(newRxFormik.values as any)[f.name]}
                              onChange={newRxFormik.handleChange}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {block.id === 'chief_complaint' && (
                      <div>
                        <input
                          type="text"
                          name="chiefComplaint"
                          value={newRxFormik.values.chiefComplaint}
                          onChange={newRxFormik.handleChange}
                          placeholder="Describe patient's chief complaints..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-850"
                        />
                      </div>
                    )}

                    {block.id === 'diagnosis' && (
                      <div>
                        <input
                          type="text"
                          name="diagnosis"
                          value={newRxFormik.values.diagnosis}
                          onChange={newRxFormik.handleChange}
                          placeholder="e.g. Migraine headache without complications"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-850"
                          required={block.required}
                        />
                      </div>
                    )}

                    {block.id === 'medicines' && (
                      <div className="space-y-3">
                        {/* List of Medications */}
                        {medications.length > 0 && (
                          <div className="bg-slate-50 border border-slate-150 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-inner">
                            {medications.map((med, index) => (
                              <div key={index} className="px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-700 bg-white">
                                <div className="grid grid-cols-4 gap-2 flex-1 items-center">
                                  <span className="font-bold text-slate-900 col-span-2">{med.name}</span>
                                  <span className="text-slate-500">{med.dosage} · {med.frequency}</span>
                                  <span className="text-slate-400 text-right">{med.duration}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeMedication(index)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg ml-3 shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Input Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end bg-slate-50 p-3 rounded-lg">
                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Medicine Name</label>
                            <input
                              type="text"
                              value={medName}
                              onChange={e => setMedName(e.target.value)}
                              placeholder="e.g. Paracetamol 650mg"
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Dosage</label>
                            <input
                              type="text"
                              value={medDosage}
                              onChange={e => setMedDosage(e.target.value)}
                              placeholder="1 tab"
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Frequency</label>
                            <input
                              type="text"
                              value={medFreq}
                              onChange={e => setMedFreq(e.target.value)}
                              placeholder="1-0-1"
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Duration</label>
                            <input
                              type="text"
                              value={medDur}
                              onChange={e => setMedDur(e.target.value)}
                              placeholder="5 days"
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none"
                            />
                          </div>
                          <div className="sm:col-span-4 flex justify-end">
                            <button
                              type="button"
                              onClick={addMedication}
                              className="bg-teal-700 text-white rounded-lg text-[10px] font-black px-3.5 py-1.5 transition-all shadow-sm"
                            >
                              Add Medicine
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {block.id === 'investigations' && (
                      <div className="space-y-3">
                        {investigations.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {investigations.map((inv, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 text-[11px] font-bold bg-purple-50 text-[#5C2494] border border-purple-200 px-2.5 py-1 rounded-lg">
                                {inv}
                                <button type="button" onClick={() => removeInvestigation(idx)} className="text-purple-400 hover:text-purple-600 font-extrabold ml-1">×</button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 bg-slate-50 p-2.5 rounded-lg">
                          <input
                            type="text"
                            value={newInv}
                            onChange={e => setNewInv(e.target.value)}
                            placeholder="Add diagnostic tests, e.g. CBC, Lipid Profile, ECG..."
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold"
                          />
                          <button
                            type="button"
                            onClick={addInvestigation}
                            className="bg-[#5C2494] text-white rounded-lg px-3 text-xs font-black"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    {block.id === 'advice' && (
                      <div>
                        <textarea
                          name="advice"
                          value={newRxFormik.values.advice}
                          onChange={newRxFormik.handleChange}
                          rows={3}
                          placeholder="Lifestyle advices, dietary recommendations..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-850"
                        />
                      </div>
                    )}

                    {block.id === 'follow_up' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Follow-up Date</label>
                          <input
                            type="date"
                            name="followUpDate"
                            value={newRxFormik.values.followUpDate}
                            onChange={newRxFormik.handleChange}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Follow-up Notes</label>
                          <input
                            type="text"
                            name="followUpNotes"
                            value={newRxFormik.values.followUpNotes}
                            onChange={newRxFormik.handleChange}
                            placeholder="Review test reports, clinical review..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
                          />
                        </div>
                      </div>
                    )}

                    {block.id === 'signature' && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold">Authorized Signature</span>
                        <span className="font-serif italic text-teal-800 text-sm font-black">Dr. Arjun Reddy</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Status Radio options */}
              <div className="flex gap-4.5 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <label className="inline-flex items-center text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="Sent"
                    checked={newRxFormik.values.status === 'Sent'}
                    onChange={newRxFormik.handleChange}
                    className="mr-1.5 text-teal-600 focus:ring-teal-500"
                  />
                  Sent (Active)
                </label>
                <label className="inline-flex items-center text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="Draft"
                    checked={newRxFormik.values.status === 'Draft'}
                    onChange={newRxFormik.handleChange}
                    className="mr-1.5 text-teal-600 focus:ring-teal-500"
                  />
                  Draft
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-650"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black py-2 px-5 transition-all shadow-sm"
                >
                  Generate Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PRESCRIPTION RX PAD MODAL */}
      {isViewRxModalOpen && selectedRx && createPortal(
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-0 sm:p-4 print:bg-transparent print:backdrop-blur-none print:p-0 print:relative print:block print:z-0"
          onClick={() => setIsViewRxModalOpen(false)}
        >
          <div
            className="bg-white rounded-none sm:rounded-2xl max-w-2xl w-full h-full sm:h-auto p-0 shadow-2xl border-none sm:border border-slate-150 overflow-hidden animate-fade flex flex-col print:max-w-full print:border-none print:shadow-none print:rounded-none print:m-0 print:p-0"
            onClick={e => e.stopPropagation()}
          >
            {/* Header controls */}
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between print:hidden shrink-0">
              <span className="text-xs font-bold text-slate-600">Prescription View: {selectedRx.id}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-white border border-slate-200 rounded-lg py-1 px-3 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setIsViewRxModalOpen(false)}
                  className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* The Rx Pad */}
            <div className="flex-1 p-5 sm:p-8 bg-white text-slate-800 print:p-6 print:pt-12 overflow-y-auto modal-scrollbar" id="rx-pad-print-area">

              {/* Doctor details */}
              <div className="flex justify-between items-start border-b-2 border-slate-200 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-extrabold text-teal-800">Dr. Arjun Reddy, MD</h2>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Consultant Cardiologist & Physician</p>
                  <p className="text-[10px] text-slate-400">Reg. No: AP-2015-88329</p>
                </div>
                <div className="text-right">
                  <h3 className="text-xs font-extrabold text-slate-700">vizito CLINIC CENTER</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">H.No 12-3-45, Banjara Hills Rd 2</p>
                  <p className="text-[10px] text-slate-400">Hyderabad, TS - 500034</p>
                  <p className="text-[10px] text-slate-400">Ph: +91 40 2234 5678</p>
                </div>
              </div>

              {/* Patient Info Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs mb-6 font-semibold">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Patient</span>
                  <p className="font-extrabold text-slate-800 mt-0.5">{selectedRx.patient}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Details</span>
                  <p className="font-semibold text-slate-700 mt-0.5">{selectedRx.age} Y · {selectedRx.gender}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Date / Time</span>
                  <p className="font-semibold text-slate-700 mt-0.5">{selectedRx.date} · {selectedRx.time}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Prescription ID</span>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedRx.id}</p>
                </div>
              </div>

              {/* Vitals rendering (if entered) */}
              {selectedRx.vitals && Object.values(selectedRx.vitals).some(v => v !== '') && (
                <div className="mb-5 bg-slate-50/50 p-3 rounded-lg border border-slate-150">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patient Vitals:</span>
                  <div className="grid grid-cols-3 gap-2.5 mt-2 font-semibold text-slate-700 text-xs">
                    {selectedRx.vitals.bp && <div>BP: <span className="font-bold text-slate-900">{selectedRx.vitals.bp}</span></div>}
                    {selectedRx.vitals.pulse && <div>Pulse: <span className="font-bold text-slate-900">{selectedRx.vitals.pulse} bpm</span></div>}
                    {selectedRx.vitals.temp && <div>Temp: <span className="font-bold text-slate-900">{selectedRx.vitals.temp} °F</span></div>}
                    {selectedRx.vitals.rr && <div>RR: <span className="font-bold text-slate-900">{selectedRx.vitals.rr} /min</span></div>}
                    {selectedRx.vitals.spo2 && <div>SpO2: <span className="font-bold text-slate-900">{selectedRx.vitals.spo2} %</span></div>}
                    {selectedRx.vitals.weight && <div>Weight: <span className="font-bold text-slate-900">{selectedRx.vitals.weight} kg</span></div>}
                  </div>
                </div>
              )}

              {/* Chief Complaint rendering */}
              {selectedRx.chiefComplaint && (
                <div className="mb-5 border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chief Complaint:</span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">{selectedRx.chiefComplaint}</p>
                </div>
              )}

              {/* Diagnosis */}
              <div className="mb-6 border-b border-slate-100 pb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Diagnosis / Findings:</span>
                <p className="text-sm font-bold text-slate-800 mt-1 pl-1">{selectedRx.diagnosis}</p>
              </div>

              {/* Rx Symbol */}
              <div className="text-2xl font-serif font-extrabold text-teal-800 italic mb-4">Rx</div>

              {/* Medications Table */}
              <table className="w-full text-left text-xs mb-8 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="py-2.5 pb-1">Medicine Name & strength</th>
                    <th className="py-2.5 pb-1">Dosage</th>
                    <th className="py-2.5 pb-1">Frequency</th>
                    <th className="py-2.5 pb-1 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {medications.length > 0 && selectedRx.id.includes('random') ? (
                    // Rendering preview of created drugs
                    medications.map((med, index) => (
                      <tr key={index}>
                        <td className="py-3 font-bold text-slate-800">{med.name}</td>
                        <td className="py-3">{med.dosage}</td>
                        <td className="py-3">{med.frequency}</td>
                        <td className="py-3 text-right text-slate-600">{med.duration}</td>
                      </tr>
                    ))
                  ) : (
                    getActiveMeds(selectedRx).map((med, index) => (
                      <tr key={index}>
                        <td className="py-3 font-bold text-slate-800">{med.name}</td>
                        <td className="py-3">{med.dosage}</td>
                        <td className="py-3">{med.frequency}</td>
                        <td className="py-3 text-right text-slate-600">{med.duration}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Investigations requested */}
              {selectedRx.investigations && selectedRx.investigations.length > 0 && (
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Investigations Requested:</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedRx.investigations.map((inv, idx) => (
                      <span key={idx} className="text-[10.5px] bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded font-bold">
                        {inv}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Advice */}
              {selectedRx.advice && (
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dietary & lifestyle advice:</span>
                  <p className="text-xs font-semibold text-slate-600 mt-1.5 leading-relaxed">{selectedRx.advice}</p>
                </div>
              )}

              {/* Follow-up notes */}
              {selectedRx.followUpDate && (
                <div className="mb-6 bg-purple-50/20 border border-purple-100 p-3 rounded-lg text-xs">
                  <span className="text-[10px] font-bold text-[#5C2494] uppercase block">Follow-up appointment:</span>
                  <div className="mt-1.5 flex gap-2 justify-between">
                    <div>Date: <span className="font-bold text-slate-800">{selectedRx.followUpDate}</span></div>
                    {selectedRx.followUpNotes && <div>Instructions: <span className="font-semibold text-slate-700">{selectedRx.followUpNotes}</span></div>}
                  </div>
                </div>
              )}

              {/* Instructions & Signature footer */}
              <div className="flex justify-between items-end pt-6 border-t border-slate-200 mt-10">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">General Instructions:</h4>
                  <p className="text-[11px] text-slate-500 leading-normal mt-1 max-w-[320px]">
                    Drink plenty of lukewarm water. In case of persistent fever or allergy to antibiotics, consult the clinic immediately. Keep medications stored in cool place.
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-serif font-bold text-teal-800 italic text-lg leading-none select-none">Arjun Reddy</div>
                  <div className="w-32 border-b border-slate-300 my-1 ml-auto" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Authorized Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE RX CONFIRMATION */}
      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-extrabold">Delete Prescription</h3>
            </div>
            <p className="text-xs text-slate-650 leading-relaxed mb-5">
              Are you sure you want to permanently delete prescription <b>{selectedRx?.id}</b> for <b>{selectedRx?.patient}</b>? This record will be erased from patient records database.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedRx) return;
                  const updated = prescriptions.filter(r => r.id !== selectedRx.id);
                  syncPrescriptions(updated);
                  setIsDeleteConfirmOpen(false);
                  showToast(`Prescription ${selectedRx.id} has been deleted.`, 'error');
                  setSelectedRx(updated.length > 0 ? updated[0] : null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper meds map resolver fallback
const getActiveMeds = (rx: Prescription): Medication[] => {
  if (rx.medications && rx.medications.length > 0) return rx.medications;
  return MOCK_MEDS_MAP[rx.id] || [{ name: 'Paracetamol 650mg', dosage: '650mg', frequency: 'As needed for fever', duration: '5 Days' }];
};
