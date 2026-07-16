export type ActionType = 'view' | 'create' | 'update' | 'delete' | 'export' | 'approve' | 'reject';

export interface DynamicMenu {
  id: string;
  name: string;
  icon: string;
  path: string;
  sort_order: number;
}

export interface DynamicWidget {
  id: string;
  component_key: string;
  title: string;
  config: {
    gridArea?: string; // e.g. "span 2" or "span 1"
    refreshInterval?: number;
  };
}

export interface DynamicPayload {
  role: {
    id: string;
    name: string;
  };
  menus: DynamicMenu[];
  permissions: Record<string, ActionType[]>; // Module name -> array of allowed actions
  widgets: DynamicWidget[];
}

// MOCK: Doctor Role Payload
export const doctorPayload: DynamicPayload = {
  role: { id: 'role_doctor', name: 'Doctor' },
  menus: [
    { id: 'm1', name: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', sort_order: 1 },
    { id: 'm2', name: 'Appointments', path: '/dashboard/appointments', icon: 'Calendar', sort_order: 2 },
    { id: 'm3', name: 'Patients', path: '/dashboard/patients', icon: 'Users', sort_order: 3 },
    { id: 'm4', name: 'Prescriptions', path: '/dashboard/prescriptions', icon: 'FileText', sort_order: 4 },
    { id: 'm5', name: 'Revenue', path: '/dashboard/revenue', icon: 'IndianRupee', sort_order: 5 },
  ],
  permissions: {
    'Appointments': ['view', 'create', 'update'], // Doctor cannot delete appointments
    'Patients': ['view', 'create', 'update'],
    'Prescriptions': ['view', 'create', 'update', 'delete'],
    'Revenue': ['view', 'export'],
  },
  widgets: [
    { id: 'w1', component_key: 'TodaysAppointments', title: "Today's Appointments", config: { gridArea: 'col-span-12 lg:col-span-8' } },
    { id: 'w2', component_key: 'RevenueSummary', title: 'Revenue Summary', config: { gridArea: 'col-span-12 lg:col-span-4' } },
    { id: 'w3', component_key: 'UpcomingAppointments', title: 'Upcoming Appointments', config: { gridArea: 'col-span-12 lg:col-span-6' } },
    { id: 'w4', component_key: 'Availability', title: 'My Availability', config: { gridArea: 'col-span-12 lg:col-span-6' } },
  ]
};

// MOCK: Hospital Admin Role Payload
export const hospitalAdminPayload: DynamicPayload = {
  role: { id: 'role_hospital', name: 'Hospital Admin' },
  menus: [
    { id: 'm1', name: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', sort_order: 1 },
    { id: 'm2', name: 'Departments', path: '/dashboard/departments', icon: 'Building2', sort_order: 2 },
    { id: 'm3', name: 'Doctors', path: '/dashboard/doctors', icon: 'Stethoscope', sort_order: 3 },
    { id: 'm4', name: 'Patients', path: '/dashboard/patients', icon: 'Users', sort_order: 4 },
    { id: 'm5', name: 'Beds', path: '/dashboard/beds', icon: 'Bed', sort_order: 5 },
    { id: 'm6', name: 'Billing', path: '/dashboard/billing', icon: 'Receipt', sort_order: 6 },
  ],
  permissions: {
    'Departments': ['view', 'create', 'update', 'delete'],
    'Doctors': ['view', 'create', 'update', 'delete'],
    'Patients': ['view', 'create', 'update'],
    'Beds': ['view', 'create', 'update'],
    'Billing': ['view', 'create', 'update', 'export'],
  },
  widgets: [
    { id: 'w1', component_key: 'BedOccupancy', title: 'Bed Occupancy Status', config: { gridArea: 'col-span-12 lg:col-span-8' } },
    { id: 'w2', component_key: 'HospitalRevenue', title: 'Revenue Overview', config: { gridArea: 'col-span-12 lg:col-span-4' } },
    { id: 'w3', component_key: 'DoctorsAvailable', title: 'Doctors Available Today', config: { gridArea: 'col-span-12 lg:col-span-6' } },
    { id: 'w4', component_key: 'PatientCount', title: 'Active Patients', config: { gridArea: 'col-span-12 lg:col-span-6' } },
  ]
};

// MOCK: Pharmacy Admin Role Payload
export const pharmacyPayload: DynamicPayload = {
  role: { id: 'role_pharmacy', name: 'Pharmacy Admin' },
  menus: [
    { id: 'm1', name: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', sort_order: 1 },
    { id: 'm2', name: 'Inventory', path: '/dashboard/inventory', icon: 'Package', sort_order: 2 },
    { id: 'm3', name: 'Orders', path: '/dashboard/orders', icon: 'ShoppingCart', sort_order: 3 },
    { id: 'm4', name: 'Revenue', path: '/dashboard/revenue', icon: 'IndianRupee', sort_order: 4 },
  ],
  permissions: {
    'Inventory': ['view', 'create', 'update', 'delete'],
    'Orders': ['view', 'update', 'export'], // Cannot create/delete orders manually (driven by patients)
    'Revenue': ['view', 'export'],
  },
  widgets: [
    { id: 'w1', component_key: 'InventoryStatus', title: 'Inventory Overview', config: { gridArea: 'col-span-12 lg:col-span-6' } },
    { id: 'w2', component_key: 'LowStockAlerts', title: 'Low Stock Alerts', config: { gridArea: 'col-span-12 lg:col-span-6' } },
    { id: 'w3', component_key: 'OrdersToday', title: 'Orders Today', config: { gridArea: 'col-span-12 lg:col-span-8' } },
    { id: 'w4', component_key: 'PharmacyRevenue', title: 'Revenue', config: { gridArea: 'col-span-12 lg:col-span-4' } },
  ]
};

// MOCK: Super Admin Role Payload
export const superAdminPayload: DynamicPayload = {
  role: { id: 'role_superadmin', name: 'Super Admin' },
  menus: [
    { id: 'm1', name: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', sort_order: 1 },
    { id: 'm2', name: 'Roles', path: '/dashboard/roles', icon: 'Shield', sort_order: 2 },
    { id: 'm3', name: 'Permissions', path: '/dashboard/permissions', icon: 'Key', sort_order: 3 },
    { id: 'm4', name: 'Users', path: '/dashboard/users', icon: 'Users', sort_order: 4 },
    { id: 'm5', name: 'Organizations', path: '/dashboard/organizations', icon: 'Building', sort_order: 5 },
  ],
  permissions: {
    'Roles': ['view', 'create', 'update', 'delete'],
    'Permissions': ['view', 'create', 'update', 'delete'],
    'Users': ['view', 'create', 'update', 'delete'],
    'Organizations': ['view', 'create', 'update', 'delete', 'approve', 'reject'],
  },
  widgets: [
    { id: 'w1', component_key: 'PlatformStats', title: 'Platform Statistics', config: { gridArea: 'col-span-12 lg:col-span-8' } },
    { id: 'w2', component_key: 'NewRegistrations', title: 'Recent Registrations', config: { gridArea: 'col-span-12 lg:col-span-4' } },
  ]
};
