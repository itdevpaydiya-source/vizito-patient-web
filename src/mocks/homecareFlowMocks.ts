export const MOCK_CARE_SERVICES = [
  { id: 'srv_201', name: 'Post-Surgery Nursing', category: 'Nursing', price: 1200, duration: '12 Hours/Day', active: true },
  { id: 'srv_202', name: 'Physiotherapy Session', category: 'Therapy', price: 800, duration: '1 Hour', active: true },
  { id: 'srv_203', name: 'Elderly Assistance', category: 'Caregiving', price: 1000, duration: '12 Hours/Day', active: true },
  { id: 'srv_204', name: 'Wound Dressing', category: 'Nursing', price: 500, duration: 'Per Visit', active: false }
];

export const MOCK_CARE_STAFF = [
  { id: 'stf_1', name: 'Nurse Anjali', role: 'Registered Nurse', rating: 4.8, status: 'On Duty', assignedTo: 'Patient Ramesh (Post-Surgery)' },
  { id: 'stf_2', name: 'Karan Singh', role: 'Physiotherapist', rating: 4.9, status: 'Available', assignedTo: 'None' },
  { id: 'stf_3', name: 'Nurse Priya', role: 'Registered Nurse', rating: 4.7, status: 'Available', assignedTo: 'None' },
  { id: 'stf_4', name: 'Ravi Verma', role: 'Caregiver', rating: 4.5, status: 'On Duty', assignedTo: 'Patient Sunita (Elderly Care)' }
];

export const MOCK_CARE_BOOKINGS = [
  { id: 'bk_891', patientName: 'Sanjay Gupta', serviceName: 'Physiotherapy Session', date: 'Today, 04:00 PM', location: 'Andheri West', status: 'Pending Assignment' },
  { id: 'bk_892', patientName: 'Ramesh Shah', serviceName: 'Post-Surgery Nursing', date: 'Ongoing (Started Yesterday)', location: 'Bandra', status: 'Active' },
  { id: 'bk_893', patientName: 'Meena Reddy', serviceName: 'Wound Dressing', date: 'Tomorrow, 10:00 AM', location: 'Juhu', status: 'Pending Assignment' }
];
