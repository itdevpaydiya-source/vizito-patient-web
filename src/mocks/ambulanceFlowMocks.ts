export const MOCK_AMBULANCE_FLEET = [
  { id: 'AMB-101', type: 'Basic Life Support (BLS)', plate: 'MH-02-AB-1234', location: 'Andheri East', status: 'On Route', fuel: '85%' },
  { id: 'AMB-102', type: 'Advanced Life Support (ALS)', plate: 'MH-02-CD-5678', location: 'Bandra West', status: 'Available', fuel: '92%' },
  { id: 'AMB-103', type: 'ICU on Wheels', plate: 'MH-02-EF-9012', location: 'Juhu', status: 'Maintenance', fuel: '40%' },
  { id: 'AMB-104', type: 'Basic Life Support (BLS)', plate: 'MH-02-GH-3456', location: 'Borivali', status: 'Available', fuel: '100%' }
];

export const MOCK_AMBULANCE_DRIVERS = [
  { id: 'd_1', name: 'Rajesh Kumar', role: 'Paramedic / Driver', phone: '+91 9876543210', status: 'On Route', assignedVehicle: 'AMB-101' },
  { id: 'd_2', name: 'Suresh Singh', role: 'Driver', phone: '+91 9876543211', status: 'Available', assignedVehicle: 'AMB-102' },
  { id: 'd_3', name: 'Vikram Patel', role: 'Paramedic', phone: '+91 9876543212', status: 'Off Duty', assignedVehicle: 'None' },
  { id: 'd_4', name: 'Anil Desai', role: 'Driver', phone: '+91 9876543213', status: 'Available', assignedVehicle: 'AMB-104' }
];

export const MOCK_EMERGENCY_REQUESTS = [
  { id: 'emg_001', callerName: 'Priya Sharma', emergencyType: 'Cardiac Arrest', pickupLocation: 'Lokhandwala Complex', dropLocation: 'Nanavati Hospital', time: 'Just Now', status: 'Dispatching' },
  { id: 'emg_002', callerName: 'Hospital Transfer', emergencyType: 'Critical Care Transfer', pickupLocation: 'Hinduja Hospital', dropLocation: 'Lilavati Hospital', time: '10 mins ago', status: 'En Route' },
  { id: 'emg_003', callerName: 'Rahul Verma', emergencyType: 'Road Accident', pickupLocation: 'Western Express Hwy', dropLocation: 'Nearest Trauma Center', time: '2 mins ago', status: 'Pending' }
];
