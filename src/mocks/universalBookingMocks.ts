export interface HealthcareServiceOption {
  id: string;
  name: string;
  iconName: string;
  emoji: string;
  description: string;
  bgGradient: string;
  accentColor: string;
}

export const MOCK_BOOKING_SERVICES: HealthcareServiceOption[] = [
  {
    id: 'doctor',
    name: 'Doctor Consultation',
    iconName: 'Stethoscope',
    emoji: '🩺',
    description: 'Consult with specialist doctors (video or in-clinic visits)',
    bgGradient: 'from-violet-500/10 via-purple-500/5 to-indigo-500/10 border-violet-200 text-violet-700 hover:border-violet-400',
    accentColor: 'violet'
  },
  {
    id: 'hospital',
    name: 'Hospital & Clinic',
    iconName: 'Building2',
    emoji: '🏥',
    description: 'Search hospitals, view departments, and book OPD appointments',
    bgGradient: 'from-sky-500/10 via-blue-500/5 to-cyan-500/10 border-sky-200 text-sky-700 hover:border-sky-400',
    accentColor: 'sky'
  },
  {
    id: 'homecare',
    name: 'Home Care Services',
    iconName: 'Home',
    emoji: '🏠',
    description: 'Professional nursing, physiotherapy & doctor visits at home',
    bgGradient: 'from-emerald-500/10 via-teal-500/5 to-green-500/10 border-emerald-200 text-emerald-700 hover:border-emerald-400',
    accentColor: 'emerald'
  },
  {
    id: 'ambulance',
    name: 'Scheduled Ambulance',
    iconName: 'Truck',
    emoji: '🚑',
    description: 'Book basic & advanced life support ambulances for transport',
    bgGradient: 'from-rose-500/10 via-red-500/5 to-orange-500/10 border-rose-200 text-rose-700 hover:border-rose-400',
    accentColor: 'rose'
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    iconName: 'Pill',
    emoji: '💊',
    description: 'Order genuine medicines & upload prescriptions for home delivery',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-yellow-500/10 border-amber-200 text-amber-700 hover:border-amber-400',
    accentColor: 'amber'
  },
  {
    id: 'diagnostic',
    name: 'Diagnostic Laboratory',
    iconName: 'Microscope',
    emoji: '🧪',
    description: 'Book lab tests & health packages with free home collection',
    bgGradient: 'from-fuchsia-500/10 via-pink-500/5 to-purple-500/10 border-fuchsia-200 text-fuchsia-700 hover:border-fuchsia-400',
    accentColor: 'fuchsia'
  },
  {
    id: 'equipment',
    name: 'Medical Equipment Rental',
    iconName: 'Accessibility',
    emoji: '🦽',
    description: 'Rent hospital beds, oxygen cylinders, wheelchairs & monitors',
    bgGradient: 'from-cyan-500/10 via-teal-500/5 to-emerald-500/10 border-cyan-200 text-cyan-700 hover:border-cyan-400',
    accentColor: 'cyan'
  }
];

export interface ExperienceHistoryItem {
  hospitalName: string;
  years: number;
  isPresent?: boolean;
}

export interface ProviderReview {
  id: string;
  providerId?: string;
  patientName: string;
  patientAvatar?: string;
  rating: number;
  date: string;
  comment: string;
  verified?: boolean;
}

export interface ProviderItem {
  id: string;
  serviceId: string;
  name: string;
  subtitle?: string;
  rating: number;
  reviewsCount: number;
  location: string;
  availability: string;
  feeOrPrice: string;
  priceValue: number;
  imageUrl: string;
  specialtyOrType?: string;
  badge?: string;
  gender?: 'Male' | 'Female';
  experienceYears?: number;
  experienceHistory?: ExperienceHistoryItem[];
  languages?: string[];
  qualification?: string;
  about?: string;
  supportsQueue?: boolean;
  queueNumber?: string;
  patientsAhead?: number;
  waitingTime?: string;
  supportsTracking?: boolean;
  trackingStatus?: string;
  reviewsList?: ProviderReview[];
}

export const MOCK_PROVIDER_REVIEWS: ProviderReview[] = [
  {
    id: 'rev_1',
    patientName: 'Anita Sharma',
    rating: 5,
    date: '2 days ago',
    comment: 'Extremely polite and thorough diagnosis. Explained the treatment plan clearly and took time to address all my concerns.',
    verified: true
  },
  {
    id: 'rev_2',
    patientName: 'Rajesh Kumar',
    rating: 5,
    date: '1 week ago',
    comment: 'Punctual appointment with zero wait time. Highly professional healthcare service!',
    verified: true
  },
  {
    id: 'rev_3',
    patientName: 'Priya Verma',
    rating: 4,
    date: '2 weeks ago',
    comment: 'Great experience overall. The nursing staff and facility were clean and well organized.',
    verified: true
  },
  {
    id: 'rev_4',
    patientName: 'Vikram Mehta',
    rating: 5,
    date: '3 weeks ago',
    comment: 'Very happy with the quick response and prescription guidance. Would definitely recommend to my family.',
    verified: true
  }
];

export const MOCK_UNIVERSAL_PROVIDERS: ProviderItem[] = [
  // 1. Doctor Providers
  {
    id: 'prov_doc_1',
    serviceId: 'doctor',
    name: 'Dr. Sarah Jenkins',
    subtitle: 'MD, DM - Cardiology',
    qualification: 'MD (General Medicine), DM (Cardiology)',
    specialtyOrType: 'Cardiologist',
    experienceYears: 14,
    experienceHistory: [
      { hospitalName: 'AIG', years: 5, isPresent: true },
      { hospitalName: 'Care', years: 5 },
      { hospitalName: 'Medicover', years: 4 }
    ],
    gender: 'Female',
    languages: ['English', 'Hindi', 'Telugu'],
    rating: 4.9,
    reviewsCount: 184,
    location: 'Apollo Spectra, Jubilee Hills',
    availability: 'Available Today (10:30 AM onwards)',
    feeOrPrice: '₹800 Consultation Fee',
    priceValue: 800,
    imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
    badge: 'Top Rated Specialist',
    about: 'Dr. Sarah Jenkins is a renowned senior cardiologist with over 14 years of expertise in non-invasive cardiology, preventive heart care, and hypertension management.',
    supportsQueue: true,
    queueNumber: '#A-07',
    patientsAhead: 3,
    waitingTime: '~15-20 mins'
  },
  {
    id: 'prov_doc_2',
    serviceId: 'doctor',
    name: 'Dr. Rahul Sharma',
    subtitle: 'MBBS, MD - General Medicine',
    qualification: 'MBBS, MD (Internal Medicine)',
    specialtyOrType: 'General Physician',
    experienceYears: 9,
    experienceHistory: [
      { hospitalName: 'Max Healthcare', years: 4, isPresent: true },
      { hospitalName: 'Apollo', years: 3 },
      { hospitalName: 'Yashoda', years: 2 }
    ],
    gender: 'Male',
    languages: ['English', 'Hindi'],
    rating: 4.8,
    reviewsCount: 312,
    location: 'Max Healthcare, Banjara Hills',
    availability: 'Available Today (02:00 PM onwards)',
    feeOrPrice: '₹500 Consultation Fee',
    priceValue: 500,
    imageUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
    about: 'Experienced General Physician specializing in diabetes management, chronic care, viral fever treatments, and routine health checkups.',
    supportsQueue: true,
    queueNumber: '#B-12',
    patientsAhead: 5,
    waitingTime: '~25 mins'
  },
  {
    id: 'prov_doc_3',
    serviceId: 'doctor',
    name: 'Dr. Anita Desai',
    subtitle: 'MD - Pediatrics',
    qualification: 'MD (Pediatrics), DCH',
    specialtyOrType: 'Pediatrician',
    experienceYears: 11,
    experienceHistory: [
      { hospitalName: 'Rainbow Children Hospital', years: 6, isPresent: true },
      { hospitalName: 'Fernandez Hospital', years: 5 }
    ],
    gender: 'Female',
    languages: ['English', 'Telugu', 'Hindi'],
    rating: 4.7,
    reviewsCount: 95,
    location: 'Rainbow Children Hospital',
    availability: 'Next Available Tomorrow',
    feeOrPrice: '₹700 Consultation Fee',
    priceValue: 700,
    imageUrl: 'https://images.unsplash.com/photo-1594824813566-88855ce78907?w=300&auto=format&fit=crop&q=80',
    about: 'Compassionate pediatrician focusing on child immunization, growth monitoring, pediatric nutrition, and childhood infections.',
    supportsQueue: true,
    queueNumber: '#P-03',
    patientsAhead: 1,
    waitingTime: '~10 mins'
  },

  // 2. Hospital & Clinic Providers
  {
    id: 'prov_hosp_1',
    serviceId: 'hospital',
    name: 'ABC Multi-Specialty Hospital',
    subtitle: 'JCI & NABH Accredited Super Specialty Center',
    rating: 4.9,
    reviewsCount: 420,
    location: 'Hitec City, Hyderabad',
    availability: '24/7 OPD & Emergency Services',
    feeOrPrice: '₹500 Registration Fee',
    priceValue: 500,
    specialtyOrType: 'Multi-Specialty',
    imageUrl: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=300&auto=format&fit=crop&q=80',
    badge: 'Premier Partner',
    about: 'A premier 500-bed super specialty hospital featuring state-of-the-art ICU facilities, advanced surgical suites, round-the-clock emergency care, and expert consultants.',
    supportsQueue: true,
    queueNumber: '#OPD-14',
    patientsAhead: 4,
    waitingTime: '~20 mins'
  },
  {
    id: 'prov_hosp_2',
    serviceId: 'hospital',
    name: 'Apollo Health City',
    subtitle: 'Super Specialty Cardiac & Oncology Center',
    rating: 4.8,
    reviewsCount: 650,
    location: 'Jubilee Hills, Hyderabad',
    availability: 'Open Today (08:00 AM - 09:00 PM)',
    feeOrPrice: '₹750 OPD Fee',
    priceValue: 750,
    specialtyOrType: 'Cardiology & Oncology',
    imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300&auto=format&fit=crop&q=80',
    about: 'Asia-Pacific medical landmark providing multi-organ transplant, robotic surgery, comprehensive cancer care, and heart failure clinics.',
    supportsQueue: true,
    queueNumber: '#OPD-09',
    patientsAhead: 2,
    waitingTime: '~12 mins'
  },

  // 3. Home Care Providers
  {
    id: 'prov_home_1',
    serviceId: 'homecare',
    name: 'Viziito Care@Home Services',
    subtitle: 'Certified ICU Nurses, Physiotherapists & Caregivers',
    rating: 4.8,
    reviewsCount: 142,
    location: 'Doorstep Service (All Hyderabad Regions)',
    availability: 'Slots Available Today',
    feeOrPrice: '₹600 / visit starting fee',
    priceValue: 600,
    specialtyOrType: 'Nursing & Physio',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=300&auto=format&fit=crop&q=80',
    badge: 'Instant Dispatch',
    about: 'Professional home healthcare service providing post-surgical recovery, elderly assistance, wound dressing, catheterization, and home physiotherapy.',
    supportsTracking: true,
    trackingStatus: 'Nurse En Route • Est. Arrival 25 mins'
  },
  {
    id: 'prov_home_2',
    serviceId: 'homecare',
    name: 'HealAtHome Nursing Network',
    subtitle: 'Full-day Elderly Care & Post-Op Recovery',
    rating: 4.7,
    reviewsCount: 88,
    location: 'Doorstep Service (Gachibowli & Madhapur)',
    availability: 'Next slot in 45 mins',
    feeOrPrice: '₹800 / visit',
    priceValue: 800,
    specialtyOrType: 'Elderly & Post-Op Care',
    imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=300&auto=format&fit=crop&q=80',
    about: 'Specialized home nursing care for senior citizens, stroke rehabilitation, cardiac monitoring, and tracheostomy care.',
    supportsTracking: true,
    trackingStatus: 'Caregiver Confirmed • Scheduled 04:00 PM'
  },

  // 4. Scheduled Ambulance Providers
  {
    id: 'prov_amb_1',
    serviceId: 'ambulance',
    name: 'Viziito Emergency Response Network',
    subtitle: 'Ventilator & ICU Equipped Ambulances (ALS/BLS)',
    rating: 4.9,
    reviewsCount: 289,
    location: 'GPS Live Dispatch Network (Avg ETA: 12 mins)',
    availability: 'Available 24/7 (Immediate)',
    feeOrPrice: '₹1,200 Base Fare',
    priceValue: 1200,
    specialtyOrType: 'ALS / ICU Ambulance',
    imageUrl: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?w=300&auto=format&fit=crop&q=80',
    badge: '24/7 Rapid Response',
    about: '24/7 emergency and non-emergency scheduled ambulance service staffed with paramedic teams, ventilator support, ECG, and oxygen cylinders.',
    supportsTracking: true,
    trackingStatus: 'Ambulance Unit #402 En Route • GPS Live (8 mins)'
  },
  {
    id: 'prov_amb_2',
    serviceId: 'ambulance',
    name: 'MedExpress Patient Transport',
    subtitle: 'Basic Life Support (BLS) & Wheelchair Vans',
    rating: 4.7,
    reviewsCount: 130,
    location: 'Inter-City & Local Transfers',
    availability: 'Available 24/7',
    feeOrPrice: '₹800 Base Fare',
    priceValue: 800,
    specialtyOrType: 'BLS Patient Transport',
    imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=300&auto=format&fit=crop&q=80',
    about: 'Reliable scheduled non-emergency transport for hospital discharges, dialysis trips, chemotherapy appointments, and diagnostic center visits.',
    supportsTracking: true,
    trackingStatus: 'Driver Assigned • Awaiting Pickup Time'
  },

  // 5. Pharmacy Providers
  {
    id: 'prov_pharm_1',
    serviceId: 'pharmacy',
    name: 'Viziito Express Pharmacy Store',
    subtitle: '100% Genuine Prescription Medicines with Invoice',
    rating: 4.8,
    reviewsCount: 512,
    location: 'Express Delivery (30 - 45 mins)',
    availability: 'Open 24 Hours',
    feeOrPrice: 'Free Delivery above ₹300',
    priceValue: 0,
    specialtyOrType: 'Retail & Generic Medicines',
    imageUrl: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=300&auto=format&fit=crop&q=80',
    about: 'Licensed retail pharmacy stocking 15,000+ prescription drugs, chronic disease medications, surgical supplies, and health supplements.',
    supportsTracking: true,
    trackingStatus: 'Order Packing • Out for Delivery soon'
  },
  {
    id: 'prov_pharm_2',
    serviceId: 'pharmacy',
    name: 'Apollo Pharmacy Express',
    subtitle: 'Pan-India Trusted Pharmacy Network',
    rating: 4.9,
    reviewsCount: 890,
    location: 'Doorstep Delivery in 60 mins',
    availability: 'Open 24 Hours',
    feeOrPrice: 'Flat ₹25 Delivery Charge',
    priceValue: 25,
    specialtyOrType: 'Prescription & Wellness',
    imageUrl: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=300&auto=format&fit=crop&q=80',
    about: 'India’s largest pharmacy chain delivering authentic medicines, wellness products, diabetic care kits, and personal care essentials.',
    supportsTracking: true,
    trackingStatus: 'Order Received • Pharmacist Verifying Rx'
  },

  // 6. Diagnostic Laboratory Providers
  {
    id: 'prov_diag_1',
    serviceId: 'diagnostic',
    name: 'Viziito PathCare Central Diagnostics',
    subtitle: 'NABL & ICMR Accredited Automated Laboratory',
    rating: 4.9,
    reviewsCount: 390,
    location: 'Free Home Collection or Center Visit',
    availability: 'Phlebotomist Available Today',
    feeOrPrice: '₹0 Home Collection Charge',
    priceValue: 0,
    specialtyOrType: 'Pathology & Health Packages',
    imageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=300&auto=format&fit=crop&q=80',
    badge: 'NABL Accredited',
    about: 'High-tech robotic pathology lab providing CBC, lipid profiles, thyroid panels, vitamin tests, and full body health packages with digital reports in 6 hours.',
    supportsQueue: true,
    queueNumber: '#LAB-05',
    patientsAhead: 2,
    waitingTime: '~10 mins'
  },
  {
    id: 'prov_diag_2',
    serviceId: 'diagnostic',
    name: 'Vijaya Diagnostic Center',
    subtitle: 'Advanced Imaging & Molecular Pathology',
    rating: 4.8,
    reviewsCount: 520,
    location: 'Centers across Hyderabad & Home Sample Visit',
    availability: 'Sample Collection 06:00 AM - 08:00 PM',
    feeOrPrice: '₹50 Collection Charge',
    priceValue: 50,
    specialtyOrType: 'Radiology & Biochemistry',
    imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=300&auto=format&fit=crop&q=80',
    about: 'Pioneer diagnostic center offering MRI, CT scans, ultrasound, 2D Echo, genetic screening, and routine blood chemistry profiles.',
    supportsQueue: true,
    queueNumber: '#LAB-11',
    patientsAhead: 4,
    waitingTime: '~18 mins'
  },

  // 7. Equipment Rental Providers
  {
    id: 'prov_equip_1',
    serviceId: 'equipment',
    name: 'Viziito MedEquip Rental Depot',
    subtitle: 'Sanitized Hospital Beds, Oxygen & Medical Devices',
    rating: 4.7,
    reviewsCount: 88,
    location: 'Doorstep Setup & Free Delivery',
    availability: 'Same-Day Delivery Available',
    feeOrPrice: 'Daily / Weekly / Monthly Rates',
    priceValue: 350,
    specialtyOrType: 'Medical Equipment',
    imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=300&auto=format&fit=crop&q=80',
    badge: 'Free Setup',
    about: 'Certified medical equipment rental service providing hospital beds, oxygen concentrators, BiPAP machines, wheelchairs, suction pumps, and patient monitors.',
    supportsTracking: true,
    trackingStatus: 'Equipment Sanitized • Delivery Van En Route'
  },
  {
    id: 'prov_equip_2',
    serviceId: 'equipment',
    name: 'MedRent Care Services',
    subtitle: 'ICU Setup at Home & Mobility Aids',
    rating: 4.8,
    reviewsCount: 114,
    location: 'Prompt 4-Hour Delivery',
    availability: 'Available 24/7',
    feeOrPrice: 'Flexi Rental Plans',
    priceValue: 400,
    specialtyOrType: 'ICU & Mobility Equipment',
    imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=300&auto=format&fit=crop&q=80',
    about: 'Comprehensive home ICU setup, electric wheelchairs, ventilator support equipment, and reclining hospital beds with technician installation.',
    supportsTracking: true,
    trackingStatus: 'Order Confirmed • Scheduled for Delivery'
  }
];

export interface HospitalDepartment {
  id: string;
  name: string;
  icon: string;
}

export const MOCK_HOSPITAL_DEPARTMENTS: HospitalDepartment[] = [
  { id: 'cardiology', name: 'Cardiology (Heart Care)', icon: 'Heart' },
  { id: 'orthopedics', name: 'Orthopedics (Bone & Joint)', icon: 'Activity' },
  { id: 'neurology', name: 'Neurology (Brain & Spine)', icon: 'Brain' },
  { id: 'pediatrics', name: 'Pediatrics (Child Care)', icon: 'Baby' },
  { id: 'dermatology', name: 'Dermatology (Skin)', icon: 'Sparkles' },
  { id: 'general', name: 'General OPD', icon: 'Stethoscope' },
];

export interface HomeCareServiceType {
  id: string;
  name: string;
  pricePerVisit: number;
}

export const MOCK_HOMECARE_TYPES: HomeCareServiceType[] = [
  { id: 'nursing', name: 'Certified Nursing Care (Wound / Injections / IV)', pricePerVisit: 600 },
  { id: 'physio', name: 'Home Physiotherapy Session', pricePerVisit: 800 },
  { id: 'elderly', name: 'Elderly Care Assistant (Full Day)', pricePerVisit: 1200 },
  { id: 'post_surgery', name: 'Post-Surgery Attendant Care', pricePerVisit: 1500 },
];

export interface MedicineItem {
  id: string;
  name: string;
  dosage: string;
  price: number;
  requiresPrescription: boolean;
  category?: string;
}

export const MOCK_MEDICINES_CATALOG: MedicineItem[] = [
  { id: 'med_1', name: 'Paracetamol 650mg (Dolo)', dosage: '10 Tablets Strip', price: 32, requiresPrescription: false, category: 'Fever & Pain' },
  { id: 'med_2', name: 'Amoxicillin & Potassium Clavulanate 625mg', dosage: '6 Tablets Strip', price: 175, requiresPrescription: true, category: 'Antibiotics' },
  { id: 'med_3', name: 'Pantoprazole 40mg (Gas Relief)', dosage: '15 Tablets Strip', price: 90, requiresPrescription: false, category: 'Gastro Care' },
  { id: 'med_4', name: 'Azithromycin 500mg', dosage: '5 Tablets Strip', price: 120, requiresPrescription: true, category: 'Antibiotics' },
  { id: 'med_5', name: 'Multivitamin with Mineral Capsules', dosage: '30 Capsules Bottle', price: 280, requiresPrescription: false, category: 'Vitamins & Supplements' },
  { id: 'med_6', name: 'Metformin 500mg SR (Glucophage)', dosage: '15 Tablets Strip', price: 45, requiresPrescription: true, category: 'Diabetes Care' },
];

export interface LabTestItem {
  id: string;
  name: string;
  turnaroundTime: string;
  price: number;
  fastingRequired: boolean;
  category?: string;
}

export const MOCK_LAB_TESTS_CATALOG: LabTestItem[] = [
  { id: 'test_1', name: 'Complete Blood Count (CBC) with ESR', turnaroundTime: 'Same Day (6 hrs)', price: 350, fastingRequired: false, category: 'Pathology' },
  { id: 'test_2', name: 'Full Body Lipid Profile (Cholesterol)', turnaroundTime: 'Same Day', price: 550, fastingRequired: true, category: 'Heart Health' },
  { id: 'test_3', name: 'Thyroid Profile (T3, T4, TSH)', turnaroundTime: '24 Hours', price: 450, fastingRequired: false, category: 'Hormones' },
  { id: 'test_4', name: 'Diabetes Screen (HbA1c + Fasting Sugar)', turnaroundTime: 'Same Day', price: 400, fastingRequired: true, category: 'Diabetes' },
  { id: 'test_5', name: 'Comprehensive Master Health Checkup Package', turnaroundTime: '24 Hours', price: 1499, fastingRequired: true, category: 'Full Body Package' },
];

export interface RentalEquipmentItem {
  id: string;
  name: string;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  deposit: number;
  category?: string;
}

export const MOCK_EQUIPMENT_CATALOG: RentalEquipmentItem[] = [
  { id: 'eq_1', name: 'Motorized Electric Hospital Bed with Mattress', dailyRate: 350, weeklyRate: 2100, monthlyRate: 6500, deposit: 2000, category: 'Beds & Support' },
  { id: 'eq_2', name: 'Medical Grade Oxygen Concentrator (10L)', dailyRate: 450, weeklyRate: 2800, monthlyRate: 8500, deposit: 3000, category: 'Respiratory' },
  { id: 'eq_3', name: 'Lightweight Foldable Wheelchair', dailyRate: 120, weeklyRate: 700, monthlyRate: 2200, deposit: 1000, category: 'Mobility' },
  { id: 'eq_4', name: 'BiPAP / CPAP Machine with Mask', dailyRate: 500, weeklyRate: 3200, monthlyRate: 9500, deposit: 4000, category: 'Respiratory' },
  { id: 'eq_5', name: 'Multi-Parameter Patient Vital Monitor', dailyRate: 250, weeklyRate: 1500, monthlyRate: 4800, deposit: 1500, category: 'Monitoring' },
];

export const MOCK_AVAILABLE_SLOTS = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:30 AM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
  '06:30 PM'
];
