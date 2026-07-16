export const MOCK_BEDS = {
  total: 500,
  occupied: 412,
  available: 88,
  breakdown: [
    { type: 'General Ward', total: 300, occupied: 250, available: 50 },
    { type: 'ICU', total: 50, occupied: 45, available: 5 },
    { type: 'Maternity', total: 100, occupied: 82, available: 18 },
    { type: 'Pediatrics', total: 50, occupied: 35, available: 15 }
  ]
};

export const MOCK_EMERGENCIES = [
  { id: 'em_1', type: 'Ambulance ETA', details: 'Cardiac Arrest, ETA 5 mins', severity: 'Critical', time: 'Just Now' },
  { id: 'em_2', type: 'Trauma Case', details: 'Road Accident, Multiple Fractures', severity: 'High', time: '10 mins ago' },
  { id: 'em_3', type: 'Walk-in ER', details: 'Severe Allergic Reaction', severity: 'Medium', time: '25 mins ago' }
];

export const MOCK_DEPARTMENTS = [
  { id: 'dept_1', name: 'Cardiology', head: 'Dr. Sarah Jenkins', doctors: 12, patientsAdmitted: 45 },
  { id: 'dept_2', name: 'Neurology', head: 'Dr. Amit Shah', doctors: 8, patientsAdmitted: 22 },
  { id: 'dept_3', name: 'Orthopedics', head: 'Dr. Emily Chen', doctors: 15, patientsAdmitted: 60 },
  { id: 'dept_4', name: 'Pediatrics', head: 'Dr. Anita Desai', doctors: 10, patientsAdmitted: 35 }
];
