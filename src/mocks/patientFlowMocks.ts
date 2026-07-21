export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  age: number;
  gender?: string;
  bloodGroup: string;
  isSelf?: boolean;
}

export const MOCK_PATIENT_PROFILE = {
  id: 'pat_123',
  name: 'Ravi Kumar',
  age: 34,
  bloodGroup: 'O+',
  height: '172 cm',
  weight: '70 kg',
};

export const MOCK_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'self',
    name: 'Ravi Kumar (Me)',
    relationship: 'Self',
    age: 34,
    gender: 'Male',
    bloodGroup: 'O+',
    isSelf: true,
  },
  {
    id: 'fam_1',
    name: 'Ramesh Kumar',
    relationship: 'Father',
    age: 64,
    gender: 'Male',
    bloodGroup: 'A+',
  },
  {
    id: 'fam_2',
    name: 'Sunita Kumar',
    relationship: 'Mother',
    age: 60,
    gender: 'Female',
    bloodGroup: 'O+',
  },
  {
    id: 'fam_3',
    name: 'Ananya Kumar',
    relationship: 'Daughter',
    age: 6,
    gender: 'Female',
    bloodGroup: 'O+',
  }
];

export interface HealthcareServiceItem {
  id: string;
  name: string;
  iconName: string;
  emoji: string;
  description: string;
  route: string;
  bgGradient: string;
}

export const MOCK_HEALTHCARE_SERVICES: HealthcareServiceItem[] = [
  {
    id: 'doctor',
    name: 'Doctor Consultation',
    iconName: 'Stethoscope',
    emoji: '🩺',
    description: 'Book online or in-clinic consultations with verified specialists',
    route: '/booking?service=doctor',
    bgGradient: 'from-violet-50 to-indigo-50 border-violet-200 text-violet-700'
  },
  {
    id: 'hospital',
    name: 'Hospital & Clinic',
    iconName: 'Building2',
    emoji: '🏥',
    description: 'Find top multi-specialty hospitals and neighbor clinics',
    route: '/booking?service=hospital',
    bgGradient: 'from-sky-50 to-blue-50 border-sky-200 text-sky-700'
  },
  {
    id: 'homecare',
    name: 'Home Care',
    iconName: 'Home',
    emoji: '🏠',
    description: 'Nursing, physiotherapy, and elderly assistance at home',
    route: '/booking?service=homecare',
    bgGradient: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700'
  },
  {
    id: 'ambulance',
    name: 'Ambulance',
    iconName: 'Truck',
    emoji: '🚑',
    description: '24/7 Emergency response and patient transport dispatch',
    route: '/booking?service=ambulance',
    bgGradient: 'from-rose-50 to-red-50 border-rose-200 text-rose-700'
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    iconName: 'Pill',
    emoji: '💊',
    description: 'Order genuine medicines with home delivery',
    route: '/booking?service=pharmacy',
    bgGradient: 'from-purple-50 to-fuchsia-50 border-purple-200 text-purple-700'
  },
  {
    id: 'diagnostic',
    name: 'Diagnostic Lab',
    iconName: 'Microscope',
    emoji: '🧪',
    description: 'Book blood tests and health checkups with home sample collection',
    route: '/booking?service=diagnostic',
    bgGradient: 'from-amber-50 to-yellow-50 border-amber-200 text-amber-700'
  },
  {
    id: 'equipment',
    name: 'Equipment Rental',
    iconName: 'Accessibility',
    emoji: '🦽',
    description: 'Rent wheelchairs, oxygen concentrators, and hospital beds',
    route: '/booking?service=equipment',
    bgGradient: 'from-cyan-50 to-teal-50 border-cyan-200 text-cyan-700'
  }
];

export interface BookingRecord {
  id: string;
  serviceType: string;
  providerName: string;
  category: 'doctor' | 'hospital' | 'homecare' | 'ambulance' | 'pharmacy' | 'diagnostic' | 'equipment';
  bookingDate: string;
  bookingTime: string;
  status: 'Waiting' | 'In Progress' | 'En Route' | 'Confirmed' | 'Scheduled' | 'Completed' | 'Cancelled';
  memberId: string;
  memberName: string;
  location?: string;
  feeOrCost?: string;
  doctorSpecialty?: string;
}

export const MOCK_ACTIVE_BOOKINGS: BookingRecord[] = [
  {
    id: 'BK-101',
    serviceType: 'Doctor Consultation',
    providerName: 'Dr. Johnathan Doe',
    doctorSpecialty: 'Cardiologist',
    category: 'doctor',
    bookingDate: 'Today',
    bookingTime: '10:30 AM',
    status: 'Waiting',
    memberId: 'self',
    memberName: 'Ravi Kumar (Me)',
    location: 'Apollo Spectra, Jubilee Hills',
    feeOrCost: '₹800'
  },
  {
    id: 'BK-102',
    serviceType: 'Ambulance Emergency',
    providerName: 'RedCross Express Dispatch',
    category: 'ambulance',
    bookingDate: 'Today',
    bookingTime: '11:15 AM',
    status: 'En Route',
    memberId: 'fam_1',
    memberName: 'Ramesh Kumar (Father)',
    location: 'En Route to Care Hospital',
    feeOrCost: '₹1,500'
  },
  {
    id: 'BK-103',
    serviceType: 'Pharmacy Delivery',
    providerName: 'MedPlus Pharmacy',
    category: 'pharmacy',
    bookingDate: 'Today',
    bookingTime: '12:00 PM',
    status: 'In Progress',
    memberId: 'self',
    memberName: 'Ravi Kumar (Me)',
    location: 'Out for Delivery',
    feeOrCost: '₹450'
  }
];

export const MOCK_UPCOMING_BOOKINGS: BookingRecord[] = [
  {
    id: 'BK-201',
    serviceType: 'Hospital Consultation',
    providerName: 'Apollo Hospitals',
    category: 'hospital',
    bookingDate: 'Tomorrow',
    bookingTime: '02:00 PM',
    status: 'Confirmed',
    memberId: 'self',
    memberName: 'Ravi Kumar (Me)',
    location: 'Apollo Main Block, Room 302',
    feeOrCost: '₹1,200'
  },
  {
    id: 'BK-202',
    serviceType: 'Lab Test - Sample Collection',
    providerName: 'Dr Lal PathLabs',
    category: 'diagnostic',
    bookingDate: 'Jul 22, 2026',
    bookingTime: '08:00 AM',
    status: 'Scheduled',
    memberId: 'fam_2',
    memberName: 'Sunita Kumar (Mother)',
    location: 'Home Sample Collection',
    feeOrCost: '₹950'
  },
  {
    id: 'BK-203',
    serviceType: 'Physiotherapy Session',
    providerName: 'Portea Home Care',
    category: 'homecare',
    bookingDate: 'Jul 23, 2026',
    bookingTime: '05:00 PM',
    status: 'Confirmed',
    memberId: 'fam_1',
    memberName: 'Ramesh Kumar (Father)',
    location: 'Home Visit',
    feeOrCost: '₹700'
  }
];

export const MOCK_RECENT_ACTIVITIES: BookingRecord[] = [
  {
    id: 'ACT-301',
    serviceType: 'Doctor Consultation',
    providerName: 'Dr. Sarah Jenkins',
    doctorSpecialty: 'Cardiologist',
    category: 'doctor',
    bookingDate: 'Yesterday',
    bookingTime: '04:30 PM',
    status: 'Completed',
    memberId: 'self',
    memberName: 'Ravi Kumar (Me)',
    location: 'Online Video Call',
    feeOrCost: '₹1,000'
  },
  {
    id: 'ACT-302',
    serviceType: 'Pharmacy Order Delivered',
    providerName: 'Apollo Pharmacy',
    category: 'pharmacy',
    bookingDate: '18 Jul 2026',
    bookingTime: '01:15 PM',
    status: 'Completed',
    memberId: 'fam_1',
    memberName: 'Ramesh Kumar (Father)',
    location: 'Delivered to Home',
    feeOrCost: '₹1,250'
  },
  {
    id: 'ACT-303',
    serviceType: 'Full Body Blood Checkup',
    providerName: 'PathCare Diagnostic Lab',
    category: 'diagnostic',
    bookingDate: '15 Jul 2026',
    bookingTime: '09:00 AM',
    status: 'Completed',
    memberId: 'self',
    memberName: 'Ravi Kumar (Me)',
    location: 'Lab Center Visit',
    feeOrCost: '₹1,800'
  }
];

export interface FavoriteProvider {
  id: string;
  name: string;
  category: string;
  specialty?: string;
  rating: number;
  reviewsCount: number;
  location: string;
  imageUrl?: string;
  typeBadge: 'Doctor' | 'Hospital' | 'Clinic' | 'HomeCare' | 'Ambulance' | 'Pharmacy' | 'Diagnostic' | 'Equipment';
}

export const MOCK_FAVORITE_PROVIDERS: FavoriteProvider[] = [
  {
    id: 'fav_1',
    name: 'Dr. Smith',
    category: 'Doctor',
    specialty: 'Senior Cardiologist',
    rating: 4.9,
    reviewsCount: 240,
    location: 'Jubilee Hills, Hyderabad',
    typeBadge: 'Doctor'
  },
  {
    id: 'fav_2',
    name: 'Apollo Hospital',
    category: 'Hospital',
    specialty: 'Multi-Specialty Super Specialty',
    rating: 4.8,
    reviewsCount: 1250,
    location: 'Greams Road, Chennai',
    typeBadge: 'Hospital'
  },
  {
    id: 'fav_3',
    name: 'XYZ Pharmacy',
    category: 'Pharmacy',
    specialty: '24/7 Prescription Fulfillments',
    rating: 4.7,
    reviewsCount: 380,
    location: 'Banjara Hills, Hyderabad',
    typeBadge: 'Pharmacy'
  },
  {
    id: 'fav_4',
    name: 'RedCross Emergency Ambulance',
    category: 'Ambulance',
    specialty: 'ICU & Oxygen Supported Dispatch',
    rating: 5.0,
    reviewsCount: 95,
    location: 'Citywide Rapid Response',
    typeBadge: 'Ambulance'
  }
];

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'booking' | 'reminder' | 'order' | 'payment' | 'cancel';
}

export const MOCK_DASHBOARD_NOTIFICATIONS: DashboardNotification[] = [
  {
    id: 'notif_1',
    title: 'Booking Confirmed',
    message: 'Doctor appointment with Dr. Johnathan Doe confirmed for Today at 10:30 AM.',
    timestamp: '10 mins ago',
    read: false,
    type: 'booking'
  },
  {
    id: 'notif_2',
    title: 'Appointment Reminder',
    message: 'Doctor consultation scheduled tomorrow at 02:00 PM with Apollo Hospitals.',
    timestamp: '1 hour ago',
    read: false,
    type: 'reminder'
  },
  {
    id: 'notif_3',
    title: 'Medicine Order Delivered',
    message: 'Your pharmacy order from Apollo Pharmacy was successfully delivered.',
    timestamp: 'Yesterday',
    read: true,
    type: 'order'
  },
  {
    id: 'notif_4',
    title: 'Payment Success',
    message: 'Payment of ₹800 processed successfully for Consultation BK-101.',
    timestamp: '2 days ago',
    read: true,
    type: 'payment'
  }
];

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
    imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
    fee: 1500,
  },
  {
    id: 'doc_2',
    name: 'Dr. Rahul Sharma',
    specialty: 'General Physician',
    rating: 4.9,
    reviews: 312,
    availability: 'Next available Tomorrow',
    imageUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
    fee: 800,
  },
  {
    id: 'doc_3',
    name: 'Dr. Anita Desai',
    specialty: 'Pediatrician',
    rating: 4.7,
    reviews: 89,
    availability: 'Available Today',
    imageUrl: 'https://images.unsplash.com/photo-1594824813566-88855ce78907?w=300&auto=format&fit=crop&q=80',
    fee: 1200,
  },
  {
    id: 'doc_4',
    name: 'Dr. Vikram Singh',
    specialty: 'Dermatologist',
    rating: 4.6,
    reviews: 210,
    availability: 'Next available Tomorrow',
    imageUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
    fee: 900,
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

