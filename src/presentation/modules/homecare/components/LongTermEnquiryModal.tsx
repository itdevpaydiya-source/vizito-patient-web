import BookingDialog from '../../bookings/BookingDialog';
import React, { useState, useEffect } from 'react';
import HomePinField from '../../../components/location/HomePinField';
import { X, Calendar, User, MapPin, Activity, ShieldCheck, HeartHandshake, AlertCircle, Clock, ChevronRight, CheckCircle2, Users } from 'lucide-react';
import { hcEnquireApi, hcLtOptionsApi, hcCatalogueApi, type HcEnquiry } from '../../../../services/homecareHelper';
import { getMyUserId, getFamilyMembersApi, type PatientFamilyMember } from '../../../../services/familyHelper';
import { getAddressesApi } from '../../../../services/patientHelper';
import { validatePinCode } from '../../../../utils/validators/india';

interface LongTermEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (enquiry: HcEnquiry) => void;
  preselectedAgencyId?: string;
  preselectedAgencyName?: string;
  preselectedCareType?: string;
  preselectedShiftPattern?: string;
  agencies?: { id: string; name: string; pincodes?: string[] }[];
}

const CARE_TYPE_OPTIONS = [
  { id: 'ELDER_CARE', label: 'Elder care & companionship', desc: 'Bathing, feeding, mobility assistance, vitals' },
  { id: 'ATTENDANT', label: 'General Duty Attendant (GDA)', desc: 'Bedside personal care & daily routine' },
  { id: 'NURSE', label: 'Skilled Nursing (12h / 24h)', desc: 'Post-op recovery, injections, catheter, RT feed' },
  { id: 'POST_SURGERY', label: 'Post-surgery rehabilitation', desc: 'Wound care, safe transfers, medication schedule' },
  { id: 'BEDRIDDEN', label: 'Bedridden patient care', desc: '2-hourly turning, pressure-sore prevention, diaper care' },
];

const SHIFT_OPTIONS = [
  { id: 'DAY_12', label: '12-Hour Day (8:00 AM – 8:00 PM)', icon: '☀️', hint: 'Active daytime assistance & meals' },
  { id: 'NIGHT_12', label: '12-Hour Night (8:00 PM – 8:00 AM)', icon: '🌙', hint: 'Nocturnal monitoring & fall prevention' },
  { id: 'LIVE_IN_24', label: '24-Hour Live-in Care', icon: '🏡', hint: 'Round-the-clock continuous residential support' },
];

const MOBILITY_OPTIONS = [
  { id: 'INDEPENDENT', label: 'Walks on own', hint: 'Fully mobile, needs minimal supervision' },
  { id: 'ASSISTED', label: 'Walks with help', hint: 'Uses cane, walker, or family support' },
  { id: 'WHEELCHAIR', label: 'Uses a wheelchair', hint: 'Requires assistance with chair transfers' },
  { id: 'BEDRIDDEN', label: 'Needs care in bed', hint: 'Requires full in-bed care & 2-hr positioning' },
];

export default function LongTermEnquiryModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedAgencyId,
  preselectedAgencyName,
  preselectedCareType = 'ELDER_CARE',
  preselectedShiftPattern = 'DAY_12',
  agencies = [],
}: LongTermEnquiryModalProps) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Family Members & Recipient
  const [familyMembers, setFamilyMembers] = useState<PatientFamilyMember[]>([]);
  const [familyMemberId, setFamilyMemberId] = useState<string>('');

  // Form State
  const [agenciesList, setAgenciesList] = useState<{ id: string; name: string }[]>(agencies);
  const [agencyId, setAgencyId] = useState<string>(preselectedAgencyId || '');
  const [careType, setCareType] = useState<string>(preselectedCareType);
  const [shiftPattern, setShiftPattern] = useState<string>(preselectedShiftPattern);
  const [mobility, setMobility] = useState<string>('ASSISTED');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(Date.now() + 2 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [conditions, setConditions] = useState<string>('');
  const [needs, setNeeds] = useState<string>('');
  const [language, setLanguage] = useState<string>('Telugu, Hindi');
  const [preferredGender, setPreferredGender] = useState<'ANY' | 'FEMALE' | 'MALE'>('FEMALE');

  // Address
  const [addressLine, setAddressLine] = useState<string>('');
  const [addressArea, setAddressArea] = useState<string>('');
  const [addressCity, setAddressCity] = useState<string>('');
  const [addressPincode, setAddressPincode] = useState<string>('');
  const [homePin, setHomePin] = useState<{ lat: number; lng: number } | null>(null);
  // Agencies are only ever the ones that serve THIS pincode — never another city's as a fallback.
  const [noneServes, setNoneServes] = useState<string | null>(null);
  const [addressLandmark, setAddressLandmark] = useState<string>('');
  const [highlightField, setHighlightField] = useState<string | null>(null);

  const getMissingEnquiryField = () => {
    if (needs.trim().length < 20) {
      return { step: 1, key: 'needs', label: 'Describe daily care needs in at least 20 characters', id: 'enquiry-field-needs' };
    }
    if (!startDate) {
      return { step: 2, key: 'startDate', label: 'Select expected start date', id: 'enquiry-field-start-date' };
    }
    if (!addressLine.trim()) {
      return { step: 3, key: 'addressLine', label: 'Enter house / flat number and street', id: 'enquiry-field-addr-line' };
    }
    if (!addressCity.trim()) {
      return { step: 3, key: 'addressCity', label: 'Enter your city', id: 'enquiry-field-addr-city' };
    }
    const pinRes = validatePinCode(addressPincode);
    if (!pinRes.ok) {
      return { step: 3, key: 'addressPincode', label: pinRes.message || 'Enter a valid 6-digit PIN code', id: 'enquiry-field-addr-pincode' };
    }
    return null;
  };

  useEffect(() => {
    if (preselectedAgencyId) setAgencyId(preselectedAgencyId);
    if (preselectedCareType) setCareType(preselectedCareType);
    if (preselectedShiftPattern) setShiftPattern(preselectedShiftPattern);
  }, [preselectedAgencyId, preselectedCareType, preselectedShiftPattern]);

  useEffect(() => {
    if (agencies && agencies.length > 0) {
      setAgenciesList(agencies);
      if (!agencyId) setAgencyId(agencies[0].id);
      return;
    }
    const pin = addressPincode;
    if (/^[1-9]\d{5}$/.test(pin)) {
      hcCatalogueApi(pin)
        .then(async (cat: any) => {
          const list = cat?.services || [];
          setNoneServes(list.length === 0 ? pin : null);
          if (list.length === 0) { setAgenciesList([]); setAgencyId(''); }
          const unique = Array.from(
            new Map(
              list
                .map((s: any) => [s.agency?.id || s.agency_id, { id: s.agency?.id || s.agency_id, name: s.agency?.name || s.agency_name }])
                .filter(([id]: any) => Boolean(id))
            ).values()
          ) as { id: string; name: string }[];
          if (unique.length > 0) {
            setAgenciesList(unique);
            setAgencyId((curr) => curr || unique[0].id);
          }
        })
        .catch(() => undefined);
    }
  }, [addressPincode, agencies, agencyId]);

  useEffect(() => {
    getMyUserId().then((id) => (id ? getFamilyMembersApi(id) : []))
      .then((m) => setFamilyMembers(Array.isArray(m) ? m : []))
      .catch(() => setFamilyMembers([]));

    getAddressesApi()
      .then((addrs) => {
        const def = addrs.find((a) => a.isDefault) || addrs[0];
        if (def) {
          setAddressLine((cur) => cur || def.addressLine1 || '');
          setAddressArea((cur) => cur || def.addressLine2 || '');
          setAddressCity((cur) => cur || def.city || '');
          setAddressPincode((cur) => cur || (def.pincode ? String(def.pincode) : ''));
          setAddressLandmark((cur) => cur || def.landmark || '');
          if ((def as any).pin) setHomePin((cur) => cur || (def as any).pin);
        }
      })
      .catch(() => undefined);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const missing = getMissingEnquiryField();
    if (missing) {
      if (missing.step !== step) {
        setStep(missing.step);
      }
      setTimeout(() => {
        const el = document.getElementById(missing.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLElement).focus?.();
          setHighlightField(missing.key);
          setTimeout(() => setHighlightField(null), 2500);
        }
      }, 50);
      return;
    }

    const targetAgencyId = agencyId || (agenciesList.length > 0 ? agenciesList[0].id : preselectedAgencyId);
    if (!targetAgencyId) {
      setError('Please select a healthcare agency for your area.');
      return;
    }
    if (needs.trim().length < 20) {
      setError('Please describe the patient care needs in at least 20 characters.');
      return;
    }
    const pinRes = validatePinCode(addressPincode);
    if (!pinRes.ok) {
      setError(pinRes.message);
      return;
    }
    if (!addressLine.trim() || !addressCity.trim()) {
      setError('Please provide the full street address and city.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        agency_id: targetAgencyId,
        care_type: careType,
        shift_pattern: shiftPattern,
        mobility,
        start_date: startDate,
        duration_days: Number(durationDays),
        conditions: conditions.trim() || undefined,
        needs: needs.trim(),
        language: language.trim() || undefined,
        preferred_gender: preferredGender,
        address: {
          line: addressLine.trim(),
          area: addressArea.trim() || undefined,
          city: addressCity.trim(),
          pincode: addressPincode.trim(),
          landmark: addressLandmark.trim() || undefined,
          ...(homePin ? { pin: homePin } : {}),
        },
      };

      if (familyMemberId) {
        payload.family_member_id = familyMemberId;
      }

      const result = await hcEnquireApi(payload);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' ') : msg || 'Unable to submit enquiry. Please verify all details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BookingDialog label="Book Long-Term Home Care" onClose={onClose} className="hcj-quote-dialog">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-white border-b border-slate-100 text-slate-900 p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider mb-1">
            <HeartHandshake className="w-4 h-4" />
            <span>Long-Term Care Planning (12h / 24h)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">Request a quote for long-term care</h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-lg">
            No instant automated matching. A clinical coordinator will call within 30 minutes to review needs and arrange a home assessment.
          </p>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s)}
                className={`flex-1 h-2 rounded-full transition ${
                  step >= s ? 'bg-amber-400' : 'bg-white/20'
                }`}
                aria-label={`Step ${s}`}
              />
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div role="alert" className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="break-words min-w-0">{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-x-2 border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Step 1 of 3: Your care needs</span>
                <span className="text-xs text-slate-400">Condition & Mobility</span>
              </div>

              {/* Patient / Family Member Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-teal-700" />
                  <span>Who is this care for?</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFamilyMemberId('')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                      !familyMemberId
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Self
                  </button>
                  {familyMembers.map((m) => (
                    <button
                      key={m.memberUserId}
                      type="button"
                      onClick={() => setFamilyMemberId(String(m.memberUserId))}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                        familyMemberId === String(m.memberUserId)
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {m.name || (m as any).fullName || 'Family Member'} ({m.relationship}{m.age != null ? `, ${m.age} y` : ''})
                    </button>
                  ))}
                </div>
              </div>

              {/* Agency Selection */}
              <div>
                <label htmlFor="lt-agency-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Healthcare Partner Agency
                </label>
                {agenciesList.length > 0 ? (
                  <select
                    id="lt-agency-select"
                    value={agencyId || (agenciesList[0]?.id || '')}
                    onChange={(e) => setAgencyId(e.target.value)}
                    data-testid="agency-select"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold text-slate-800 focus:ring-4 focus:ring-teal-600/10 focus:border-teal-600"
                    required
                  >
                    {agenciesList.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                  {!preselectedAgencyName && (
                    <label className="block">
                      <span className="text-xs font-bold text-slate-700">PIN code of the home</span>
                      <input
                        aria-label="PIN code of the home"
                        inputMode="numeric"
                        maxLength={6}
                        value={addressPincode}
                        onChange={(e) => setAddressPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit PIN code"
                        className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold text-slate-800"
                      />
                    </label>
                  )}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 break-words">{preselectedAgencyName || (noneServes ? `No home care agency serves PIN code ${noneServes} on Vizito yet. Check the PIN code, or try a nearby one.` : addressPincode ? 'Loading agencies serving your area…' : 'Enter the PIN code of the home to see agencies.')}</span>
                    <span className="text-[11px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md font-bold">Verified</span>
                  </div>
                  </div>
                )}
              </div>

              {/* Care Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  What kind of care is required?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CARE_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCareType(opt.id)}
                      className={`text-left p-3 rounded-2xl border transition ${
                        careType === opt.id
                          ? 'border-teal-600 bg-teal-50/70 text-teal-950 font-bold ring-2 ring-teal-600/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black">{opt.label}</div>
                      <div className="text-[11px] text-slate-500 font-normal mt-0.5 leading-snug">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobility */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Patient Mobility Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MOBILITY_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMobility(m.id)}
                      className={`text-left p-2.5 rounded-xl border transition ${
                        mobility === m.id
                          ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{m.label}</div>
                      <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">{m.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditions & Needs */}
              <div className="space-y-3">
                <div>
                  <label htmlFor="lt-conditions" className="block text-xs font-bold text-slate-700 mb-1">
                    Primary Medical Conditions (Optional)
                  </label>
                  <input
                    id="lt-conditions"
                    type="text"
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    placeholder="e.g. Post-stroke recovery (Jul 2026), Type-2 Diabetes, Hypertension"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                  />
                </div>

                <div>
                  <label htmlFor="enquiry-field-needs" className="block text-xs font-bold text-slate-700 mb-1">
                    Describe Patient's Daily Needs <span className="text-rose-600 font-bold">* (min 20 characters)</span>
                  </label>
                  <textarea
                    id="enquiry-field-needs"
                    rows={3}
                    value={needs}
                    onChange={(e) => setNeeds(e.target.value)}
                    placeholder="e.g. Father, 74, requires help bathing, diaper changing, feeding, and walking with support. Blood pressure and sugar checks twice daily."
                    className={`w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all duration-300 ${
                      highlightField === 'needs' ? 'ring-4 ring-amber-400 border-amber-500' : ''
                    }`}
                    required
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Minimum 20 characters required</span>
                    <span className={needs.trim().length >= 20 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {needs.trim().length} chars
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (needs.trim().length < 20) {
                      setError('Please describe daily needs in at least 20 characters before continuing.');
                      const el = document.getElementById('enquiry-field-needs');
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      (el as HTMLElement)?.focus?.();
                      setHighlightField('needs');
                      setTimeout(() => setHighlightField(null), 2500);
                      return;
                    }
                    setError(null);
                    setStep(2);
                  }}
                  className={`bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition ${
                    needs.trim().length < 20 ? 'opacity-60 cursor-pointer' : ''
                  }`}
                >
                  <span>Continue to Shift & Schedule</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                {needs.trim().length < 20 && (
                  <p role="alert" className="text-[11px] text-amber-800 font-medium text-right">Describe daily care needs in at least 20 characters</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-x-2 border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Step 2 of 3: Shift & Preferences</span>
                <span className="text-xs text-slate-400">Duration & Language</span>
              </div>

              {/* Shift Pattern */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Shift Timing Preference
                </label>
                <div className="space-y-2">
                  {SHIFT_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setShiftPattern(s.id)}
                      className={`w-full text-left p-3 rounded-2xl border transition flex items-center gap-3 ${
                        shiftPattern === s.id
                          ? 'border-teal-600 bg-teal-50/70 text-teal-950 font-bold ring-2 ring-teal-600/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="text-xl">{s.icon}</span>
                      <div className="flex-1">
                        <div className="text-xs font-bold">{s.label}</div>
                        <div className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">{s.hint}</div>
                      </div>
                      {shiftPattern === s.id && <CheckCircle2 className="w-5 h-5 text-teal-700" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="enquiry-field-start-date" className="block text-xs font-bold text-slate-700 mb-1">
                    Expected Start Date
                  </label>
                  <input
                    id="enquiry-field-start-date"
                    type="date"
                    value={startDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all duration-300 ${
                      highlightField === 'startDate' ? 'ring-4 ring-amber-400 border-amber-500' : ''
                    }`}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="lt-duration" className="block text-xs font-bold text-slate-700 mb-1">
                    Care Duration
                  </label>
                  <select
                    id="lt-duration"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                  >
                    <option value={7}>1 Week (7 shifts trial)</option>
                    <option value={14}>2 Weeks (14 shifts cycle)</option>
                    <option value={30}>1 Month (30 shifts continuous)</option>
                    <option value={60}>2 Months (60 shifts)</option>
                    <option value={90}>3 Months (90 shifts)</option>
                  </select>
                </div>
              </div>

              {/* Preferences: Gender & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preferred Caregiver Gender
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'FEMALE', label: 'Female' },
                      { id: 'MALE', label: 'Male' },
                      { id: 'ANY', label: 'Any' },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setPreferredGender(g.id as any)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition ${
                          preferredGender === g.id
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="lt-language" className="block text-xs font-bold text-slate-700 mb-1">
                    Spoken Languages
                  </label>
                  <input
                    id="lt-language"
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="e.g. Telugu, Hindi, English"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition"
                >
                  Back
                </button>
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!startDate) {
                        const el = document.getElementById('enquiry-field-start-date');
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        (el as HTMLElement)?.focus?.();
                        setHighlightField('startDate');
                        setTimeout(() => setHighlightField(null), 2500);
                        return;
                      }
                      setStep(3);
                    }}
                    className={`bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition ${
                      !startDate ? 'opacity-60 cursor-pointer' : ''
                    }`}
                  >
                    <span>Continue to Address</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {!startDate && (
                    <p role="alert" className="text-[11px] text-amber-800 font-medium text-right">Select expected start date</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-x-2 border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Step 3 of 3: Service Address</span>
                <span className="text-xs text-slate-400">Home Location</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="enquiry-field-addr-line" className="block text-xs font-bold text-slate-700 mb-1">
                    House / Flat No., Apartment Name, Street <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="enquiry-field-addr-line"
                    type="text"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="e.g. Flat 302, Sai Balaji Enclave, Road No. 4"
                    className={`w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all duration-300 ${
                      highlightField === 'addressLine' ? 'ring-4 ring-amber-400 border-amber-500' : ''
                    }`}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="lt-addr-area" className="block text-xs font-bold text-slate-700 mb-1">Area / Locality</label>
                    <input
                      id="lt-addr-area"
                      type="text"
                      value={addressArea}
                      onChange={(e) => setAddressArea(e.target.value)}
                      placeholder="e.g. Madhapur"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                    />
                  </div>
                  <div>
                    <label htmlFor="enquiry-field-addr-city" className="block text-xs font-bold text-slate-700 mb-1">City <span className="text-rose-600">*</span></label>
                    <input
                      id="enquiry-field-addr-city"
                      type="text"
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      placeholder="e.g. Hyderabad"
                      className={`w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all duration-300 ${
                        highlightField === 'addressCity' ? 'ring-4 ring-amber-400 border-amber-500' : ''
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="enquiry-field-addr-pincode" className="block text-xs font-bold text-slate-700 mb-1">PIN Code (6 digits) <span className="text-rose-600">*</span></label>
                    <input
                      id="enquiry-field-addr-pincode"
                      type="text"
                      value={addressPincode}
                      onChange={(e) => setAddressPincode(e.target.value)}
                      placeholder="e.g. 500081"
                      maxLength={6}
                      className={`w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all duration-300 ${
                        highlightField === 'addressPincode' ? 'ring-4 ring-amber-400 border-amber-500' : ''
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lt-addr-landmark" className="block text-xs font-bold text-slate-700 mb-1">Landmark (Optional)</label>
                    <input
                      id="lt-addr-landmark"
                      type="text"
                      value={addressLandmark}
                      onChange={(e) => setAddressLandmark(e.target.value)}
                      placeholder="e.g. Near Metro Pillar 14"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2"><HomePinField value={homePin} onChange={setHomePin} who="care manager and caregiver" /></div>
              </div>

              {/* Service SLA Callout */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <b className="block">Care Coordinator Call Commitment</b>
                  <p className="mt-0.5 text-amber-800 text-[11px] leading-relaxed">
                    Once submitted, our clinical care manager calls you within <b>30 minutes</b> to assess patient acuity, calculate rates, and schedule the home visit before any payment is taken.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition"
                >
                  Back
                </button>
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="submit"
                    disabled={loading}
                    aria-disabled={Boolean(getMissingEnquiryField())}
                    data-testid="submit-enquiry-btn"
                    className={`bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition ${
                      Boolean(getMissingEnquiryField()) || loading ? 'opacity-50 cursor-pointer' : ''
                    }`}
                  >
                    {loading ? 'Submitting Enquiry...' : 'Submit Care Enquiry'}
                  </button>
                  {getMissingEnquiryField() && (
                    <p role="alert" className="text-[11px] text-amber-800 font-medium text-right max-w-[220px] text-wrap">
                      {getMissingEnquiryField()?.label}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </BookingDialog>
  );
}
