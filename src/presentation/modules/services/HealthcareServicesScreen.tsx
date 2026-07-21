import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Star,
  Heart,
  MapPin,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  X,
  Stethoscope,
  Building2,
  Home,
  Truck,
  Pill,
  Microscope,
  Accessibility,
  CheckCircle2,
  Users,
  Upload,
  FileText,
  Navigation,
  ShieldCheck
} from 'lucide-react';
import {
  MOCK_BOOKING_SERVICES,
  MOCK_UNIVERSAL_PROVIDERS,
  MOCK_HOSPITAL_DEPARTMENTS,
  MOCK_HOMECARE_TYPES,
  MOCK_MEDICINES_CATALOG,
  MOCK_LAB_TESTS_CATALOG,
  MOCK_EQUIPMENT_CATALOG,
  MOCK_AVAILABLE_SLOTS,
  type HealthcareServiceOption,
  type ProviderItem,
  type MedicineItem,
  type LabTestItem,
  type RentalEquipmentItem
} from '../../../mocks/universalBookingMocks';

const ICON_MAP: Record<string, React.ElementType> = {
  Stethoscope,
  Building2,
  Home,
  Truck,
  Pill,
  Microscope,
  Accessibility
};

export default function HealthcareServicesScreen() {
  const navigate = useNavigate();

  // Search & Navigation state
  const [globalSearch, setGlobalSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Provider Search & Filters state
  const [providerSearch, setProviderSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [consultTypeFilter, setConsultTypeFilter] = useState('All');
  const [feeFilter, setFeeFilter] = useState('All');

  // Selected Provider Details Modal State
  const [selectedProvider, setSelectedProvider] = useState<ProviderItem | null>(null);
  const [detailDate, setDetailDate] = useState('Today');
  const [detailSlot, setDetailSlot] = useState(MOCK_AVAILABLE_SLOTS[0]);
  const [detailConsultType, setDetailConsultType] = useState<'Video' | 'In Person'>('Video');
  const [collectionType, setCollectionType] = useState<'Home Collection' | 'Lab Visit'>('Home Collection');
  const [rentalDuration, setRentalDuration] = useState<'Daily' | 'Weekly' | 'Monthly'>('Monthly');
  
  // Custom selections inside Details Modal
  const [selectedMeds, setSelectedMeds] = useState<Record<string, number>>({});
  const [selectedTests, setSelectedTests] = useState<Record<string, boolean>>({});
  const [selectedEquipments, setSelectedEquipments] = useState<Record<string, boolean>>({});
  const [rxFileName, setRxFileName] = useState<string | null>(null);

  // Toggle favorite status
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter Services for cards search
  const filteredServices = MOCK_BOOKING_SERVICES.filter((svc) =>
    svc.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
    svc.description.toLowerCase().includes(globalSearch.toLowerCase())
  );

  // Filter Providers for selected tab/category
  const activeProviders = MOCK_UNIVERSAL_PROVIDERS.filter((p) => {
    if (activeCategory !== 'all' && p.serviceId !== activeCategory) return false;

    const matchesSearch =
      p.name.toLowerCase().includes(providerSearch.toLowerCase()) ||
      p.location.toLowerCase().includes(providerSearch.toLowerCase()) ||
      (p.specialtyOrType && p.specialtyOrType.toLowerCase().includes(providerSearch.toLowerCase())) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(providerSearch.toLowerCase()));

    const matchesSpecialty =
      specialtyFilter === 'All' ||
      (p.specialtyOrType && p.specialtyOrType.toLowerCase() === specialtyFilter.toLowerCase());

    const matchesGender =
      genderFilter === 'All' || p.gender === genderFilter;

    const matchesFee =
      feeFilter === 'All' ||
      (feeFilter === 'low' && p.priceValue <= 600) ||
      (feeFilter === 'high' && p.priceValue > 600);

    return matchesSearch && matchesSpecialty && matchesGender && matchesFee;
  });

  const handleBookNow = (provider: ProviderItem) => {
    navigate(`/booking?service=${provider.serviceId}`);
  };

  const handleRxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setRxFileName(file.name);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* 1. Page Header */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Healthcare Services
          </h1>
          <p className="text-teal-100/80 text-sm sm:text-base font-medium leading-relaxed">
            Search top specialist doctors, hospitals, home care, 24/7 ambulances, pharmacies, laboratories, and medical equipment rental in one unified experience.
          </p>

          {/* Search Bar */}
          <div className="mt-6 relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search healthcare services..."
              className="w-full pl-12 pr-4 py-3.5 bg-white text-slate-900 rounded-2xl font-semibold text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-400/30 shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* 2. Service Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <span>🩺</span> Available Healthcare Services
          </h2>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            7 Service Categories
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredServices.map((service) => {
            const IconComponent = ICON_MAP[service.iconName] || Stethoscope;
            const isSelected = activeCategory === service.id;

            return (
              <div
                key={service.id}
                onClick={() => {
                  setActiveCategory(service.id);
                  setProviderSearch('');
                }}
                className={`group relative bg-white rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  isSelected
                    ? 'border-teal-600 ring-2 ring-teal-600/30 shadow-lg bg-teal-50/20'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/50 border border-slate-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {service.emoji}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/booking?service=${service.id}`);
                      }}
                      className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-600 hover:text-white px-3 py-1.5 rounded-xl border border-teal-100 transition-colors flex items-center gap-1 shadow-xs"
                    >
                      Book Now &rarr;
                    </button>
                  </div>

                  <h3 className="font-extrabold text-slate-800 text-base group-hover:text-teal-700 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed line-clamp-2">
                    {service.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-teal-600">
                  <span>View Providers</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Category Filter Tabs */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 overflow-x-auto gap-2 modal-scrollbar">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Providers ({MOCK_UNIVERSAL_PROVIDERS.length})
          </button>
          {MOCK_BOOKING_SERVICES.map((svc) => (
            <button
              key={svc.id}
              onClick={() => setActiveCategory(svc.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeCategory === svc.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{svc.emoji}</span>
              <span>{svc.name}</span>
            </button>
          ))}
        </div>

        {/* 4. Provider Filters & Search Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={providerSearch}
                onChange={(e) => setProviderSearch(e.target.value)}
                placeholder="Search provider by name, specialty, or location..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-500 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" /> Filters:
              </span>

              {/* Specialty filter */}
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="All">Specialty: All</option>
                <option value="Cardiologist">Cardiologist</option>
                <option value="General Physician">General Physician</option>
                <option value="Pediatrician">Pediatrician</option>
                <option value="Multi-Specialty">Multi-Specialty</option>
              </select>

              {/* Fee Filter */}
              <select
                value={feeFilter}
                onChange={(e) => setFeeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="All">Fee: All</option>
                <option value="low">Under ₹600</option>
                <option value="high">Above ₹600</option>
              </select>

              {(providerSearch || specialtyFilter !== 'All' || feeFilter !== 'All') && (
                <button
                  onClick={() => {
                    setProviderSearch('');
                    setSpecialtyFilter('All');
                    setFeeFilter('All');
                  }}
                  className="text-rose-600 hover:text-rose-700 font-bold px-2 py-1 text-xs"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 5. Provider List Grid */}
        {activeProviders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeProviders.map((provider) => {
              const isFav = Boolean(favorites[provider.id]);

              return (
                <div
                  key={provider.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative group"
                >
                  {/* Top Badges & Favorite */}
                  <div className="flex items-center justify-between mb-3">
                    {provider.badge ? (
                      <span className="bg-teal-50 text-teal-700 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-teal-100">
                        {provider.badge}
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        {provider.specialtyOrType || 'Verified Partner'}
                      </span>
                    )}

                    <button
                      onClick={(e) => toggleFavorite(provider.id, e)}
                      className={`p-2 rounded-full transition-colors ${
                        isFav ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400 hover:text-rose-500'
                      }`}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
                    </button>
                  </div>

                  {/* Provider Info Header */}
                  <div>
                    <div className="flex items-start gap-4">
                      <img
                        src={provider.imageUrl}
                        alt={provider.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-xs shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-slate-800 text-base truncate group-hover:text-teal-700 transition-colors">
                          {provider.name}
                        </h3>
                        {provider.subtitle && (
                          <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                            {provider.subtitle}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-black text-slate-800">{provider.rating}</span>
                          <span className="text-xs text-slate-400 font-medium">({provider.reviewsCount} reviews)</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{provider.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-teal-700 font-bold">
                        <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">{provider.availability}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Actions */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pricing / Fee</span>
                      <p className="font-black text-slate-800 text-sm sm:text-base">{provider.feeOrPrice}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedProvider(provider)}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                      >
                        View Details
                      </button>

                      <button
                        onClick={() => handleBookNow(provider)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-xs flex items-center gap-1"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800">No Providers Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find any healthcare providers matching your filters. Try clearing your search or filters.
            </p>
          </div>
        )}
      </div>

      {/* 6. Provider Details Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-scrollbar shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <img
                  src={selectedProvider.imageUrl}
                  alt={selectedProvider.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-xs"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-800">{selectedProvider.name}</h2>
                    <button
                      onClick={() => toggleFavorite(selectedProvider.id)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Heart className={`w-5 h-5 ${favorites[selectedProvider.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>
                  {selectedProvider.subtitle && (
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{selectedProvider.subtitle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-amber-500" /> {selectedProvider.rating}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span>{selectedProvider.reviewsCount} Patient Reviews</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedProvider(null)}
                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Provider Details Body */}
            <div className="space-y-5">
              {/* About Provider */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">About Provider</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {selectedProvider.about || 'Verified healthcare partner committed to delivering quality patient-centric care.'}
                </p>
              </div>

              {/* Service-Specific Fields */}
              {selectedProvider.serviceId === 'doctor' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs pb-3 border-b border-slate-200/60">
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">Experience</span>
                        <span className="font-extrabold text-slate-800 text-sm">{selectedProvider.experienceYears || 10}+ Years</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">Languages</span>
                        <span className="font-extrabold text-slate-800 text-sm">{(selectedProvider.languages || ['English', 'Hindi']).join(', ')}</span>
                      </div>
                    </div>

                    {/* Hospital Experience Breakdown */}
                    <div>
                      <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                        Hospital Experience
                      </span>
                      <ul className="space-y-1.5 text-xs">
                        {(
                          selectedProvider.experienceHistory || [
                            { hospitalName: 'AIG', years: 5, isPresent: true },
                            { hospitalName: 'Care', years: 5 },
                            { hospitalName: 'Medicover', years: 4 }
                          ]
                        ).map((exp, idx) => (
                          <li key={idx} className="flex items-center gap-2 font-medium text-slate-700">
                            <span className="text-teal-600 font-bold text-sm">*</span>
                            <span>
                              <strong className="font-bold text-slate-900">{exp.years} years</strong> in {exp.hospitalName}{' '}
                              {exp.isPresent && (
                                <span className="inline-block ml-1 px-1.5 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-extrabold rounded-md">
                                  (present)
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-2">Consultation Mode</span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDetailConsultType('Video')}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                          detailConsultType === 'Video'
                            ? 'border-teal-600 bg-teal-50 text-teal-800'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        📹 Video Consultation
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailConsultType('In Person')}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                          detailConsultType === 'In Person'
                            ? 'border-teal-600 bg-teal-50 text-teal-800'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        🏥 In-Clinic Visit
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Hospital & Clinic Department List */}
              {selectedProvider.serviceId === 'hospital' && (
                <div>
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Hospital Departments</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {MOCK_HOSPITAL_DEPARTMENTS.map((dept) => (
                      <div key={dept.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>{dept.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Home Care Services List */}
              {selectedProvider.serviceId === 'homecare' && (
                <div>
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Available Home Services</h4>
                  <div className="space-y-2">
                    {MOCK_HOMECARE_TYPES.map((type) => (
                      <div key={type.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>{type.name}</span>
                        <span className="text-teal-700">₹{type.pricePerVisit} / visit</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pharmacy Medicines Catalog & Prescription Upload */}
              {selectedProvider.serviceId === 'pharmacy' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Available Medicines</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto modal-scrollbar pr-1">
                    {MOCK_MEDICINES_CATALOG.map((med) => (
                      <div key={med.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs font-bold">
                        <div>
                          <p className="text-slate-800">{med.name}</p>
                          <span className="text-[10px] text-slate-400 font-normal">{med.dosage}</span>
                        </div>
                        <span className="text-teal-700">₹{med.price}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2">
                    <span className="text-xs font-extrabold text-amber-800 flex items-center gap-1">
                      <Upload className="w-4 h-4 text-amber-600" /> Upload Prescription (If required)
                    </span>
                    <input type="file" onChange={handleRxUpload} className="text-xs text-slate-600" />
                    {rxFileName && <p className="text-xs font-bold text-emerald-700">Attached: {rxFileName}</p>}
                  </div>
                </div>
              )}

              {/* Diagnostic Lab Tests */}
              {selectedProvider.serviceId === 'diagnostic' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Available Lab Tests & Health Packages</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto modal-scrollbar pr-1">
                    {MOCK_LAB_TESTS_CATALOG.map((test) => (
                      <div key={test.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs font-bold">
                        <div>
                          <p className="text-slate-800">{test.name}</p>
                          <span className="text-[10px] text-slate-400 font-normal">{test.turnaroundTime}</span>
                        </div>
                        <span className="text-teal-700">₹{test.price}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCollectionType('Home Collection')}
                      className={`flex-1 p-2.5 rounded-xl border text-xs font-bold ${
                        collectionType === 'Home Collection' ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      🏠 Home Collection
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectionType('Lab Visit')}
                      className={`flex-1 p-2.5 rounded-xl border text-xs font-bold ${
                        collectionType === 'Lab Visit' ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      🧪 Lab Visit
                    </button>
                  </div>
                </div>
              )}

              {/* Equipment Rental */}
              {selectedProvider.serviceId === 'equipment' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Rental Equipment Catalog</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto modal-scrollbar pr-1">
                    {MOCK_EQUIPMENT_CATALOG.map((eq) => (
                      <div key={eq.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs font-bold">
                        <span>{eq.name}</span>
                        <span className="text-teal-700">₹{eq.monthlyRate} / month</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Queue Section Display (if supported by Doctor, Hospital, or Lab) */}
              {selectedProvider.supportsQueue && (
                <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-sm">
                      {selectedProvider.queueNumber || '#01'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-violet-900 block">Live Token Queue</span>
                      <span className="text-[11px] text-violet-700 font-semibold">
                        {selectedProvider.patientsAhead || 0} Patients ahead of you
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-violet-800 bg-violet-100 px-3 py-1.5 rounded-full border border-violet-200">
                    Wait: {selectedProvider.waitingTime || '~15 mins'}
                  </span>
                </div>
              )}

              {/* Live Tracking Display (if supported by Home Care, Ambulance, Pharmacy, or Equipment) */}
              {selectedProvider.supportsTracking && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Navigation className="w-5 h-5 text-emerald-600 animate-pulse" />
                    <div>
                      <span className="text-xs font-bold text-emerald-900 block">Live Status Tracking</span>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        {selectedProvider.trackingStatus}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full uppercase">
                    GPS Active
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Total</span>
                <span className="text-lg font-black text-slate-800">{selectedProvider.feeOrPrice}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProvider(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleBookNow(selectedProvider)}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md active:scale-98 transition-all"
                >
                  Book Now &rarr;
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
