import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  Calendar,
  Clock,
  Navigation,
  HeartPulse,
  Users,
  Star,
  ChevronRight,
  Plus,
  Stethoscope,
  Building2,
  Home,
  Truck,
  Pill,
  TestTube,
  Package,
  Activity,
  Bell,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { MOCK_FAMILY_MEMBERS } from '../../../mocks/patientFlowMocks';

export default function PatientDashboard() {
  const navigate = useNavigate();

  // User Profile
  const [userName, setUserName] = useState('Ravi Teja');
  const [selectedFamilyId, setSelectedFamilyId] = useState('self');

  // Search input
  const [searchTerm, setSearchTerm] = useState('');

  // Load user data on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vizito_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.fullName || u.full_name) {
          setUserName(u.fullName || u.full_name);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Quick Healthcare Services List
  const quickServices = [
    {
      id: 'doctor',
      name: 'Doctor Consultation',
      desc: 'In-Clinic & Video Consults',
      icon: Stethoscope,
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      badge: 'Available'
    },
    {
      id: 'hospital',
      name: 'Hospital & Clinic',
      desc: 'OPD Appointments & Admissions',
      icon: Building2,
      bg: 'bg-sky-50 text-sky-600 border-sky-100',
      badge: '24/7 OPD'
    },
    {
      id: 'homecare',
      name: 'Home Care Services',
      desc: 'Nurses, Attendants & Physio',
      icon: Home,
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      badge: 'Doorstep Care'
    },
    {
      id: 'ambulance',
      name: 'Scheduled Ambulance',
      desc: 'BLS, ALS & Patient Transport',
      icon: Truck,
      bg: 'bg-rose-50 text-rose-600 border-rose-100',
      badge: 'GPS Tracking'
    },
    {
      id: 'pharmacy',
      name: 'Pharmacy Order',
      desc: 'Medicines & Prescription Upload',
      icon: Pill,
      bg: 'bg-amber-50 text-amber-600 border-amber-100',
      badge: 'Express Delivery'
    },
    {
      id: 'lab',
      name: 'Diagnostic Laboratory',
      desc: 'Home Sample Collection',
      icon: TestTube,
      bg: 'bg-teal-50 text-teal-600 border-teal-100',
      badge: 'Lab Reports'
    },
    {
      id: 'equipment',
      name: 'Medical Equipment Rental',
      desc: 'O2 Concentrators & ICU Beds',
      icon: Package,
      bg: 'bg-violet-50 text-violet-600 border-violet-100',
      badge: 'Rental'
    }
  ];

  // Active / Live Bookings Mock
  const activeBookings = [
    {
      id: 'BK001',
      service: 'Hospital OPD Queue',
      provider: 'Max Healthcare Hospital',
      doctor: 'Dr. Rahul Sharma',
      status: 'In Progress',
      token: '#15',
      patientsAhead: 3,
      estTime: '20 Mins',
      type: 'queue'
    },
    {
      id: 'BK002',
      service: 'Home Care Visit',
      provider: 'Viziito Home Nursing',
      caregiver: 'Sr. Anitha (RN Nurse)',
      status: 'Nurse En Route',
      estArrival: '10 Mins',
      type: 'tracking'
    }
  ];

  // Upcoming Bookings Mock
  const upcomingBookings = [
    {
      id: 'BK003',
      service: 'Video Doctor Consultation',
      provider: 'Apollo TeleHealth',
      doctor: 'Dr. Priya Singh',
      date: '21 Jul 2026',
      time: '11:00 AM',
      status: 'Confirmed'
    },
    {
      id: 'BK004',
      service: 'Diagnostic Lab Sample Collection',
      provider: 'Dr. Lal PathLabs',
      test: 'Full Body Master Package',
      date: '22 Jul 2026',
      time: '07:30 AM',
      status: 'Scheduled'
    }
  ];

  // Favorites Providers Mock
  const favoriteProviders = [
    { id: 'fav1', name: 'Dr. Rahul Sharma', specialty: 'General Physician', rating: 4.9, location: 'Madhapur' },
    { id: 'fav2', name: 'Apollo Pharmacy', specialty: '24x7 Retail & Delivery', rating: 4.8, location: 'Jubilee Hills' },
    { id: 'fav3', name: 'Dr. Lal PathLabs', specialty: 'Diagnostic Blood & Urine Tests', rating: 4.9, location: 'Hitec City' }
  ];

  // Universal Search Navigation Handler
  const handleUniversalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/healthcare-services?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-7xl mx-auto">
      {/* Top Banner & Greeting */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Hello, {userName} 👋
            </h1>
            <p className="text-teal-100/80 text-xs sm:text-sm font-medium">
              Manage your consultations, track ongoing queues, view medical records, and book care for your family.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/booking')}
              className="px-5 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Book New Service
            </button>
          </div>
        </div>

        {/* Universal Search Bar */}
        <form onSubmit={handleUniversalSearchSubmit} className="mt-6 relative max-w-3xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search doctors, hospitals, home care, pharmacy medicines, lab tests..."
            className="w-full pl-12 pr-28 py-3.5 bg-white text-slate-900 rounded-2xl font-semibold text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-400/30 shadow-lg"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Family Member Profile Selector Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600 shrink-0" />
          <div>
            <span className="font-extrabold text-slate-900 text-sm block">Healthcare For:</span>
            <span className="text-[11px] text-slate-500 font-medium">Switch patient profile for current session</span>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedFamilyId('self')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedFamilyId === 'self'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Myself ({userName})
          </button>
          {MOCK_FAMILY_MEMBERS.filter((m) => !m.isSelf).map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedFamilyId(member.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedFamilyId === member.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {member.name} ({member.relationship})
            </button>
          ))}
          <button
            onClick={() => navigate('/profile')}
            className="px-3 py-2 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 font-bold text-xs shrink-0 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Member
          </button>
        </div>
      </div>

      {/* Quick Healthcare Services Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>🏥</span> Healthcare Services
          </h2>
          <button
            onClick={() => navigate('/healthcare-services')}
            className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            Explore All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickServices.map((service) => {
            const IconComp = service.icon;
            return (
              <div
                key={service.id}
                onClick={() => navigate(`/healthcare-services`)}
                className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${service.bg}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {service.badge}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    {service.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-600">
                  <span>Book Now</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active & Live Tracking Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" /> Active Bookings & Live Queue
          </h2>
          <button
            onClick={() => navigate('/bookings')}
            className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            View All Bookings <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeBookings.map((b) => (
            <div
              key={b.id}
              onClick={() => navigate('/bookings')}
              className="bg-white rounded-2xl border border-teal-200 p-5 shadow-xs hover:border-teal-400 cursor-pointer transition-all space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                    {b.service}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-sm mt-1">{b.provider}</h3>
                </div>
                <span className="text-xs font-extrabold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-xl">
                  {b.status}
                </span>
              </div>

              {b.type === 'queue' ? (
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Token</span>
                    <span className="text-base font-black text-slate-900">{b.token}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ahead</span>
                    <span className="text-base font-black text-amber-600">{b.patientsAhead} Patients</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Est. Wait</span>
                    <span className="text-base font-black text-teal-700">{b.estTime}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-teal-50/50 p-3 rounded-xl text-xs font-bold text-teal-900">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-teal-600 animate-pulse" />
                    <span>{b.caregiver}</span>
                  </div>
                  <span className="text-teal-700">Est. Arrival: {b.estArrival}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming & Favorites Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 Cols: Upcoming Bookings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" /> Confirmed Upcoming Bookings
            </h2>
            <button
              onClick={() => navigate('/bookings')}
              className="text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              Manage
            </button>
          </div>

          <div className="space-y-3">
            {upcomingBookings.map((up) => (
              <div
                key={up.id}
                onClick={() => navigate('/bookings')}
                className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-base shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{up.service}</h4>
                    <p className="text-xs text-slate-500 font-semibold">{up.provider} • {up.doctor || up.test}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold text-slate-800 block">{up.date}</span>
                  <span className="text-[11px] text-teal-700 font-bold">{up.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Saved Favorite Providers */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> Favorite Providers
            </h3>
            <span className="text-[10px] font-bold text-slate-400">3 Saved</span>
          </div>

          <div className="space-y-3">
            {favoriteProviders.map((fav) => (
              <div
                key={fav.id}
                onClick={() => navigate('/healthcare-services')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs">{fav.name}</h4>
                  <p className="text-[11px] text-slate-500">{fav.specialty}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-600 flex items-center gap-0.5 justify-end">
                    ★ {fav.rating}
                  </span>
                  <span className="text-[10px] text-slate-400">{fav.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
