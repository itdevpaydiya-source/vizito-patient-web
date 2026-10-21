import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, X, CalendarPlus, AlertCircle, RotateCcw, Stethoscope,
  Calendar, Clock, Video, Building2, MapPin, CheckCircle2, ChevronRight,
  ShieldCheck, Banknote, Smartphone, Info
} from 'lucide-react';
import { getProvidersApi } from '../../../services/patientHelper';
import type { ProviderItem } from '../../../services/types';
import { formatDoctorName } from '../../../utils/doctorLabel';
import DoctorTrustDetails from '../../components/DoctorTrustDetails';
import CancellationRefundPolicy from '../../components/CancellationRefundPolicy';
import {
  getProviderSlotsWithPauseApi, getOfferedModesApi, type OfferedHours,
  createBookingApi,
  formatSlotTime,
  type AvailableSlot,
  type CreatedBooking,
} from '../../../services/bookingHelper';
import { getMyUserId, getFamilyMembersApi, type PatientFamilyMember } from '../../../services/familyHelper';
import { validateUpiId } from '../../../utils/validators/india';

// Find Doctors & Clinics — patient-facing doctor directory and appointment booking
const BookConsultationScreen = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const doctorParam = searchParams.get('doctor') || searchParams.get('provider');

  const [searchTerm, setSearchTerm] = useState('');
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Booking Modal State
  const [selectedDoctor, setSelectedDoctor] = useState<ProviderItem | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await getProvidersApi('doctor');
      setProviders(list);
    } catch {
      setLoadError('Unable to load doctors. Please try again.');
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // If URL has ?doctor=id, open booking modal for that doctor
  useEffect(() => {
    if (doctorParam && providers.length > 0) {
      const match = providers.find((p) => String(p.id) === String(doctorParam));
      if (match) setSelectedDoctor(match);
    }
  }, [doctorParam, providers]);

  const filtered = useMemo(() => {
    return providers.filter((p) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.specialtyOrType || '').toLowerCase().includes(q) ||
        (p.qualification || '').toLowerCase().includes(q)
      );
    });
  }, [providers, searchTerm]);

  const initialsOf = (name: string) =>
    name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'DR';

  const handleOpenBooking = (doc: ProviderItem) => {
    setSelectedDoctor(doc);
    setSearchParams({ doctor: doc.id });
  };

  const handleCloseBooking = () => {
    setSelectedDoctor(null);
    setSearchParams({});
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Find Doctors & Clinics</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Browse verified medical practitioners, check registrations, and book direct consultations.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by doctor name, specialty, or qualification (e.g. Cardiologist, MBBS)..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-sm text-slate-700"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <div className="w-7 h-7 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">Loading verified doctors...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-600 font-semibold text-sm">{loadError}</p>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((doc) => (
            <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-teal-400 hover:shadow-md transition-all group">
              <div className="space-y-3">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl border border-slate-100 shadow-2xs shrink-0 bg-teal-50 text-teal-700 flex items-center justify-center font-black text-lg">
                    {initialsOf(doc.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                      {formatDoctorName(doc.name) || doc.name}
                    </h3>
                    <p className="text-xs font-bold text-teal-600 capitalize">
                      {doc.specialization || doc.specialtyOrType || 'General Physician'}
                    </p>
                  </div>
                </div>

                {/* Doctor Trust Details */}
                <DoctorTrustDetails
                  qualification={doc.qualification}
                  specialization={doc.specialization || doc.specialtyOrType}
                  experienceYears={doc.experienceYears}
                  medicalRegistrationNumber={doc.medicalRegistrationNumber}
                  medicalCouncilName={doc.medicalCouncilName}
                  registrationVerified={doc.registrationVerified}
                />

                {/* Fees preview */}
                {(doc.inClinicFee != null || doc.videoFee != null) && (
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
                    {doc.inClinicFee != null && (
                      <span className="text-slate-600 font-medium">
                        In-Clinic: <strong className="text-slate-900">₹{doc.inClinicFee}</strong>
                      </span>
                    )}
                    {doc.videoFee != null && (
                      <span className="text-slate-600 font-medium flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-teal-600" /> Video: <strong className="text-slate-900">₹{doc.videoFee}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleOpenBooking(doc)}
                className="w-full mt-5 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs active:scale-98"
              >
                <CalendarPlus className="w-4 h-4" />
                Book Appointment
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-lg">No doctors available</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            {searchTerm ? 'No doctors match your search.' : 'There are no approved doctor providers currently available.'}
          </p>
        </div>
      )}

      {/* Inline Booking Drawer / Modal */}
      {selectedDoctor && (
        <DoctorBookingModal
          doctor={selectedDoctor}
          initialMode={searchParams.get('mode') === 'video' ? 'Video' : searchParams.get('mode') === 'clinic' ? 'In Person' : undefined}
          forName={searchParams.get('for') || undefined}
          rebook={searchParams.get('rebook') === '1'}
          onClose={handleCloseBooking}
          onSuccess={() => {
            handleCloseBooking();
            navigate('/bookings');
          }}
        />
      )}
    </div>
  );
};

// ─── Inline Doctor Booking Modal with Slots, Trust Details & Cancellation Policy ─────────
interface ModalProps {
  doctor: ProviderItem;
  /** "Book again": start from the earlier visit's mode and person, on the next day with a matching time. */
  initialMode?: 'In Person' | 'Video';
  forName?: string;
  rebook?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dateOptions = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400000);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
    return { iso, label };
  });

function DoctorBookingModal({ doctor, onClose, onSuccess, initialMode, forName, rebook }: ModalProps) {
  const [dates] = useState(dateOptions);
  const [selectedDate, setSelectedDate] = useState(dates[0].iso);
  const [serviceType, setServiceType] = useState<'In Person' | 'Video'>(initialMode || 'In Person');
  const [rebookTries, setRebookTries] = useState(rebook ? 0 : 99); // days already skipped looking for a time
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  // The modes the doctor really offers at each time this day (null = unknown: show every slot).
  const [offered, setOffered] = useState<OfferedHours[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [pauseNotice, setPauseNotice] = useState<string | null>(null);

  const [family, setFamily] = useState<PatientFamilyMember[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');

  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CASH'>('CASH');
  const [upiId, setUpiId] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedReceipt, setBookedReceipt] = useState<CreatedBooking | null>(null);

  // Load family members
  useEffect(() => {
    getMyUserId().then((id) => (id ? getFamilyMembersApi(id) : [])).then(setFamily).catch(() => setFamily([]));
  }, []);

  // Fetch slots for selected date
  useEffect(() => {
    let active = true;
    setSlotsLoading(true);
    setSelectedSlot(null);
    setBookingError(null);
    setPauseNotice(null);

    setOffered(null);
    getOfferedModesApi(doctor.id, selectedDate).then((h) => { if (active) setOffered(h); }).catch(() => undefined);
    getProviderSlotsWithPauseApi(doctor.id, selectedDate)
      .then(({ slots: fetchedSlots, paused }) => {
        if (!active) return;
        setSlots(fetchedSlots);
        if (paused?.paused) {
          setPauseNotice(
            paused.until
              ? `Doctor has paused bookings until ${new Date(paused.until).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
              : 'Doctor is not taking new appointments right now.'
          );
        }
      })
      .catch(() => {
        if (active) setSlots([]);
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });

    return () => { active = false; };
  }, [doctor.id, selectedDate]);

  const MODE: Record<'In Person' | 'Video', string> = { 'In Person': 'IN_PERSON', Video: 'VIDEO' };
  const slotModes = (slot: AvailableSlot): string[] | null => {
    if (!offered) return null;
    const t = String(slot.start_time || '').slice(0, 5);
    const m = offered.filter((h) => (h.clinic_id == null || slot.facility_id == null || Number(h.clinic_id) === Number(slot.facility_id)) && h.start_time <= t && t < h.end_time).flatMap((h) => h.modes);
    return m.length ? m : null; // a slot outside known hours: don't hide it
  };
  const offers = (slot: AvailableSlot, type: 'In Person' | 'Video') => { const m = slotModes(slot); return !m || m.includes(MODE[type]); };
  const modeSlots = useMemo(() => slots.filter((sl) => offers(sl, serviceType)), [slots, offered, serviceType]); // eslint-disable-line react-hooks/exhaustive-deps
  const modeFacilities = useMemo(() => {
    const unique = new Map<string, AvailableSlot>();
    modeSlots.forEach((slot) => {
      if (!slot.facility_name && !slot.facility_address) return;
      const key = String(slot.facility_id ?? `${slot.facility_name || ''}|${slot.facility_address || ''}`);
      if (!unique.has(key)) unique.set(key, slot);
    });
    return Array.from(unique.values());
  }, [modeSlots]);
  const modeOpen = (type: 'In Person' | 'Video') => slots.some((sl) => offers(sl, type));
  // If the chosen mode isn't offered this day but the other one is, switch to it.
  useEffect(() => {
    if (slotsLoading || !offered || !slots.length || rebookTries < 99) return; // book again keeps the earlier mode
    const other = serviceType === 'Video' ? 'In Person' : 'Video';
    if (!modeOpen(serviceType) && modeOpen(other)) { setServiceType(other); setSelectedSlot(null); }
  }, [slots, offered, slotsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Book again: if this day has no time in the earlier mode, move to the next day (up to a week).
  useEffect(() => {
    if (rebookTries >= dates.length - 1 || slotsLoading || (slots.length && !offered)) return;
    if (modeSlots.length) { setRebookTries(99); return; }
    const i = dates.findIndex((d) => d.iso === selectedDate);
    if (i >= 0 && i < dates.length - 1) { setSelectedDate(dates[i + 1].iso); setRebookTries((n) => n + 1); }
  }, [slots, offered, slotsLoading]); // eslint-disable-line react-hooks/exhaustive-deps
  // Book again for the same person (a family member, matched by name).
  useEffect(() => {
    if (!forName || !family.length) return;
    const m = family.find((f: any) => String(f.fullName || f.name || '').trim().toLowerCase() === forName.trim().toLowerCase());
    if (m) setSelectedFamilyId(String((m as any).memberUserId));
  }, [family, forName]);

  const consultationFee = useMemo(() => {
    if (selectedSlot?.fee != null) return Number(selectedSlot.fee);
    if (serviceType === 'Video' && doctor.videoFee != null) return Number(doctor.videoFee);
    if (doctor.inClinicFee != null) return Number(doctor.inClinicFee);
    return 500; // standard nominal fee fallback
  }, [selectedSlot, serviceType, doctor]);

  const handleBook = async () => {
    if (!selectedSlot) {
      setBookingError('Please choose a time slot.');
      return;
    }

    if (paymentMode === 'UPI') {
      const uRes = validateUpiId(upiId);
      if (!uRes.ok) {
        setBookingError(uRes.message);
        return;
      }
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const res = await createBookingApi({
        partner_id: doctor.id,
        service_type: serviceType,
        booking_date: selectedDate,
        time_slot_id: selectedSlot.time_slot_id,
        time_slot: selectedSlot.start_time.slice(0, 5),
        family_member_id: selectedFamilyId || undefined,
        payment_mode: paymentMode,
        payment: paymentMode === 'UPI' ? { payment_method: 'UPI', upi_id: upiId.trim() } : undefined,
      });
      setBookedReceipt(res);
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Unable to confirm appointment. Please choose another slot.';
      setBookingError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full my-8 overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-sm">Book Consultation</h3>
            <p className="text-[11px] text-slate-500">{formatDoctorName(doctor.name) || doctor.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          {bookedReceipt ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-black text-slate-900">Appointment Confirmed!</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Your consultation reference is <strong className="text-teal-700 font-mono">{bookedReceipt.booking_number}</strong>.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 text-xs text-left space-y-1.5 max-w-sm mx-auto">
                <div className="flex justify-between"><span className="text-slate-500">Doctor:</span><span className="font-bold">{doctor.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Date &amp; Time:</span><span className="font-bold">{selectedDate} · {selectedSlot ? formatSlotTime(selectedSlot.start_time) : ''}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Mode:</span><span className="font-bold">{serviceType}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Amount:</span><span className="font-black text-slate-900">₹{consultationFee}</span></div>
              </div>
              <button
                onClick={onSuccess}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
              >
                View My Consultations
              </button>
            </div>
          ) : (
            <>
              {/* Doctor Trust Card */}
              <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{formatDoctorName(doctor.name) || doctor.name}</h4>
                    <DoctorTrustDetails
                      qualification={doctor.qualification}
                      specialization={doctor.specialization || doctor.specialtyOrType}
                      experienceYears={doctor.experienceYears}
                      medicalRegistrationNumber={doctor.medicalRegistrationNumber}
                      medicalCouncilName={doctor.medicalCouncilName}
                      registrationVerified={doctor.registrationVerified}
                      className="mt-1"
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Consultation Fee</span>
                    <span className="text-base font-black text-orange-900">₹{consultationFee}</span>
                  </div>
                </div>
              </div>

              {/* Consultation Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Consultation Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setServiceType('In Person'); setSelectedSlot(null); }}
                    disabled={!slotsLoading && slots.length > 0 && !modeOpen('In Person')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      serviceType === 'In Person'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> In-Clinic Visit{!slotsLoading && slots.length > 0 && !modeOpen('In Person') ? <span className="font-semibold"> · not this day</span> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setServiceType('Video'); setSelectedSlot(null); }}
                    disabled={!slotsLoading && slots.length > 0 && !modeOpen('Video')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      serviceType === 'Video'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" /> Video Consultation{!slotsLoading && slots.length > 0 && !modeOpen('Video') ? <span className="font-semibold"> · not this day</span> : null}
                  </button>
                </div>
              </div>

              {/* Clinic location is derived from real slots for this mode and date. */}
              <section aria-label="Clinic location" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl bg-white border border-orange-100 text-orange-800 flex items-center justify-center shrink-0"><Building2 className="w-4 h-4" /></span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800">{serviceType === 'Video' ? 'Online consultation' : 'Clinic / branch'}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {serviceType === 'Video' ? 'No clinic visit is needed for a video consultation.' : slotsLoading ? 'Checking the clinic for this date…' : modeFacilities.length > 1 ? 'Available locations for this date. The selected time confirms the clinic.' : modeFacilities.length === 1 ? 'Appointment location for this date.' : 'Clinic details will appear when in-clinic times are available.'}
                    </p>
                  </div>
                </div>
                {serviceType === 'In Person' && modeFacilities.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {modeFacilities.map((facility) => (
                      <div key={String(facility.facility_id ?? facility.facility_name)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-orange-700 shrink-0" />{facility.facility_name || 'Clinic location'}</p>
                        {facility.facility_address && <p className="text-[11px] text-slate-500 mt-1 flex items-start gap-1.5"><MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />{facility.facility_address}</p>}
                        {facility.facility_type && <p className="text-[10px] text-slate-400 mt-1">{facility.facility_type}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Patient Selector */}
              {family.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Who is this visit for?</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFamilyId('')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                        !selectedFamilyId ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Myself
                    </button>
                    {family.map((f) => (
                      <button
                        key={f.associationId || f.memberUserId}
                        type="button"
                        onClick={() => setSelectedFamilyId(String(f.memberUserId))}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                          selectedFamilyId === String(f.memberUserId)
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {f.name} ({f.relationship})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Select Date</label>
                <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {dates.map((d) => (
                    <button
                      key={d.iso}
                      type="button"
                      aria-pressed={selectedDate === d.iso}
                      onClick={() => setSelectedDate(d.iso)}
                      className={`min-w-0 min-h-11 px-2 py-2 rounded-xl border text-xs font-bold text-center transition-all ${
                        selectedDate === d.iso
                          ? 'bg-orange-50 text-orange-900 border-orange-300 ring-1 ring-orange-200'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-orange-200 hover:bg-orange-50/40'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slots Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Available Time Slots</label>
                {slotsLoading ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading available slots...</div>
                ) : pauseNotice ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                    {pauseNotice}
                  </div>
                ) : modeSlots.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                    {slots.length ? `${doctor.name || 'The doctor'} has no ${serviceType === 'Video' ? 'video consultation' : 'in-clinic'} times on this date. Choose another day.` : 'No open slots on this date. Please choose another day.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {modeSlots.map((slot) => {
                      const isSel = selectedSlot?.time_slot_id === slot.time_slot_id;
                      return (
                        <button
                          key={slot.time_slot_id}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-2 rounded-xl border text-xs font-bold text-center transition-all ${
                            isSel
                              ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
                          }`}
                        >
                          {formatSlotTime(slot.start_time)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payment is relevant only after a time has been chosen. */}
              {selectedSlot ? <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      paymentMode === 'CASH'
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <Banknote className="w-4 h-4" /> Pay at Clinic
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('UPI')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      paymentMode === 'UPI'
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" /> Pay Online (UPI)
                  </button>
                </div>
                {paymentMode === 'UPI' && (
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value.trim().toLowerCase())}
                    placeholder="Enter UPI ID (e.g. name@okhdfcbank)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                )}
              </div> : (
                <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-3 text-xs text-slate-500">
                  <Info className="w-4 h-4 text-orange-700 shrink-0" />Choose an available time to continue to payment options.
                </div>
              )}

              {/* The refund policy must be seen before paying (P0 audit): open by default, collapsible. */}
              <details open className="group rounded-2xl border border-slate-200 bg-white p-3.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-lg">
                  <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-orange-700" />Cancellation &amp; refund policy</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">View details <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" /></span>
                </summary>
                <div className="pt-3"><CancellationRefundPolicy service="doctor" compact /></div>
              </details>

              {bookingError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
                  {bookingError}
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="button"
                onClick={handleBook}
                disabled={isSubmitting || !selectedSlot}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                {isSubmitting ? (
                  'Confirming appointment...'
                ) : (
                  <>Confirm &amp; Book · ₹{consultationFee}</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookConsultationScreen;
