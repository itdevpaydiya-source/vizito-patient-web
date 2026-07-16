export const MOCK_INVENTORY = [
  { id: 'inv_1', name: 'Paracetamol 500mg', category: 'Analgesic', stock: 1250, threshold: 500, price: 50, expiry: '2027-10-12' },
  { id: 'inv_2', name: 'Amoxicillin 250mg', category: 'Antibiotic', stock: 120, threshold: 200, price: 150, expiry: '2026-08-01' },
  { id: 'inv_3', name: 'Vitamin C Complex', category: 'Supplement', stock: 45, threshold: 100, price: 250, expiry: '2028-01-15' },
  { id: 'inv_4', name: 'Cough Syrup (100ml)', category: 'Syrup', stock: 350, threshold: 150, price: 85, expiry: '2027-05-20' }
];

export const MOCK_PRESCRIPTIONS = [
  { id: 'rx_8901', patientName: 'Meera Patel', doctorName: 'Dr. Sarah Jenkins', date: 'Today, 10:45 AM', status: 'Pending', items: 3 },
  { id: 'rx_8902', patientName: 'Rahul Kumar', doctorName: 'Dr. Amit Shah', date: 'Today, 09:15 AM', status: 'Processing', items: 1 },
  { id: 'rx_8899', patientName: 'Anita Sharma', doctorName: 'Dr. Vikram Singh', date: 'Yesterday', status: 'Ready for Pickup', items: 4 }
];
