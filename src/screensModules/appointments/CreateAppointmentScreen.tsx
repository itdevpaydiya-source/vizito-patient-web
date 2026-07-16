import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  Calendar,
  Clock,
  Building2,
  Video,
  Phone,
  FileText,
  MapPin,
  User,
  Stethoscope,
  CreditCard,
  MessageSquare,
  Bell,
  Lock,
  ExternalLink,
  Check,
  Search,
} from 'lucide-react';

// ─── Mock data ────────────────────────────────────────────────────────────────
const CLINICS = ['Banjarahills Clinic', 'Kukatpally Clinic', 'Secunderabad Clinic'];
const CONSULTATION_TYPES = ['In-Clinic Consultation', 'Video Consultation', 'Home Visit'];
const DURATIONS = ['15 Minutes', '30 Minutes', '45 Minutes', '60 Minutes'];
const PAYMENT_MODES = ['Patient Pays Online', 'Pay at Clinic', 'Insurance', 'Free Consultation'];
const TIMES = ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM','05:00 PM'];

const SEARCH_PATIENTS = [
  { id: 'PAT123456', name: 'Amit Sharma', phone: '+91 98765 43210', initials: 'AS', color: 'bg-teal-100 text-teal-700' },
  { id: 'PAT123457', name: 'Neha Singh', phone: '+91 87654 32109', initials: 'NS', color: 'bg-pink-100 text-pink-700' },
  { id: 'PAT123458', name: 'Vikram Patel', phone: '+91 76543 21098', initials: 'VP', color: 'bg-blue-100 text-blue-700' },
];

// ─── Summary Row ──────────────────────────────────────────────────────────────
const SummaryRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
    <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
      <Icon className="w-3.5 h-3.5 text-slate-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide leading-none mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  </div>
);

// ─── Field Label ──────────────────────────────────────────────────────────────
const FieldLabel = ({ text, required }: { text: string; required?: boolean }) => (
  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
    {text}{required && <span className="text-rose-500 ml-0.5">*</span>}
  </label>
);

// ─── Select Field ─────────────────────────────────────────────────────────────
const SelectField = ({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all ${value ? 'text-slate-800 font-medium' : 'text-slate-400'}`}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
  </div>
);

// ─── Step Badge ───────────────────────────────────────────────────────────────
const StepBadge = ({ num, label }: { num: string; label: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-7 h-7 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
      {num}
    </div>
    <h2 className="text-base font-bold text-slate-800">{label}</h2>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CreateAppointmentScreen() {
  const navigate = useNavigate();

  // Patient
  const [patientType, setPatientType] = useState<'existing' | 'new'>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(SEARCH_PATIENTS[0]);
  const [mobileNumber, setMobileNumber] = useState('');

  // Appointment Details
  const [location, setLocation] = useState('Banjarahills Clinic');
  const [consultationType, setConsultationType] = useState('In-Clinic Consultation');
  const [provider] = useState('Dr. Arjun Reddy');
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [appointmentTime, setAppointmentTime] = useState('11:30 AM');
  const [duration, setDuration] = useState('30 Minutes');
  const [mode, setMode] = useState<'in-clinic' | 'online'>('in-clinic');
  const [reason, setReason] = useState('');

  // Additional
  const [fee, setFee] = useState('800');
  const [paymentMode, setPaymentMode] = useState('Patient Pays Online');
  const [notes, setNotes] = useState('');
  const [sendSMS, setSendSMS] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  const filteredPatients = SEARCH_PATIENTS.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formattedDate = appointmentDate
    ? new Date(appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="space-y-5 pb-10">
      {/* ─── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Create Appointment</h1>
          <nav className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
            <button onClick={() => navigate('/appointments')} className="hover:text-teal-600 transition-colors font-medium">
              Appointment Management
            </button>
            <span>›</span>
            <span className="text-slate-600 font-medium">Create Appointment</span>
          </nav>
        </div>
        <button
          onClick={() => navigate('/appointments')}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Appointments
        </button>
      </div>

      {/* ─── Main Layout ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── Left: Form ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-4">

          {/* ── Section 1: Patient Information ──────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <StepBadge num="1" label="Patient Information" />

            {/* Patient Type Toggle */}
            <div className="flex items-center gap-6 mb-5">
              {(['existing', 'new'] as const).map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer group">
                  <div
                    onClick={() => setPatientType(type)}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                      patientType === type ? 'border-teal-600 bg-teal-600' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {patientType === type && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span
                    onClick={() => setPatientType(type)}
                    className={`text-sm font-semibold cursor-pointer ${patientType === type ? 'text-slate-800' : 'text-slate-500'}`}
                  >
                    {type === 'existing' ? 'Existing Patient' : 'New Patient'}
                  </span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Search Patient */}
              <div className="relative">
                <FieldLabel text="Search Patient" required />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery || (selectedPatient ? selectedPatient.name : '')}
                    onChange={e => { setSearchQuery(e.target.value); setShowPatientDropdown(true); }}
                    onFocus={() => setShowPatientDropdown(true)}
                    placeholder="Search by name, mobile number or Patient ID..."
                    className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Patient Dropdown */}
                {showPatientDropdown && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => { setShowPatientDropdown(false); setSearchQuery(''); }} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-30 overflow-hidden">
                      {filteredPatients.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedPatient(p); setShowPatientDropdown(false); setSearchQuery(''); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${p.color}`}>
                            {p.initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                            <p className="text-[11px] text-slate-400">{p.phone} • {p.id}</p>
                          </div>
                          {selectedPatient?.id === p.id && <Check className="w-4 h-4 text-teal-600 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <FieldLabel text="Mobile Number" />
                <input
                  type="tel"
                  value={mobileNumber || (selectedPatient?.phone ?? '')}
                  onChange={e => setMobileNumber(e.target.value)}
                  placeholder="Enter mobile number"
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Appointment Details ───────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <StepBadge num="2" label="Appointment Details" />

            {/* Row 1: Location, Consultation Type, Provider */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <FieldLabel text="Location" required />
                <SelectField value={location} onChange={setLocation} options={CLINICS} placeholder="Select Location" />
              </div>
              <div>
                <FieldLabel text="Consultation Type" required />
                <SelectField value={consultationType} onChange={setConsultationType} options={CONSULTATION_TYPES} placeholder="Select Consultation Type" />
              </div>
              <div>
                <FieldLabel text="Provider" required />
                <div className="relative">
                  <select
                    value={provider}
                    disabled
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-9 text-sm text-slate-700 font-medium focus:outline-none cursor-not-allowed"
                  >
                    <option>{provider}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2: Date, Time, Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div>
                <FieldLabel text="Appointment Date" required />
                <div className="relative">
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={e => setAppointmentDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                  />
                </div>
              </div>
              <div>
                <FieldLabel text="Appointment Time" required />
                <SelectField value={appointmentTime} onChange={setAppointmentTime} options={TIMES} placeholder="Select time" />
              </div>
              <div>
                <FieldLabel text="Duration" />
                <SelectField value={duration} onChange={setDuration} options={DURATIONS} placeholder="Select duration" />
              </div>
            </div>

            {/* Appointment Mode */}
            <div className="mb-5">
              <FieldLabel text="Appointment Mode" required />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('in-clinic')}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    mode === 'in-clinic'
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${mode === 'in-clinic' ? 'bg-teal-100' : 'bg-slate-100'}`}>
                    <Building2 className={`w-5 h-5 ${mode === 'in-clinic' ? 'text-teal-700' : 'text-slate-400'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-bold ${mode === 'in-clinic' ? 'text-teal-800' : 'text-slate-700'}`}>In-Clinic</p>
                    <p className={`text-[11px] ${mode === 'in-clinic' ? 'text-teal-600' : 'text-slate-400'}`}>Patient will visit clinic</p>
                  </div>
                </button>

                <button
                  onClick={() => setMode('online')}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    mode === 'online'
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${mode === 'online' ? 'bg-teal-100' : 'bg-slate-100'}`}>
                    <Video className={`w-5 h-5 ${mode === 'online' ? 'text-teal-700' : 'text-slate-400'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-bold ${mode === 'online' ? 'text-teal-800' : 'text-slate-700'}`}>Online (Video Call)</p>
                    <p className={`text-[11px] ${mode === 'online' ? 'text-teal-600' : 'text-slate-400'}`}>Consultation via video</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Reason for Visit */}
            <div>
              <FieldLabel text="Reason for Visit" />
              <div className="relative">
                <textarea
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value.slice(0, 250))}
                  placeholder="Enter reason for visit (optional)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 resize-none"
                />
                <span className="absolute bottom-2.5 right-3 text-[10px] text-slate-400">{reason.length}/250</span>
              </div>
            </div>
          </div>

          {/* ── Section 3: Additional Information ───────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <StepBadge num="3" label="Additional Information" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {/* Fee */}
              <div>
                <FieldLabel text="Appointment Fee (₹)" required />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    value={fee}
                    onChange={e => setFee(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <FieldLabel text="Payment Mode" />
                <SelectField value={paymentMode} onChange={setPaymentMode} options={PAYMENT_MODES} placeholder="Select payment mode" />
              </div>

              {/* Notes */}
              <div>
                <FieldLabel text="Notes (Internal)" />
                <div className="relative">
                  <textarea
                    rows={1}
                    value={notes}
                    onChange={e => setNotes(e.target.value.slice(0, 250))}
                    placeholder="Add any notes (optional)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 resize-none"
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-slate-400">{notes.length}/250</span>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <FieldLabel text="Send Notifications To" />
              <div className="flex items-center gap-5">
                {[
                  { id: 'sms', label: 'Send SMS', value: sendSMS, set: setSendSMS },
                  { id: 'email', label: 'Send Email', value: sendEmail, set: setSendEmail },
                  { id: 'whatsapp', label: 'Send WhatsApp', value: sendWhatsApp, set: setSendWhatsApp },
                ].map(n => (
                  <label key={n.id} className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => n.set(!n.value)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                        n.value ? 'bg-teal-600 border-teal-600' : 'bg-white border-slate-300'
                      }`}
                    >
                      {n.value && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{n.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Summary Sidebar ──────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-5">

          {/* Patient Summary */}
          {selectedPatient && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Patient Summary</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${selectedPatient.color}`}>
                  {selectedPatient.initials}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">{selectedPatient.name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{selectedPatient.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{selectedPatient.id}</span>
                  </div>
                </div>
              </div>
              <button className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                View Profile
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Appointment Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Appointment Summary</h3>

            <div className="space-y-0">
              <SummaryRow icon={MapPin} label="Location" value={location || '—'} />
              <SummaryRow icon={Stethoscope} label="Consultation Type" value={consultationType || '—'} />
              <SummaryRow icon={User} label="Provider" value={provider} />
              <SummaryRow icon={Calendar} label="Date & Time" value={`${formattedDate}, ${appointmentTime}`} />
              <SummaryRow icon={Clock} label="Duration" value={duration || '—'} />
              <SummaryRow icon={mode === 'in-clinic' ? Building2 : Video} label="Mode" value={mode === 'in-clinic' ? 'In-Clinic' : 'Online (Video)'} />
              <SummaryRow icon={CreditCard} label="Fee" value={fee ? `₹${fee}` : '—'} />
              <SummaryRow icon={CreditCard} label="Payment Mode" value={paymentMode || '—'} />
              {reason && <SummaryRow icon={MessageSquare} label="Reason for Visit" value={reason} />}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <button
              onClick={() => {
                // ── Build display date string ("DD MMM YYYY") ──
                const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const dateParts = appointmentDate.split('-');
                const displayDate = dateParts.length === 3
                  ? `${parseInt(dateParts[2], 10)} ${MONTHS[parseInt(dateParts[1], 10) - 1]} ${dateParts[0]}`
                  : appointmentDate;

                // ── Map consultation type ──
                const typeMap: Record<string, string> = {
                  'In-Clinic Consultation': 'In-Clinic',
                  'Video Consultation': 'Video Consultation',
                  'Home Visit': 'Home Visit',
                };
                const mappedType = (typeMap[consultationType] ?? consultationType) as
                  'Walk-In' | 'In-Clinic' | 'Video Consultation' | 'Home Visit';

                // ── Map payment mode ──
                const paymentStatusMap: Record<string, string> = {
                  'Patient Pays Online': 'Pending',
                  'Pay at Clinic': 'Pending',
                  'Insurance': 'Pending',
                  'Free Consultation': 'Waived',
                };
                const paymentStatus = (paymentStatusMap[paymentMode] ?? 'Pending') as
                  'Paid' | 'Pending' | 'Waived';

                // ── Generate a unique ID ──
                const existing: any[] = (() => {
                  try { return JSON.parse(localStorage.getItem('vizito_appointments') ?? '[]'); }
                  catch { return []; }
                })();
                const maxId = existing.reduce((max: number, a: any) => {
                  const num = parseInt((a.id ?? '').replace(/\D/g, ''), 10);
                  return isNaN(num) ? max : Math.max(max, num);
                }, 0);
                const newId = `APT-${new Date().getFullYear()}-${String(maxId + 1).padStart(4, '0')}`;

                // ── Build patient initials ──
                const nameParts = selectedPatient?.name?.split(' ') ?? ['?'];
                const initials = nameParts.length >= 2
                  ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
                  : nameParts[0][0] ?? '?';

                const COLORS = [
                  'bg-teal-100 text-teal-700', 'bg-pink-100 text-pink-700',
                  'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700',
                  'bg-amber-100 text-amber-700', 'bg-green-100 text-green-700',
                ];
                const avatarColor = COLORS[maxId % COLORS.length];

                // ── Assemble new appointment ──
                const newAppointment = {
                  id: newId,
                  patient: selectedPatient?.name ?? 'Unknown',
                  initials: initials.toUpperCase(),
                  avatarColor,
                  gender: 'M' as const,
                  age: 0,
                  patientId: selectedPatient?.id ?? 'N/A',
                  phone: mobileNumber || selectedPatient?.phone || '',
                  date: displayDate,
                  time: appointmentTime,
                  type: mappedType,
                  location,
                  status: 'Confirmed' as const,
                  paymentStatus,
                  amount: parseInt(fee, 10) || 0,
                  reason,
                  notes,
                  timeline: [
                    { label: 'Appointment Created', time: new Date().toLocaleString() }
                  ],
                  documents: [],
                };

                // ── Persist to localStorage ──
                const updated = [...existing, newAppointment];
                localStorage.setItem('vizito_appointments', JSON.stringify(updated));

                navigate('/appointments');
              }}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white py-3 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              Create Appointment
            </button>
            <button
              onClick={() => navigate('/appointments')}
              className="w-full py-3 rounded-xl text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2 pt-1">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <p className="text-[11px] text-slate-400">This appointment will be saved and shared with the patient.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
