export const MOCK_CLINICS = [
  { id: '1', name: 'Banjarahills Clinic', type: 'In-Clinic' },
  { id: '2', name: 'City Care Hospital', type: 'In-Clinic' },
  { id: '3', name: 'Dr. Arjun Virtual Clinic', type: 'Online Practice' },
];

export const MOCK_APPOINTMENTS = [
  { id: '1', time: '09:30 AM', patientName: 'Ramesh Kumar', type: 'In-Clinic', status: 'Confirmed', clinicId: '1', initials: 'RK' },
  { id: '2', time: '10:30 AM', patientName: 'Priya Sharma', type: 'Video Consultation', status: 'Upcoming', clinicId: '3', initials: 'PS' },
  { id: '3', time: '11:30 AM', patientName: 'Suresh Babu', type: 'In-Clinic', status: 'Pending', clinicId: '1', initials: 'SB' },
  { id: '4', time: '02:00 PM', patientName: 'Vikram Patel', type: 'In-Clinic', status: 'Completed', clinicId: '2', initials: 'VP' },
  { id: '5', time: '03:30 PM', patientName: 'Neha Singh', type: 'In-Clinic', status: 'Cancelled', clinicId: '2', initials: 'NS' },
  { id: '6', time: '05:00 PM', patientName: 'Anjali Mehta', type: 'Video Consultation', status: 'Consultation Started', clinicId: '3', initials: 'AM' },
];

export const MOCK_REVIEWS = [
  { id: '1', patientName: 'Neha Singh', rating: 5, comment: 'Very good experience. Doctor was very patient and explained everything clearly.', date: '2 May 2025', initials: 'NS', color: 'bg-pink-100 text-pink-700', clinicId: '2' },
  { id: '2', patientName: 'Vikram Patel', rating: 4.5, comment: 'Excellent consultation and proper guidance.', date: '1 May 2025', initials: 'VP', color: 'bg-blue-100 text-blue-700', clinicId: '2' },
  { id: '3', patientName: 'Sunita Verma', rating: 5, comment: 'Highly recommended!', date: '30 Apr 2025', initials: 'SV', color: 'bg-orange-100 text-orange-700', clinicId: '1' },
  { id: '4', patientName: 'Rahul Joshi', rating: 4, comment: 'Good experience.', date: '28 Apr 2025', initials: 'RJ', color: 'bg-green-100 text-green-700', clinicId: '3' },
];

export const MOCK_REVENUE_BY_CLINIC: Record<string, any> = {
  all: {
    totalRevenue: 124850,
    netEarnings: 108650,
    pendingSettlements: 16200,
    consultations: 156,
    trend: '+18.6%',
    chartData: [
      { label: '01 May', value: 40000 },
      { label: '08 May', value: 55000 },
      { label: '15 May', value: 48000 },
      { label: '22 May', value: 70000 },
      { label: '31 May', value: 124850 },
    ],
  },
  '1': {
    totalRevenue: 65400,
    netEarnings: 57200,
    pendingSettlements: 8200,
    consultations: 82,
    trend: '+12.4%',
    chartData: [
      { label: '01 May', value: 20000 },
      { label: '08 May', value: 30000 },
      { label: '15 May', value: 25000 },
      { label: '22 May', value: 40000 },
      { label: '31 May', value: 65400 },
    ],
  },
  '2': {
    totalRevenue: 38250,
    netEarnings: 33450,
    pendingSettlements: 4800,
    consultations: 48,
    trend: '+22.1%',
    chartData: [
      { label: '01 May', value: 10000 },
      { label: '08 May', value: 15000 },
      { label: '15 May', value: 12000 },
      { label: '22 May', value: 20000 },
      { label: '31 May', value: 38250 },
    ],
  },
  '3': {
    totalRevenue: 21200,
    netEarnings: 18000,
    pendingSettlements: 3200,
    consultations: 26,
    trend: '+8.3%',
    chartData: [
      { label: '01 May', value: 10000 },
      { label: '08 May', value: 10000 },
      { label: '15 May', value: 11000 },
      { label: '22 May', value: 10000 },
      { label: '31 May', value: 21200 },
    ],
  },
};

export const MOCK_PROFILE_COMPLETION = {
  percentage: 65,
  steps: [
    { name: 'Personal Information', completed: true },
    { name: 'Professional Information', completed: true },
    { name: 'Clinic Information', completed: true },
    { name: 'KYC Verification', completed: false },
    { name: 'Bank Details', completed: false },
    { name: 'Website Request', completed: false },
  ]
};

export const MOCK_UPCOMING_SCHEDULE_BY_CLINIC: Record<string, any[]> = {
  all: [
    { day: 'Mon', date: '26 May', isToday: true, appointments: 4, status: 'Partially Available' },
    { day: 'Tue', date: '27 May', isToday: false, appointments: 3, status: 'Fully Booked' },
    { day: 'Wed', date: '28 May', isToday: false, appointments: 5, status: 'Available' },
    { day: 'Thu', date: '29 May', isToday: false, appointments: 2, status: 'Blocked' },
    { day: 'Fri', date: '30 May', isToday: false, appointments: 6, status: 'Available' },
    { day: 'Sat', date: '31 May', isToday: false, appointments: 1, status: 'Leave' },
    { day: 'Sun', date: '01 Jun', isToday: false, appointments: 0, status: 'Blocked' },
  ],
  '1': [
    { day: 'Mon', date: '26 May', isToday: true, appointments: 2, status: 'Available' },
    { day: 'Tue', date: '27 May', isToday: false, appointments: 1, status: 'Partially Available' },
    { day: 'Wed', date: '28 May', isToday: false, appointments: 3, status: 'Available' },
    { day: 'Thu', date: '29 May', isToday: false, appointments: 1, status: 'Blocked' },
    { day: 'Fri', date: '30 May', isToday: false, appointments: 2, status: 'Available' },
    { day: 'Sat', date: '31 May', isToday: false, appointments: 0, status: 'Leave' },
    { day: 'Sun', date: '01 Jun', isToday: false, appointments: 0, status: 'Blocked' },
  ],
  '2': [
    { day: 'Mon', date: '26 May', isToday: true, appointments: 1, status: 'Partially Available' },
    { day: 'Tue', date: '27 May', isToday: false, appointments: 1, status: 'Fully Booked' },
    { day: 'Wed', date: '28 May', isToday: false, appointments: 1, status: 'Available' },
    { day: 'Thu', date: '29 May', isToday: false, appointments: 1, status: 'Partially Available' },
    { day: 'Fri', date: '30 May', isToday: false, appointments: 3, status: 'Available' },
    { day: 'Sat', date: '31 May', isToday: false, appointments: 1, status: 'Leave' },
    { day: 'Sun', date: '01 Jun', isToday: false, appointments: 0, status: 'Blocked' },
  ],
  '3': [
    { day: 'Mon', date: '26 May', isToday: true, appointments: 1, status: 'Available' },
    { day: 'Tue', date: '27 May', isToday: false, appointments: 1, status: 'Partially Available' },
    { day: 'Wed', date: '28 May', isToday: false, appointments: 1, status: 'Available' },
    { day: 'Thu', date: '29 May', isToday: false, appointments: 0, status: 'Blocked' },
    { day: 'Fri', date: '30 May', isToday: false, appointments: 1, status: 'Partially Available' },
    { day: 'Sat', date: '31 May', isToday: false, appointments: 0, status: 'Leave' },
    { day: 'Sun', date: '01 Jun', isToday: false, appointments: 0, status: 'Blocked' },
  ],
};

export const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'New Appointment Booked', desc: 'A new appointment is booked with Amit Verma on 31 May 2025 at 10:30 AM.', time: '5 min ago', unread: true },
  { id: 2, title: 'Appointment Cancelled', desc: 'You have an upcoming appointment with Priya Singh cancelled today.', time: '1 hour ago', unread: true },
  { id: 3, title: 'Payment Received', desc: 'Payment of ₹800 received for appointment with Ramesh Kumar.', time: '2 hours ago', unread: true },
  { id: 4, title: 'New Review Received', desc: 'Priya Singh left a 5-star review for your consultation.', time: '3 hours ago', unread: true },
  { id: 5, title: 'KYC Verified Successfully', desc: 'Your KYC profile verification is approved.', time: '5 hours ago', unread: false },
];
