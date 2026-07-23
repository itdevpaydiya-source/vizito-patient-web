import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  ChevronRight,
  Sparkles,
  Users,
  CreditCard,
  RotateCcw,
  Navigation,
  FileText,
  Stethoscope,
  Building2,
  Home,
  Truck,
  Pill,
  Microscope,
  Accessibility,
  ArrowRight,
  ShieldCheck,
  Star
} from 'lucide-react';
import { useLanguage } from '../../../store/language/LanguageContext';

export interface PatientBookingItem {
  id: string;
  serviceType: string;
  serviceCategory: 'doctor' | 'hospital' | 'homecare' | 'ambulance' | 'pharmacy' | 'diagnostic' | 'equipment';
  emoji: string;
  providerName: string;
  providerSubtitle?: string;
  location: string;
  patientName: string;
  patientRelationship?: string;
  bookingDate: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'Waiting' | 'In Progress' | 'En Route' | 'Preparing' | 'Confirmed' | 'Scheduled' | 'Completed' | 'Cancelled';
  tabCategory: 'active' | 'upcoming' | 'completed' | 'cancelled';
  paymentStatus: 'Paid' | 'Pending' | 'Refunded';
  totalAmount: number;
  cancellationReason?: string;

  // Service Specific Information
  consultationType?: 'Video' | 'In Person';
  department?: string;
  doctorName?: string;
  homeCareServiceType?: string;
  visitAddress?: string;
  pickupAddress?: string;
  destinationAddress?: string;
  vehicleType?: string;
  orderedMedicines?: string[];
  prescriptionAttached?: boolean;
  selectedTests?: string[];
  collectionType?: 'Home Collection' | 'Lab Visit';
  selectedEquipment?: string[];
  rentalDuration?: 'Daily' | 'Weekly' | 'Monthly';

  // Queue info (Doctor, Hospital, Lab)
  supportsQueue?: boolean;
  queueNumber?: string;
  currentQueueNumber?: string;
  patientsAhead?: number;
  estimatedWaitMinutes?: number;

  // Tracking info (Home Care, Ambulance, Pharmacy, Equipment)
  supportsTracking?: boolean;
  trackingStatus?: string;
  estimatedArrivalMinutes?: number;
  lastUpdatedTime?: string;
}

export const INITIAL_MOCK_BOOKINGS: PatientBookingItem[] = [
  // 1. Active Bookings
  {
    id: 'BK000245',
    serviceType: 'Doctor Consultation',
    serviceCategory: 'doctor',
    emoji: '🩺',
    providerName: 'Dr. Rahul Sharma',
    providerSubtitle: 'MBBS, MD - General Medicine',
    location: 'Max Healthcare, Banjara Hills',
    patientName: 'Ravi Kumar',
    patientRelationship: 'Self',
    bookingDate: '20 July 2026',
    appointmentDate: '20 July 2026',
    appointmentTime: '10:30 AM',
    status: 'Waiting',
    tabCategory: 'active',
    paymentStatus: 'Paid',
    totalAmount: 500,
    consultationType: 'Video',
    supportsQueue: true,
    queueNumber: '#15',
    currentQueueNumber: '#12',
    patientsAhead: 3,
    estimatedWaitMinutes: 20
  },
  {
    id: 'BK000247',
    serviceType: 'Home Care Services',
    serviceCategory: 'homecare',
    emoji: '🏠',
    providerName: 'Viziito Care@Home Staffing',
    providerSubtitle: 'Certified ICU Nursing Visit',
    location: 'H.No 4-12, Madhapur, Hyderabad',
    patientName: 'Ramesh Kumar',
    patientRelationship: 'Father',
    bookingDate: '20 July 2026',
    appointmentDate: '20 July 2026',
    appointmentTime: '02:00 PM',
    status: 'In Progress',
    tabCategory: 'active',
    paymentStatus: 'Paid',
    totalAmount: 600,
    homeCareServiceType: 'Certified Nursing Care (Wound / IV)',
    visitAddress: 'H.No 4-12, Madhapur, Hyderabad',
    supportsTracking: true,
    trackingStatus: 'Caregiver En Route to Patient Address',
    estimatedArrivalMinutes: 10,
    lastUpdatedTime: '10:15 AM'
  },
  {
    id: 'BK000249',
    serviceType: 'Pharmacy Order',
    serviceCategory: 'pharmacy',
    emoji: '💊',
    providerName: 'Viziito Express Pharmacy Store',
    providerSubtitle: 'Order #ORD-8821',
    location: 'Doorstep Delivery (Madhapur)',
    patientName: 'Ravi Kumar',
    patientRelationship: 'Self',
    bookingDate: '20 July 2026',
    appointmentDate: '20 July 2026',
    appointmentTime: 'Immediate Delivery',
    status: 'Preparing',
    tabCategory: 'active',
    paymentStatus: 'Paid',
    totalAmount: 450,
    orderedMedicines: ['Paracetamol 650mg (10 tabs)', 'Amoxicillin 625mg (6 tabs)'],
    prescriptionAttached: true,
    supportsTracking: true,
    trackingStatus: 'Pharmacist Packing Medicines & Invoice',
    estimatedArrivalMinutes: 25,
    lastUpdatedTime: '10:20 AM'
  },

  // 2. Upcoming Bookings
  {
    id: 'BK000246',
    serviceType: 'Hospital & Clinic',
    serviceCategory: 'hospital',
    emoji: '🏥',
    providerName: 'ABC Multi-Specialty Hospital',
    providerSubtitle: 'Cardiology Department OPD',
    location: 'Hitec City, Hyderabad',
    patientName: 'Ravi Kumar',
    patientRelationship: 'Self',
    bookingDate: '20 July 2026',
    appointmentDate: '21 July 2026',
    appointmentTime: '11:00 AM',
    status: 'Confirmed',
    tabCategory: 'upcoming',
    paymentStatus: 'Paid',
    totalAmount: 750,
    department: 'Cardiology (Heart Care)',
    doctorName: 'Dr. Sarah Jenkins',
    consultationType: 'In Person',
    supportsQueue: true,
    queueNumber: '#OPD-07',
    currentQueueNumber: '#OPD-04',
    patientsAhead: 3,
    estimatedWaitMinutes: 15
  },
  {
    id: 'BK000248',
    serviceType: 'Scheduled Ambulance',
    serviceCategory: 'ambulance',
    emoji: '🚑',
    providerName: 'Viziito Emergency Response Network',
    providerSubtitle: 'Advanced Life Support (ALS) Ambulance',
    location: 'Pickup: Jubilee Hills ➔ Destination: Apollo Hospital',
    patientName: 'Ramesh Kumar',
    patientRelationship: 'Father',
    bookingDate: '20 July 2026',
    appointmentDate: '21 July 2026',
    appointmentTime: '04:00 PM',
    status: 'Scheduled',
    tabCategory: 'upcoming',
    paymentStatus: 'Paid',
    totalAmount: 1200,
    pickupAddress: 'Plot 45, Jubilee Hills, Road No 36',
    destinationAddress: 'Apollo Hospitals Emergency Ward',
    vehicleType: 'Advanced Life Support (ALS ICU Ambulance)',
    supportsTracking: true,
    trackingStatus: 'Driver & Paramedic Unit Assigned',
    estimatedArrivalMinutes: 15,
    lastUpdatedTime: '09:45 AM'
  },
  {
    id: 'BK000250',
    serviceType: 'Diagnostic Laboratory',
    serviceCategory: 'diagnostic',
    emoji: '🧪',
    providerName: 'Viziito PathCare Central Diagnostics',
    providerSubtitle: 'Home Blood Sample Collection',
    location: 'Home Collection Visit',
    patientName: 'Sunita Kumar',
    patientRelationship: 'Mother',
    bookingDate: '20 July 2026',
    appointmentDate: '22 July 2026',
    appointmentTime: '07:30 AM',
    status: 'Scheduled',
    tabCategory: 'upcoming',
    paymentStatus: 'Paid',
    totalAmount: 950,
    selectedTests: ['Complete Blood Count (CBC)', 'Lipid Profile (Cholesterol)', 'Thyroid T3 T4 TSH'],
    collectionType: 'Home Collection',
    supportsQueue: true,
    queueNumber: '#LAB-05',
    currentQueueNumber: '#LAB-02',
    patientsAhead: 3,
    estimatedWaitMinutes: 10
  },
  {
    id: 'BK000251',
    serviceType: 'Medical Equipment Rental',
    serviceCategory: 'equipment',
    emoji: '🦽',
    providerName: 'Viziito MedEquip Rental Depot',
    providerSubtitle: 'Hospital Bed & Oxygen Concentrator',
    location: 'Flat 302, Gachibowli, Hyderabad',
    patientName: 'Ramesh Kumar',
    patientRelationship: 'Father',
    bookingDate: '20 July 2026',
    appointmentDate: '24 July 2026',
    appointmentTime: '10:00 AM Delivery',
    status: 'Confirmed',
    tabCategory: 'upcoming',
    paymentStatus: 'Paid',
    totalAmount: 6500,
    selectedEquipment: ['Motorized Hospital Bed', '10L Oxygen Concentrator'],
    rentalDuration: 'Monthly',
    visitAddress: 'Flat 302, Gachibowli, Hyderabad',
    supportsTracking: true,
    trackingStatus: 'Equipment Sanitized & Packed in Depot'
  },

  // 3. Completed Bookings
  {
    id: 'BK000198',
    serviceType: 'Doctor Consultation',
    serviceCategory: 'doctor',
    emoji: '🩺',
    providerName: 'Dr. Anita Desai',
    providerSubtitle: 'Pediatric Specialist',
    location: 'Rainbow Children Hospital',
    patientName: 'Ananya Kumar',
    patientRelationship: 'Daughter',
    bookingDate: '14 July 2026',
    appointmentDate: '15 July 2026',
    appointmentTime: '11:30 AM',
    status: 'Completed',
    tabCategory: 'completed',
    paymentStatus: 'Paid',
    totalAmount: 700,
    consultationType: 'Video'
  },
  {
    id: 'BK000199',
    serviceType: 'Pharmacy Order',
    serviceCategory: 'pharmacy',
    emoji: '💊',
    providerName: 'Apollo Pharmacy Express',
    providerSubtitle: 'Prescription Prescription Fulfilled',
    location: 'Home Delivery',
    patientName: 'Ramesh Kumar',
    patientRelationship: 'Father',
    bookingDate: '12 July 2026',
    appointmentDate: '12 July 2026',
    appointmentTime: '01:15 PM',
    status: 'Completed',
    tabCategory: 'completed',
    paymentStatus: 'Paid',
    totalAmount: 1250,
    orderedMedicines: ['Metformin 500mg (30 tabs)', 'Pantoprazole 40mg (15 tabs)']
  },

  // 4. Cancelled Bookings
  {
    id: 'BK000180',
    serviceType: 'Hospital & Clinic',
    serviceCategory: 'hospital',
    emoji: '🏥',
    providerName: 'Apollo Health City',
    providerSubtitle: 'General OPD Consultation',
    location: 'Jubilee Hills, Hyderabad',
    patientName: 'Ravi Kumar',
    patientRelationship: 'Self',
    bookingDate: '09 July 2026',
    appointmentDate: '10 July 2026',
    appointmentTime: '03:00 PM',
    status: 'Cancelled',
    tabCategory: 'cancelled',
    paymentStatus: 'Refunded',
    totalAmount: 750,
    cancellationReason: 'Change of plans'
  }
];

export default function MyConsultationsScreen() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // State
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed' | 'cancelled'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [bookings, setBookings] = useState<PatientBookingItem[]>([]);

  // Modals state
  const [selectedBooking, setSelectedBooking] = useState<PatientBookingItem | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<PatientBookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState('Change of plans');
  const [rebookModalBooking, setRebookModalBooking] = useState<PatientBookingItem | null>(null);
  const [reviewModalBooking, setReviewModalBooking] = useState<PatientBookingItem | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load bookings from localStorage combined with INITIAL_MOCK_BOOKINGS
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vizito_patient_bookings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge custom created bookings with mock list
          setBookings([...parsed, ...INITIAL_MOCK_BOOKINGS]);
          return;
        }
      }
      setBookings(INITIAL_MOCK_BOOKINGS);
    } catch (err) {
      console.error('Failed to parse patient bookings', err);
      setBookings(INITIAL_MOCK_BOOKINGS);
    }
  }, []);

  // Show temporary toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter bookings by tab & search query
  const filteredBookings = bookings.filter((b) => {
    const matchesTab = b.tabCategory === activeTab;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      b.id.toLowerCase().includes(searchLower) ||
      b.providerName.toLowerCase().includes(searchLower) ||
      b.serviceType.toLowerCase().includes(searchLower) ||
      b.patientName.toLowerCase().includes(searchLower);

    return matchesTab && matchesSearch;
  });

  // Tab Counts
  const counts = {
    active: bookings.filter((b) => b.tabCategory === 'active').length,
    upcoming: bookings.filter((b) => b.tabCategory === 'upcoming').length,
    completed: bookings.filter((b) => b.tabCategory === 'completed').length,
    cancelled: bookings.filter((b) => b.tabCategory === 'cancelled').length
  };

  // Status Badge Helper
  const getStatusBadge = (status: PatientBookingItem['status']) => {
    switch (status) {
      case 'Waiting':
      case 'In Progress':
      case 'Preparing':
      case 'En Route':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Confirmed':
      case 'Scheduled':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Cancellation Execution
  const handleConfirmCancel = () => {
    if (!cancelModalBooking) return;

    const updated = bookings.map((b) => {
      if (b.id === cancelModalBooking.id) {
        return {
          ...b,
          status: 'Cancelled' as const,
          tabCategory: 'cancelled' as const,
          paymentStatus: 'Refunded' as const,
          cancellationReason: cancelReason
        };
      }
      return b;
    });

    setBookings(updated);
    try {
      localStorage.setItem('vizito_patient_bookings', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setCancelModalBooking(null);
    if (selectedBooking?.id === cancelModalBooking.id) {
      setSelectedBooking(null);
    }
    showToast(`Booking ${cancelModalBooking.id} Cancelled Successfully`);
  };

  // Rebooking Handler
  const handleConfirmRebook = (booking: PatientBookingItem) => {
    setRebookModalBooking(null);
    setSelectedBooking(null);
    navigate(`/booking?service=${booking.serviceCategory}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Bookings</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Manage your healthcare bookings, view status timelines, track dispatches, and access service details.
          </p>
        </div>

        <button
          onClick={() => navigate('/healthcare-services')}
          className="self-start sm:self-auto flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-98"
        >
          <Sparkles className="w-4 h-4" /> Book New Service
        </button>
      </div>

      {/* Top Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search bookings by Booking ID, Provider Name, or Service Name..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-xs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto modal-scrollbar">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'active'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Active</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'active' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {counts.active}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'upcoming'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Upcoming</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'upcoming' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {counts.upcoming}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'completed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Completed</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'completed' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {counts.completed}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'cancelled'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Cancelled</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'cancelled' ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {counts.cancelled}
          </span>
        </button>
      </div>

      {/* Booking Cards Grid */}
      {filteredBookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              onClick={() => setSelectedBooking(booking)}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-xl transition-all duration-300 cursor-pointer group relative"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {booking.id}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${getStatusBadge(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                    {booking.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider block">
                      {booking.serviceType}
                    </span>
                    <h3 className="font-extrabold text-slate-800 text-base truncate group-hover:text-teal-700 transition-colors">
                      {booking.providerName}
                    </h3>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 font-medium bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold">Patient:</span>
                    <span className="font-bold text-slate-800">
                      {booking.patientName} {booking.patientRelationship && `(${booking.patientRelationship})`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold">Appointment:</span>
                    <span className="font-bold text-slate-800">
                      {booking.appointmentDate} • {booking.appointmentTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Amount</span>
                  <p className="font-black text-slate-800 text-sm">₹{booking.totalAmount}</p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBooking(booking);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 group-hover:bg-teal-600 text-slate-700 group-hover:text-white font-bold text-xs transition-colors flex items-center gap-1"
                >
                  View Details &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 py-16 px-4 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 text-2xl">
            {activeTab === 'active' && '⏳'}
            {activeTab === 'upcoming' && '📅'}
            {activeTab === 'completed' && '✅'}
            {activeTab === 'cancelled' && '🚫'}
          </div>

          <h3 className="font-extrabold text-slate-800 text-base">
            {searchTerm ? 'No bookings found.' : (
              activeTab === 'active' ? 'No active bookings found.' :
              activeTab === 'upcoming' ? 'No upcoming bookings.' :
              activeTab === 'completed' ? 'No completed bookings.' : 'No cancelled bookings.'
            )}
          </h3>

          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            {searchTerm ? 'Try searching for another booking ID, provider, or service name.' :
             activeTab === 'active' ? 'Book your first healthcare service to start managing your active care.' :
             'All your past and scheduled bookings will be listed here.'}
          </p>

          {!searchTerm && activeTab === 'active' && (
            <button
              onClick={() => navigate('/healthcare-services')}
              className="mt-2 inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md"
            >
              Book Service Now
            </button>
          )}
        </div>
      )}

      {/* Booking Details Drawer / Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-scrollbar shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 p-6 space-y-6">
            
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-2xl">
                  {selectedBooking.emoji}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {selectedBooking.id}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusBadge(selectedBooking.status)}`}>
                      {selectedBooking.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-800 mt-1">{selectedBooking.serviceType}</h2>
                </div>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reusable Section Layout */}
            <div className="space-y-5 text-xs">
              
              {/* 1. Booking Summary */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Booking Summary</h4>
                <div className="grid grid-cols-2 gap-3 font-medium">
                  <div>
                    <span className="text-slate-400 block">Booking Reference</span>
                    <span className="font-bold text-slate-800">{selectedBooking.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Booking Date</span>
                    <span className="font-bold text-slate-800">{selectedBooking.bookingDate}</span>
                  </div>
                </div>
              </div>

              {/* 2. Provider Information */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Provider Information</h4>
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-800 text-sm">{selectedBooking.providerName}</p>
                  {selectedBooking.providerSubtitle && (
                    <p className="text-slate-500 font-semibold">{selectedBooking.providerSubtitle}</p>
                  )}
                  <p className="text-slate-600 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {selectedBooking.location}
                  </p>
                </div>
              </div>

              {/* 3. Patient Information */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Patient Information</h4>
                <div className="flex items-center justify-between font-semibold">
                  <div>
                    <span className="text-slate-400 block">Patient Name</span>
                    <span className="font-extrabold text-slate-800 text-sm">{selectedBooking.patientName}</span>
                  </div>
                  {selectedBooking.patientRelationship && (
                    <div className="text-right">
                      <span className="text-slate-400 block">Family Member</span>
                      <span className="font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                        {selectedBooking.patientRelationship}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Service Specific Information */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Service Information</h4>

                {selectedBooking.serviceCategory === 'doctor' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block">Consultation Type</span>
                      <span className="font-bold text-slate-800">{selectedBooking.consultationType || 'Video'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Appointment Slot</span>
                      <span className="font-bold text-slate-800">{selectedBooking.appointmentDate} at {selectedBooking.appointmentTime}</span>
                    </div>
                  </div>
                )}

                {selectedBooking.serviceCategory === 'hospital' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 block">Department</span>
                        <span className="font-bold text-slate-800">{selectedBooking.department || 'General OPD'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Consultant Doctor</span>
                        <span className="font-bold text-slate-800">{selectedBooking.doctorName || selectedBooking.providerName}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedBooking.serviceCategory === 'homecare' && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block">Service Requested</span>
                      <span className="font-bold text-slate-800">{selectedBooking.homeCareServiceType || 'Nursing Visit'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Visit Address</span>
                      <span className="font-bold text-slate-800">{selectedBooking.visitAddress || selectedBooking.location}</span>
                    </div>
                  </div>
                )}

                {selectedBooking.serviceCategory === 'ambulance' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 block">Pickup Address</span>
                        <span className="font-bold text-slate-800">{selectedBooking.pickupAddress || 'User Address'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Destination</span>
                        <span className="font-bold text-slate-800">{selectedBooking.destinationAddress || 'Hospital'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Vehicle Type</span>
                      <span className="font-bold text-rose-700">{selectedBooking.vehicleType || 'Advanced Life Support (ALS ICU)'}</span>
                    </div>
                  </div>
                )}

                {selectedBooking.serviceCategory === 'pharmacy' && (
                  <div className="space-y-2">
                    <span className="text-slate-400 block">Ordered Medicines</span>
                    <div className="space-y-1">
                      {(selectedBooking.orderedMedicines || ['Prescribed Medicines']).map((med, idx) => (
                        <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 font-bold text-slate-800">
                          {med}
                        </div>
                      ))}
                    </div>
                    {selectedBooking.prescriptionAttached && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" /> Doctor Prescription Uploaded
                      </span>
                    )}
                  </div>
                )}

                {selectedBooking.serviceCategory === 'diagnostic' && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block">Collection Type</span>
                      <span className="font-bold text-slate-800">{selectedBooking.collectionType || 'Home Collection'}</span>
                    </div>
                    <span className="text-slate-400 block">Selected Tests</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedBooking.selectedTests || ['Complete Blood Count (CBC)']).map((tst, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 font-bold text-slate-700 rounded-lg">
                          {tst}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBooking.serviceCategory === 'equipment' && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block">Rental Duration</span>
                      <span className="font-bold text-slate-800">{selectedBooking.rentalDuration || 'Monthly'}</span>
                    </div>
                    <span className="text-slate-400 block">Rented Equipment List</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedBooking.selectedEquipment || ['Motorized Hospital Bed']).map((eq, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 font-bold text-slate-700 rounded-lg">
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Payment Information */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between font-bold">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Payment Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs ${
                    selectedBooking.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedBooking.paymentStatus}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase block">Total Amount</span>
                  <span className="text-base font-black text-slate-900">₹{selectedBooking.totalAmount}</span>
                </div>
              </div>

              {/* 6. Booking Timeline */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                <h4 className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Booking Timeline</h4>
                <div className="space-y-2 pl-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Booking Confirmed</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Provider Assigned</span>
                  </div>
                  <div className={`flex items-center gap-2 font-bold ${
                    selectedBooking.status === 'Completed' ? 'text-emerald-700' : 'text-amber-600'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-amber-500 ml-1 mr-1 animate-pulse" />
                    <span>{selectedBooking.status === 'Completed' ? 'Service Finished' : 'Service In Progress / Waiting'}</span>
                  </div>
                </div>
              </div>

              {/* 7. Queue Information Card (Doctor, Hospital, Lab) */}
              {selectedBooking.supportsQueue && (
                <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-violet-900">Queue Information</span>
                    <span className="text-[10px] font-extrabold bg-violet-600 text-white px-2.5 py-0.5 rounded-full">
                      Token {selectedBooking.queueNumber || '#15'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold pt-1">
                    <div className="bg-white p-2 rounded-xl border border-violet-100">
                      <span className="text-[10px] text-violet-400 block">Current Queue</span>
                      <span className="text-violet-900 text-sm font-black">{selectedBooking.currentQueueNumber || '#12'}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-violet-100">
                      <span className="text-[10px] text-violet-400 block">Patients Ahead</span>
                      <span className="text-violet-900 text-sm font-black">{selectedBooking.patientsAhead || 3}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-violet-100">
                      <span className="text-[10px] text-violet-400 block">Est. Wait</span>
                      <span className="text-violet-900 text-sm font-black">{selectedBooking.estimatedWaitMinutes || 20} Mins</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 8. Live Tracking Card (Home Care, Ambulance, Pharmacy, Equipment) */}
              {selectedBooking.supportsTracking && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                      <Navigation className="w-4 h-4 text-emerald-600 animate-pulse" /> Live Status Tracking
                    </span>
                    <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full uppercase">
                      GPS Active
                    </span>
                  </div>
                  <p className="text-xs font-bold text-emerald-800">{selectedBooking.trackingStatus}</p>
                  <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold pt-1">
                    <span>Est. Arrival: {selectedBooking.estimatedArrivalMinutes || 10} Minutes</span>
                    <span>Updated: {selectedBooking.lastUpdatedTime || '10:15 AM'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {/* Rate & Review Action for Completed Bookings */}
                {selectedBooking.tabCategory === 'completed' && (
                  <button
                    type="button"
                    onClick={() => {
                      setReviewModalBooking(selectedBooking);
                      setReviewRating(5);
                      setReviewComment('');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition-colors flex items-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Rate & Review
                  </button>
                )}

                {/* Cancel Booking Action */}
                {selectedBooking.tabCategory !== 'completed' && selectedBooking.tabCategory !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => setCancelModalBooking(selectedBooking)}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors"
                  >
                    Cancel Booking
                  </button>
                )}

                {/* Rebook Action */}
                <button
                  type="button"
                  onClick={() => setRebookModalBooking(selectedBooking)}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all active:scale-98 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Rebook
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Rate & Review Dialog Modal */}
      {reviewModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-extrabold text-xl">
                  ★
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Rate & Review Service</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {reviewModalBooking.providerName} • {reviewModalBooking.serviceType}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewModalBooking(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 pt-2">
              <div className="text-center space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600 block">How was your healthcare experience?</span>
                <div className="flex items-center justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-amber-500 hover:scale-125 transition-transform"
                    >
                      <Star className={`w-7 h-7 ${star <= reviewRating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-extrabold text-amber-700 block mt-1">
                  {reviewRating === 5 ? 'Excellent 🌟' : reviewRating === 4 ? 'Very Good 👍' : reviewRating === 3 ? 'Average 😐' : 'Poor 👎'}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Your Written Review (Optional)</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details about doctor punctuality, staff behavior, treatment quality..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[90px]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewModalBooking(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setReviewModalBooking(null);
                  showToast(`Thank you! Your rating & review for ${reviewModalBooking.providerName} has been submitted.`);
                }}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-98"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Dialog Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-5 h-5 text-rose-600" /> Cancel Booking
              </h3>
              <button onClick={() => setCancelModalBooking(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-semibold">
              Are you sure you want to cancel this booking?
            </p>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-500">
                <span>Booking ID:</span>
                <span className="font-mono text-slate-800">{cancelModalBooking.id}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-500">
                <span>Service:</span>
                <span className="text-slate-800">{cancelModalBooking.serviceType}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Cancellation (Optional)</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
              >
                <option value="Change of plans">Change of plans</option>
                <option value="Booked by mistake">Booked by mistake</option>
                <option value="Provider unavailable">Provider unavailable</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rebooking Confirmation Dialog */}
      {rebookModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 text-teal-700">
                <RotateCcw className="w-5 h-5 text-teal-600" /> Rebook Healthcare Service
              </h3>
              <button onClick={() => setRebookModalBooking(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Start a new booking pre-populated with details from your previous booking:
            </p>

            <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100 text-xs space-y-2 font-semibold text-slate-700">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Provider</span>
                <span className="font-extrabold text-slate-800 text-sm">{rebookModalBooking.providerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient</span>
                <span className="font-bold text-slate-800">{rebookModalBooking.patientName}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRebookModalBooking(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRebook(rebookModalBooking)}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                Continue to Booking &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
