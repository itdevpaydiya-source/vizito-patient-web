export const MOCK_LAB_TESTS = [
  { id: 'test_101', name: 'Complete Blood Count (CBC)', category: 'Pathology', price: 350, tat: '24 Hours', popular: true },
  { id: 'test_102', name: 'Lipid Profile', category: 'Pathology', price: 600, tat: '12 Hours', popular: true },
  { id: 'test_103', name: 'Thyroid Function Test', category: 'Endocrinology', price: 500, tat: '24 Hours', popular: false },
  { id: 'test_104', name: 'Chest X-Ray', category: 'Radiology', price: 800, tat: '2 Hours', popular: false }
];

export const MOCK_LAB_APPOINTMENTS = [
  { id: 'apt_55', patientName: 'Suresh Kumar', testName: 'Lipid Profile', type: 'Home Collection', time: 'Today, 08:00 AM', status: 'Assigned' },
  { id: 'apt_56', patientName: 'Priya Sharma', testName: 'Chest X-Ray', type: 'In-Lab', time: 'Today, 10:30 AM', status: 'Pending' },
  { id: 'apt_57', patientName: 'Amit Patel', testName: 'CBC + Thyroid', type: 'Home Collection', time: 'Tomorrow, 07:00 AM', status: 'Scheduled' }
];

export const MOCK_LAB_REPORTS = [
  { id: 'rep_12', patientName: 'Rahul Verma', testName: 'Liver Function Test', date: 'Yesterday', status: 'Pending Analysis' },
  { id: 'rep_13', patientName: 'Anita Desai', testName: 'HbA1c', date: 'Today', status: 'Ready for Download' }
];
