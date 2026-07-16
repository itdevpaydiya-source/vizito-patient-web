export interface TemplateBlock {
  id: string;
  name: string;
  title: string;
  enabled: boolean;
  required: boolean;
  hideLabel: boolean;
}

export interface PrescriptionTemplate {
  id: string;
  name: string;
  specialty: string;
  isDefault: boolean;
  isUniversal: boolean; // Universal template (read-only)
  blocks: TemplateBlock[];
  lastUpdated: string;
}

export const DEFAULT_BLOCKS: TemplateBlock[] = [
  { id: 'doctor_info', name: 'Doctor Information', title: 'Doctor Information', enabled: true, required: true, hideLabel: false },
  { id: 'patient_info', name: 'Patient Information', title: 'Patient Information', enabled: true, required: true, hideLabel: false },
  { id: 'vitals', name: 'Vitals', title: 'Patient Vitals', enabled: true, required: false, hideLabel: false },
  { id: 'chief_complaint', name: 'Chief Complaint', title: 'Chief Complaint', enabled: true, required: false, hideLabel: false },
  { id: 'diagnosis', name: 'Diagnosis', title: 'Diagnosis / Findings', enabled: true, required: true, hideLabel: false },
  { id: 'medicines', name: 'Medicines', title: 'Rx (Medicines)', enabled: true, required: true, hideLabel: false },
  { id: 'investigations', name: 'Investigations', title: 'Investigations / Lab Tests', enabled: true, required: false, hideLabel: false },
  { id: 'advice', name: 'Advice', title: 'General Advice', enabled: true, required: false, hideLabel: false },
  { id: 'follow_up', name: 'Follow-up', title: 'Follow-up Instructions', enabled: true, required: false, hideLabel: false },
  { id: 'signature', name: 'Signature', title: 'Authorized Signature', enabled: true, required: true, hideLabel: false },
];

export const INITIAL_TEMPLATES: PrescriptionTemplate[] = [
  {
    id: 'TMP-UNIVERSAL',
    name: 'Universal Clinic Template',
    specialty: 'General Practice',
    isDefault: true,
    isUniversal: true,
    blocks: [...DEFAULT_BLOCKS],
    lastUpdated: '14 Jul 2026'
  },
  {
    id: 'TMP-MY-0001',
    name: 'Pediatrics Core Template',
    specialty: 'Pediatrics',
    isDefault: false,
    isUniversal: false,
    blocks: [
      { id: 'doctor_info', name: 'Doctor Information', title: 'Doctor Information', enabled: true, required: true, hideLabel: false },
      { id: 'patient_info', name: 'Patient Information', title: 'Patient Information', enabled: true, required: true, hideLabel: false },
      { id: 'vitals', name: 'Vitals', title: 'Growth Vitals (Height/Weight)', enabled: true, required: true, hideLabel: false },
      { id: 'chief_complaint', name: 'Chief Complaint', title: 'Chief Complaint', enabled: true, required: false, hideLabel: false },
      { id: 'diagnosis', name: 'Diagnosis', title: 'Clinical Diagnosis', enabled: true, required: true, hideLabel: false },
      { id: 'medicines', name: 'Medicines', title: 'Pediatric Dosage (Rx)', enabled: true, required: true, hideLabel: false },
      { id: 'investigations', name: 'Investigations', title: 'Lab Investigations', enabled: false, required: false, hideLabel: true },
      { id: 'advice', name: 'Advice', title: 'Dietary & Rest Advice', enabled: true, required: false, hideLabel: false },
      { id: 'follow_up', name: 'Follow-up', title: 'Next Visit Schedule', enabled: true, required: false, hideLabel: false },
      { id: 'signature', name: 'Signature', title: 'Physician Signature', enabled: true, required: true, hideLabel: false },
    ],
    lastUpdated: '12 Jul 2026'
  },
  {
    id: 'TMP-MY-0002',
    name: 'Cardiology Advanced Template',
    specialty: 'Cardiology',
    isDefault: false,
    isUniversal: false,
    blocks: [
      { id: 'doctor_info', name: 'Doctor Information', title: 'Doctor Information', enabled: true, required: true, hideLabel: false },
      { id: 'patient_info', name: 'Patient Information', title: 'Patient Information', enabled: true, required: true, hideLabel: false },
      { id: 'vitals', name: 'Vitals', title: 'Cardiac Vitals (BP/Pulse/ECG)', enabled: true, required: true, hideLabel: false },
      { id: 'chief_complaint', name: 'Chief Complaint', title: 'Chief Complaint', enabled: true, required: false, hideLabel: false },
      { id: 'diagnosis', name: 'Diagnosis', title: 'Cardiology Findings', enabled: true, required: true, hideLabel: false },
      { id: 'medicines', name: 'Medicines', title: 'Prescribed Drugs', enabled: true, required: true, hideLabel: false },
      { id: 'investigations', name: 'Investigations', title: 'Required Diagnostics (Eco/TMT)', enabled: true, required: false, hideLabel: false },
      { id: 'advice', name: 'Advice', title: 'Lifestyle & Cardiac Advice', enabled: true, required: false, hideLabel: false },
      { id: 'follow_up', name: 'Follow-up', title: 'Follow-up Appointment', enabled: true, required: false, hideLabel: false },
      { id: 'signature', name: 'Signature', title: 'Cardiologist Signature', enabled: true, required: true, hideLabel: false },
    ],
    lastUpdated: '10 Jul 2026'
  }
];
