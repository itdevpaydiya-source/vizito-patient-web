export interface TimelineEntry {
  label: string;
  time: string;
}

export interface Medicine {
  name: string;
  dosage: string;
  duration: string;
}

export interface Prescription {
  medicines: Medicine[];
  generalAdvice: string;
  isCompleted: boolean;
}

export interface Appointment {
  id: string;
  patient: string;
  initials: string;
  avatarColor: string;
  gender: 'M' | 'F';
  age: number;
  patientId: string;
  phone: string;
  date: string; // Format: "DD MMM YYYY" e.g., "26 May 2025"
  time: string; // Format: "HH:MM AM/PM" e.g., "09:30 AM"
  type: 'Walk-In' | 'In-Clinic' | 'Video Consultation' | 'Home Visit';
  location: string;
  status: 'Pending' | 'Confirmed' | 'Checked In' | 'Consultation Started' | 'Completed' | 'Cancelled' | 'No Show';
  paymentStatus: 'Paid' | 'Pending' | 'Waived';
  amount: number;
  reason: string;
  notes: string;
  chiefComplaint?: string;
  symptoms?: string;
  diagnosis?: string;
  clinicalNotes?: string;
  timeline: TimelineEntry[];
  documents: { name: string; date: string; size: string }[];
  prescription?: Prescription;
}

export const getRelativeDisplayDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'APT-2026-0001',
    patient: 'Ramesh Kumar',
    initials: 'RK',
    avatarColor: 'bg-teal-100 text-teal-700',
    gender: 'M',
    age: 45,
    patientId: 'HYD12345',
    phone: '+91 98765 43210',
    date: getRelativeDisplayDate(0), // Today
    time: '09:30 AM',
    type: 'In-Clinic',
    location: 'Banjarahills Clinic',
    status: 'Confirmed',
    paymentStatus: 'Paid',
    amount: 800,
    reason: 'Chest pain and breathlessness',
    notes: 'Patient experiencing mild discomfort from last 3 days.',
    chiefComplaint: 'Mild chest pressure',
    symptoms: 'Shortness of breath on exertion',
    diagnosis: 'Pre-hypertension, cardiac checkup recommended',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(0) + ', 08:00 AM' },
      { label: 'Confirmed', time: getRelativeDisplayDate(0) + ', 08:30 AM' }
    ],
    documents: [
      { name: 'ECG_Report_Initial.pdf', date: getRelativeDisplayDate(0), size: '1.2 MB' }
    ]
  },
  {
    id: 'APT-2026-0002',
    patient: 'Priya Sharma',
    initials: 'PS',
    avatarColor: 'bg-pink-100 text-pink-700',
    gender: 'F',
    age: 32,
    patientId: 'HYD12346',
    phone: '+91 87654 32109',
    date: getRelativeDisplayDate(0), // Today
    time: '10:30 AM',
    type: 'Video Consultation',
    location: 'Dr. Arjun Virtual Clinic',
    status: 'Confirmed',
    paymentStatus: 'Paid',
    amount: 600,
    reason: 'Follow-up consultation',
    notes: 'Post-medication review.',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(-1) + ', 04:00 PM' },
      { label: 'Confirmed', time: getRelativeDisplayDate(-1) + ', 04:15 PM' }
    ],
    documents: []
  },
  {
    id: 'APT-2026-0003',
    patient: 'Suresh Babu',
    initials: 'SB',
    avatarColor: 'bg-blue-100 text-blue-700',
    gender: 'M',
    age: 50,
    patientId: 'HYD12347',
    phone: '+91 76543 21098',
    date: getRelativeDisplayDate(0), // Today
    time: '11:30 AM',
    type: 'In-Clinic',
    location: 'Banjarahills Clinic',
    status: 'Pending',
    paymentStatus: 'Pending',
    amount: 800,
    reason: 'Shortness of breath',
    notes: 'Referred by Dr. Mehta.',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(0) + ', 09:15 AM' }
    ],
    documents: []
  },
  {
    id: 'APT-2026-0004',
    patient: 'Anjali Mehta',
    initials: 'AM',
    avatarColor: 'bg-purple-100 text-purple-700',
    gender: 'F',
    age: 28,
    patientId: 'HYD12348',
    phone: '+91 65432 10987',
    date: getRelativeDisplayDate(0), // Today
    time: '02:00 PM',
    type: 'Video Consultation',
    location: 'Dr. Arjun Virtual Clinic',
    status: 'Confirmed',
    paymentStatus: 'Paid',
    amount: 600,
    reason: 'Routine cardiac checkup',
    notes: '',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(-2) + ', 11:00 AM' },
      { label: 'Confirmed', time: getRelativeDisplayDate(-2) + ', 11:15 AM' }
    ],
    documents: []
  },
  {
    id: 'APT-2026-0005',
    patient: 'Vikram Patel',
    initials: 'VP',
    avatarColor: 'bg-amber-100 text-amber-700',
    gender: 'M',
    age: 38,
    patientId: 'HYD12349',
    phone: '+91 54321 09876',
    date: getRelativeDisplayDate(0), // Today
    time: '03:30 PM',
    type: 'Walk-In',
    location: 'City Care Hospital',
    status: 'Completed',
    paymentStatus: 'Paid',
    amount: 800,
    reason: 'Palpitations',
    notes: 'ECG done, report normal.',
    chiefComplaint: 'Palpitations',
    symptoms: 'Fluttering chest sensations',
    diagnosis: 'Sinus arrhythmia, normal physiological variation',
    clinicalNotes: 'ECG looks normal. Prescribed lifestyle modifications.',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(0) + ', 03:00 PM' },
      { label: 'Checked In', time: getRelativeDisplayDate(0) + ', 03:10 PM' },
      { label: 'Consultation Started', time: getRelativeDisplayDate(0) + ', 03:30 PM' },
      { label: 'Consultation Completed', time: getRelativeDisplayDate(0) + ', 03:55 PM' }
    ],
    documents: [
      { name: 'ECG_26May.pdf', date: getRelativeDisplayDate(0), size: '2.1 MB' }
    ]
  },
  {
    id: 'APT-2026-0006',
    patient: 'Neha Singh',
    initials: 'NS',
    avatarColor: 'bg-rose-100 text-rose-700',
    gender: 'F',
    age: 29,
    patientId: 'HYD12350',
    phone: '+91 43210 98765',
    date: getRelativeDisplayDate(-1), // Yesterday
    time: '04:30 PM',
    type: 'Home Visit',
    location: 'City Care Hospital',
    status: 'Cancelled',
    paymentStatus: 'Waived',
    amount: 1200,
    reason: 'Post-surgery follow-up',
    notes: 'Patient has mobility issues.',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(-2) + ', 02:00 PM' },
      { label: 'Cancelled', time: getRelativeDisplayDate(-1) + ', 09:00 AM' }
    ],
    documents: []
  },
  {
    id: 'APT-2026-0007',
    patient: 'Rahul Joshi',
    initials: 'RJ',
    avatarColor: 'bg-green-100 text-green-700',
    gender: 'M',
    age: 41,
    patientId: 'HYD12351',
    phone: '+91 32109 87654',
    date: getRelativeDisplayDate(1), // Tomorrow
    time: '09:00 AM',
    type: 'Video Consultation',
    location: 'Dr. Arjun Virtual Clinic',
    status: 'Confirmed',
    paymentStatus: 'Paid',
    amount: 600,
    reason: 'Lab report review',
    notes: '',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(-1) + ', 10:00 AM' }
    ],
    documents: []
  },
  {
    id: 'APT-2026-0008',
    patient: 'Deepa Rao',
    initials: 'DR',
    avatarColor: 'bg-indigo-100 text-indigo-700',
    gender: 'F',
    age: 55,
    patientId: 'HYD12352',
    phone: '+91 21098 76543',
    date: getRelativeDisplayDate(-1), // Yesterday
    time: '10:00 AM',
    type: 'In-Clinic',
    location: 'Banjarahills Clinic',
    status: 'Cancelled',
    paymentStatus: 'Waived',
    amount: 800,
    reason: 'Hypertension management',
    notes: 'Patient cancelled due to travel.',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(-3) + ', 03:00 PM' },
      { label: 'Cancelled', time: getRelativeDisplayDate(-2) + ', 10:00 AM' }
    ],
    documents: []
  },
  {
    id: 'APT-2026-0009',
    patient: 'Amit Sharma',
    initials: 'AS',
    avatarColor: 'bg-teal-100 text-teal-700',
    gender: 'M',
    age: 32,
    patientId: 'PAT123456',
    phone: '+91 98765 43210',
    date: getRelativeDisplayDate(0), // Today
    time: '11:30 AM',
    type: 'In-Clinic',
    location: 'Banjarahills Clinic',
    status: 'Checked In',
    paymentStatus: 'Paid',
    amount: 800,
    reason: 'Routine checkup for asthma',
    notes: '',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(0) + ', 09:30 AM' },
      { label: 'Patient Checked In', time: getRelativeDisplayDate(0) + ', 11:20 AM' }
    ],
    documents: []
  },
  {
    id: 'APT-2026-0010',
    patient: 'Rajesh Patil',
    initials: 'RP',
    avatarColor: 'bg-purple-100 text-purple-700',
    gender: 'M',
    age: 42,
    patientId: 'HYD12353',
    phone: '+91 99887 76655',
    date: getRelativeDisplayDate(1), // Tomorrow
    time: '09:30 AM',
    type: 'Home Visit',
    location: 'Secunderabad Clinic',
    status: 'Confirmed',
    paymentStatus: 'Pending',
    amount: 1000,
    reason: 'Geriatric general consultation',
    notes: 'Requires home visit equipment.',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(0) + ', 10:00 AM' }
    ],
    documents: []
  },
  {
    id: 'APT-2026-0011',
    patient: 'Sunita Rao',
    initials: 'SR',
    avatarColor: 'bg-amber-100 text-amber-700',
    gender: 'F',
    age: 28,
    patientId: 'HYD12354',
    phone: '+91 88776 65544',
    date: getRelativeDisplayDate(0), // Today
    time: '02:30 PM',
    type: 'Video Consultation',
    location: 'Dr. Arjun Virtual Clinic',
    status: 'Consultation Started',
    paymentStatus: 'Paid',
    amount: 600,
    reason: 'Chronic migraine follow-up',
    notes: 'Prefers online chat consultations.',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(0) + ', 11:00 AM' },
      { label: 'Consultation Started', time: getRelativeDisplayDate(0) + ', 02:35 PM' }
    ],
    documents: []
  },
  {
    id: 'APT-2026-0012',
    patient: 'Vijay Verma',
    initials: 'VV',
    avatarColor: 'bg-emerald-100 text-emerald-700',
    gender: 'M',
    age: 35,
    patientId: 'HYD12355',
    phone: '+91 77665 54433',
    date: getRelativeDisplayDate(0), // Today
    time: '03:30 PM',
    type: 'Walk-In',
    location: 'Banjarahills Clinic',
    status: 'Pending',
    paymentStatus: 'Pending',
    amount: 800,
    reason: 'Acute stomach pain',
    notes: '',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(0) + ', 03:15 PM' }
    ],
    documents: []
  },
  {
    id: 'APT-2026-0013',
    patient: 'Karthik Subramanian',
    initials: 'KS',
    avatarColor: 'bg-blue-100 text-blue-700',
    gender: 'M',
    age: 47,
    patientId: 'HYD12356',
    phone: '+91 66554 43322',
    date: getRelativeDisplayDate(0), // Today
    time: '04:00 PM',
    type: 'Video Consultation',
    location: 'Dr. Arjun Virtual Clinic',
    status: 'Completed',
    paymentStatus: 'Paid',
    amount: 600,
    reason: 'ECG report review',
    notes: 'Prescribed general diet control guidelines.',
    chiefComplaint: 'Chest tightness',
    symptoms: 'Mild heartburn post-meals',
    diagnosis: 'GERD, rule out myocardial ischemia',
    clinicalNotes: 'ECG was within normal bounds. Advised lifestyle modifications.',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(0) + ', 12:00 PM' },
      { label: 'Consultation Started', time: getRelativeDisplayDate(0) + ', 04:00 PM' },
      { label: 'Consultation Completed', time: getRelativeDisplayDate(0) + ', 04:15 PM' }
    ],
    documents: []
  },
  {
    id: 'APT-2026-0014',
    patient: 'Meera Nair',
    initials: 'MN',
    avatarColor: 'bg-rose-100 text-rose-700',
    gender: 'F',
    age: 51,
    patientId: 'HYD12357',
    phone: '+91 55443 32211',
    date: getRelativeDisplayDate(-1), // Yesterday
    time: '11:00 AM',
    type: 'In-Clinic',
    location: 'Secunderabad Clinic',
    status: 'Completed',
    paymentStatus: 'Paid',
    amount: 800,
    reason: 'Annual health checkup review',
    notes: 'Routine yearly checkup.',
    chiefComplaint: 'General checkup',
    symptoms: 'No active complaints',
    diagnosis: 'Healthy profile, mild vitamin D deficiency',
    clinicalNotes: 'Prescribed daily vitamin supplements.',
    timeline: [
      { label: 'Appointment Created', time: getRelativeDisplayDate(-2) + ', 02:00 PM' },
      { label: 'Consultation Started', time: getRelativeDisplayDate(-1) + ', 11:00 AM' },
      { label: 'Consultation Completed', time: getRelativeDisplayDate(-1) + ', 11:20 AM' }
    ],
    documents: []
  }
];
