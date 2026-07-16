import React, { useState } from 'react';
import { 
  Search, Star, CalendarPlus, Video, MapPin, 
  X, CheckCircle2, SlidersHorizontal, CreditCard, 
  Calendar, Clock, ShieldCheck 
} from 'lucide-react';
import { MOCK_AVAILABLE_DOCTORS } from '../../../mocks/patientFlowMocks';

const BookConsultationScreen = () => {
  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedMode, setSelectedMode] = useState('All');
  const [feeFilter, setFeeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('rating'); // rating, feeAsc, feeDesc
  
  // Booking Modal State
  const [bookingDoc, setBookingDoc] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('Tomorrow');
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM');
  const [selectedType, setSelectedType] = useState('Online');
  const [isPaying, setIsPaying] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // List of specialties available in mocks
  const specialties = ['All', 'Cardiologist', 'Dermatologist', 'Pediatrician', 'General Physician'];

  // Filter and Sort Logic
  const filteredDoctors = MOCK_AVAILABLE_DOCTORS.filter(doc => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      doc.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpecialty = 
      selectedSpecialty === 'All' || 
      doc.specialty.toLowerCase() === selectedSpecialty.toLowerCase();
    
    const matchesMode = 
      selectedMode === 'All' || 
      (selectedMode === 'Online' && doc.availability.toLowerCase().includes('today')) || // Mock correlation
      (selectedMode === 'In-Clinic' && !doc.availability.toLowerCase().includes('today'));

    const matchesFee = 
      feeFilter === 'All' || 
      (feeFilter === 'low' && doc.fee < 1000) || 
      (feeFilter === 'high' && doc.fee >= 1000);

    return matchesSearch && matchesSpecialty && matchesMode && matchesFee;
  }).sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'feeAsc') return a.fee - b.fee;
    if (sortBy === 'feeDesc') return b.fee - a.fee;
    return 0;
  });

  const handleOpenBooking = (doc: any) => {
    setBookingDoc(doc);
    setSelectedType(doc.specialty === 'Cardiologist' ? 'In-Clinic' : 'Online'); // default simulation
    setBookingSuccess(false);
    setIsPaying(false);
  };

  const handleConfirmBooking = () => {
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      setBookingSuccess(true);
      
      // Simulate saving new appointment to localStorage list to reflect on other tabs if desired
      try {
        const stored = localStorage.getItem('vizito_patient_appointments');
        const appointments = stored ? JSON.parse(stored) : [];
        const newApt = {
          id: `apt_${Date.now()}`,
          time: selectedSlot,
          date: selectedDate === 'Tomorrow' ? 'Tomorrow' : 'Oct 28, 2026',
          doctorName: bookingDoc.name,
          specialty: bookingDoc.specialty,
          type: selectedType,
          status: 'Upcoming',
          clinicName: selectedType === 'Online' ? 'Tele-Consultation Room' : 'Viziito Partner Clinic'
        };
        localStorage.setItem('vizito_patient_appointments', JSON.stringify([newApt, ...appointments]));
      } catch (err) {
        console.error(err);
      }
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Find Doctors & Clinics</h2>
          <p className="text-slate-500 mt-1">Search, filter, and book an online video consultation or in-clinic visit.</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by doctor name, specialty, or clinic..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-sm text-slate-700"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 md:w-64">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="rating">Sort by Rating (Highest)</option>
              <option value="feeAsc">Sort by Fee: Low to High</option>
              <option value="feeDesc">Sort by Fee: High to Low</option>
            </select>
          </div>
        </div>

        {/* Filter Badges & dropdown selectors */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Specialty</span>
            <div className="flex flex-wrap gap-1.5">
              {specialties.map(spec => (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialty(spec)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedSpecialty === spec 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

          <div className="flex gap-4">
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consultation Type</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                {['All', 'Online', 'In-Clinic'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      selectedMode === mode 
                        ? 'bg-white text-slate-800 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consultation Fee</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                {[
                  { value: 'All', label: 'All' },
                  { value: 'low', label: '< ₹1000' },
                  { value: 'high', label: '₹1000+' }
                ].map(fee => (
                  <button
                    key={fee.value}
                    onClick={() => setFeeFilter(fee.value)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      feeFilter === fee.value 
                        ? 'bg-white text-slate-800 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {fee.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Doctors Results Grid */}
      {filteredDoctors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map(doc => (
            <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col hover:border-teal-400 hover:shadow-md transition-all group">
              <div className="flex items-start gap-4">
                <img src={doc.imageUrl} alt={doc.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-xs shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-slate-800 group-hover:text-teal-700 transition-colors truncate">{doc.name}</h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">{doc.specialty}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-black text-slate-800">{doc.rating}</span>
                    <span className="text-xs text-slate-400 font-semibold">({doc.reviews} reviews)</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fee</p>
                  <p className="font-black text-slate-800 text-lg">₹{doc.fee}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                    {doc.availability}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => handleOpenBooking(doc)}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-xs active:scale-98"
              >
                <CalendarPlus className="w-4 h-4" />
                Book Appointment
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <SlidersHorizontal className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-lg">No Doctors Found</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">Try clearing search phrases or expanding filter constraints to see more options.</p>
          <button 
            onClick={() => { setSearchTerm(''); setSelectedSpecialty('All'); setSelectedMode('All'); setFeeFilter('All'); }} 
            className="mt-4 text-xs font-bold text-teal-600 hover:underline"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Booking Checkout Modal */}
      {bookingDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <h3 className="font-black text-slate-800 text-base">Confirm Appointment</h3>
              <button 
                onClick={() => setBookingDoc(null)}
                className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {!bookingSuccess ? (
                <>
                  {/* Doctor Info Banner */}
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <img src={bookingDoc.imageUrl} alt={bookingDoc.name} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{bookingDoc.name}</h4>
                      <p className="text-xs font-bold text-slate-400">{bookingDoc.specialty}</p>
                    </div>
                  </div>

                  {/* Date & Slot selection */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Select Schedule</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Tomorrow', 'Monday, Oct 28'].map(date => (
                        <button
                          type="button"
                          key={date}
                          onClick={() => setSelectedDate(date)}
                          className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                            selectedDate === date 
                              ? 'border-teal-500 bg-teal-50/50 text-teal-700 font-bold' 
                              : 'border-slate-200 bg-white text-slate-600 font-semibold'
                          }`}
                        >
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-xs">{date}</span>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {['10:00 AM', '02:30 PM', '05:00 PM'].map(slot => (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 rounded-lg border text-xs text-center transition-all ${
                            selectedSlot === slot 
                              ? 'border-teal-500 bg-teal-50/50 text-teal-700 font-bold' 
                              : 'border-slate-200 bg-white text-slate-500'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Consultation Mode */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Consultation Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedType('Online')}
                        className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                          selectedType === 'Online' 
                            ? 'border-teal-500 bg-teal-50/50 text-teal-700 font-bold' 
                            : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        <Video className="w-4 h-4" />
                        <span className="text-xs">Online Consult</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedType('In-Clinic')}
                        className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                          selectedType === 'In-Clinic' 
                            ? 'border-teal-500 bg-teal-50/50 text-teal-700 font-bold' 
                            : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs">In-Clinic Visit</span>
                      </button>
                    </div>
                  </div>

                  {/* Checkout Summary Card */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-4 space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>Doctor Consultation Fee</span>
                      <span>₹{bookingDoc.fee}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>Internet Handling Fee</span>
                      <span>₹50</span>
                    </div>
                    <div className="h-px bg-slate-200 my-2"></div>
                    <div className="flex justify-between text-sm font-black text-slate-800">
                      <span>Total Amount Pay</span>
                      <span>₹{bookingDoc.fee + 50}</span>
                    </div>
                  </div>

                  {/* Security Badge */}
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold justify-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Secure Gateway Payment • Viziito Health Assurance</span>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center animate-in zoom-in duration-200 space-y-4">
                  <div className="flex justify-center">
                    <span className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full animate-bounce">
                      <CheckCircle2 className="w-12 h-12" />
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xl">Booking Confirmed!</h4>
                    <p className="text-xs font-semibold text-slate-400 mt-1 max-w-xs mx-auto">
                      Your consultation with <span className="text-teal-600 font-bold">{bookingDoc.name}</span> has been scheduled successfully.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2 max-w-xs mx-auto">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{selectedDate} • {selectedSlot}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      {selectedType === 'Online' ? <Video className="w-4 h-4 text-teal-500 shrink-0" /> : <MapPin className="w-4 h-4 text-rose-500 shrink-0" />}
                      <span>{selectedType === 'Online' ? 'Tele-Video Link Shared' : 'In-Clinic Appointment Token'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0 flex gap-3">
              {!bookingSuccess ? (
                <>
                  <button
                    type="button"
                    onClick={() => setBookingDoc(null)}
                    className="btn bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 w-1/3 py-2.5 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isPaying}
                    onClick={handleConfirmBooking}
                    className="btn btn-primary flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                  >
                    {isPaying ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Pay & Confirm (₹{bookingDoc.fee + 50})
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setBookingDoc(null)}
                  className="btn btn-primary w-full py-2.5 text-xs font-bold rounded-xl"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookConsultationScreen;
