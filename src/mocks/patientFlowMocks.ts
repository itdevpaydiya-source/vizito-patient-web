export const MOCK_PATIENT_PROFILE = {
  id: 'pat_123',
  name: 'Meera Patel',
  age: 32,
  bloodGroup: 'O+',
  height: '165 cm',
  weight: '62 kg',
};

export const MOCK_PATIENT_APPOINTMENTS = [
  { 
    id: '1', 
    time: '10:30 AM', 
    date: 'Today', 
    doctorName: 'Dr. Sarah Jenkins', 
    specialty: 'Cardiologist',
    type: 'In-Clinic', 
    status: 'Upcoming', 
    clinicName: 'City Care Hospital' 
  },
  { 
    id: '2', 
    time: '02:15 PM', 
    date: 'Oct 24, 2026', 
    doctorName: 'Dr. Vikram Singh', 
    specialty: 'Dermatologist',
    type: 'Online', 
    status: 'Scheduled', 
    clinicName: 'Apollo Spectra' 
  },
];

export const MOCK_AVAILABLE_DOCTORS = [
  {
    id: 'doc_1',
    name: 'Dr. Sarah Jenkins',
    specialty: 'Cardiologist',
    rating: 4.8,
    reviews: 124,
    availability: 'Available Today',
    imageUrl: 'https://i.pravatar.cc/150?img=47',
    fee: 1500,
  },
  {
    id: 'doc_2',
    name: 'Dr. Rahul Sharma',
    specialty: 'General Physician',
    rating: 4.9,
    reviews: 312,
    availability: 'Next available Tomorrow',
    imageUrl: 'https://i.pravatar.cc/150?img=11',
    fee: 800,
  },
  {
    id: 'doc_3',
    name: 'Dr. Anita Desai',
    specialty: 'Pediatrician',
    rating: 4.7,
    reviews: 89,
    availability: 'Available Today',
    imageUrl: 'https://i.pravatar.cc/150?img=32',
    fee: 1200,
  }
];

export const MOCK_LAB_REPORTS = [
  { id: 'rep_1', testName: 'Complete Blood Count (CBC)', date: '2026-06-20', status: 'Available', labName: 'PathCare Labs' },
  { id: 'rep_2', testName: 'Lipid Profile', date: '2026-06-15', status: 'Available', labName: 'PathCare Labs' },
  { id: 'rep_3', testName: 'Thyroid Function Test', date: '2026-06-25', status: 'Pending', labName: 'City Care Hospital' },
];

export const MOCK_HEALTH_VITALS = [
  { name: 'Heart Rate', value: '72', unit: 'bpm', status: 'normal' },
  { name: 'Blood Pressure', value: '120/80', unit: 'mmHg', status: 'normal' },
  { name: 'Sugar (Fasting)', value: '95', unit: 'mg/dL', status: 'normal' },
];

export const MOCK_PHARMACY_ORDERS = [
  {
    id: 'ord_123',
    date: '2026-06-24',
    status: 'Delivered',
    pharmacyName: 'Apollo Pharmacy',
    totalCost: 450,
    items: ['Paracetamol 500mg', 'Vitamin C Supplements'],
  },
  {
    id: 'ord_124',
    date: 'Today',
    status: 'Processing',
    pharmacyName: 'MedPlus',
    totalCost: 1250,
    items: ['Amoxicillin 250mg', 'Cough Syrup'],
  }
];

export const MOCK_FAMILY_MEMBERS = [
  {
    id: 'fam_1',
    name: 'Raj Patel',
    relationship: 'Father',
    age: 64,
    bloodGroup: 'A+',
    imageUrl: 'https://i.pravatar.cc/150?img=11',
  },
  {
    id: 'fam_2',
    name: 'Sita Patel',
    relationship: 'Mother',
    age: 60,
    bloodGroup: 'O+',
    imageUrl: 'https://i.pravatar.cc/150?img=43',
  },
  {
    id: 'fam_3',
    name: 'Aarav Patel',
    relationship: 'Son',
    age: 8,
    bloodGroup: 'O+',
    imageUrl: 'https://i.pravatar.cc/150?img=12',
  }
];
