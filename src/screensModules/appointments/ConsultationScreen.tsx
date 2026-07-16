import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, MoreVertical,
  Bold, Italic, Underline, List, ListOrdered, Link2, Image,
  ChevronDown, Search, Plus, Upload,
  ShieldCheck, Wifi, Printer, Save,
  CheckCircle2, Stethoscope, FileText, FlaskConical, CalendarPlus,
  Pencil, Flame, Droplet, Ruler, Weight, Heart, ChevronRight,
  Activity, Thermometer, Wind,
  Square,
} from 'lucide-react';

// ─── Mock appointment data ────────────────────────────────────────────────────
const APPOINTMENT = {
  id: 'APT-2025-0001',
  date: '28 May 2025',
  time: '11:30 AM',
  duration: '30 Mins',
  fee: '₹800',
  paymentStatus: 'Paid',
  type: 'In-Clinic Consultation',
  patient: {
    name: 'Amit Sharma',
    initials: 'AS',
    avatarColor: 'bg-teal-100 text-teal-700',
    age: 32,
    gender: 'Male',
    phone: '+91 98765 43210',
    email: 'amit.sharma@email.com',
    patientId: 'PAT123456',
    allergies: 'Penicillin',
    bloodGroup: 'B+',
    height: '175 cm',
    weight: '72 kg',
    maritalStatus: 'Married',
  },
  chiefComplaint: 'Chest pain and breathlessness since last 3 days.',
  historyOfPresentIllness: 'Patient reports mild chest pain on exertion associated with shortness of breath. No palpitations or dizziness. Symptoms started 3 days ago. No fever or cough.',
  vitals: {
    bp: '120/80 mmHg',
    pulse: '78 bpm',
    temp: '98.4 °F',
    rr: '18/min',
    spo2: '98%',
    weight: '72 kg',
  },
};

const RECENT_DIAGNOSES = [
  { code: 'I10', desc: 'Essential (primary) hypertension' },
  { code: 'E11.9', desc: 'Type 2 diabetes mellitus without complications' },
  { code: 'J20.9', desc: 'Acute bronchitis, unspecified' },
  { code: 'R07.9', desc: 'Chest pain, unspecified' },
];

const TABS = ['Consultation', 'Medical History', 'Prescriptions', 'Documents', 'Lab Reports', 'Follow-Ups', 'Billing'];

// ─── Timer Hook ───────────────────────────────────────────────────────────────
const useTimer = (initialSeconds = 1104) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// ─── Toolbar Button ───────────────────────────────────────────────────────────
const ToolBtn = ({ icon: Icon, onClick }: { icon: React.ElementType; onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
  >
    <Icon className="w-3.5 h-3.5" />
  </button>
);

// ─── Vitals Card ─────────────────────────────────────────────────────────────
const VitalItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
    <p className="text-sm font-bold text-slate-800 mt-0.5">{value}</p>
  </div>
);

// ─── Sidebar Row ─────────────────────────────────────────────────────────────
const SidebarRow = ({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) => (
  <div className="flex items-center justify-between py-1.5">
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 bg-slate-50 rounded-md flex items-center justify-center shrink-0">
        <div className="w-2 h-2 rounded-full bg-slate-300" />
      </div>
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
    <span className={`text-xs font-bold ${valueClass || 'text-slate-700'}`}>{value}</span>
  </div>
);

// ─── Placeholder Tab ──────────────────────────────────────────────────────────
const PlaceholderTab = ({ label }: { label: string }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
    <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
    <p className="text-base font-bold text-slate-500">{label}</p>
    <p className="text-sm text-slate-400 mt-1">Content will appear here during consultation.</p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ConsultationScreen() {
  const navigate = useNavigate();
  const { appointmentId } = useParams();
  const timer = useTimer();

  const [activeTab, setActiveTab] = useState('Consultation');
  const [notes, setNotes] = useState('');
  const [plan, setPlan] = useState('');
  const [diagSearch, setDiagSearch] = useState('');
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [showHistoryMore, setShowHistoryMore] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // ── Load real appointment from localStorage ──────────────────────────────
  const [liveApt, setLiveApt] = useState<any | null>(null);

  useEffect(() => {
    try {
      const all: any[] = JSON.parse(localStorage.getItem('vizito_appointments') ?? '[]');
      const found = all.find((a: any) => a.id === appointmentId) ?? null;
      if (found) {
        setLiveApt(found);
        // Pre-populate fields from previously saved consultation data
        setNotes(found.clinicalNotes ?? '');
        setPlan(found.plan ?? '');
        setSelectedDiagnoses(found.diagnosesCodes ?? []);
      }
    } catch {
      // fall back to mock data
    }
  }, [appointmentId]);

  // ── Helper: save consultation data to localStorage ───────────────────────
  const saveConsultationData = (markCompleted = false) => {
    try {
      const all: any[] = JSON.parse(localStorage.getItem('vizito_appointments') ?? '[]');
      const updated = all.map((a: any) => {
        if (a.id !== appointmentId) return a;
        const timelineEntry = markCompleted
          ? { label: 'Consultation Completed', time: new Date().toLocaleString() }
          : { label: 'Consultation Draft Saved', time: new Date().toLocaleString() };
        return {
          ...a,
          clinicalNotes: notes,
          plan,
          diagnosesCodes: selectedDiagnoses,
          diagnosis: selectedDiagnoses.join(', '),
          status: markCompleted ? 'Completed' : (a.status === 'Pending' ? 'Consultation Started' : a.status),
          timeline: [...(a.timeline ?? []), timelineEntry],
        };
      });
      localStorage.setItem('vizito_appointments', JSON.stringify(updated));
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch {
      // silently ignore
    }
  };

  // Use live appointment if found, otherwise fall back to mock
  const apt = liveApt ?? APPOINTMENT;
  const p = liveApt
    ? {
        name: liveApt.patient ?? 'Unknown',
        initials: liveApt.initials ?? '?',
        avatarColor: liveApt.avatarColor ?? 'bg-slate-100 text-slate-600',
        age: liveApt.age ?? 0,
        gender: liveApt.gender === 'M' ? 'Male' : liveApt.gender === 'F' ? 'Female' : 'Unknown',
        phone: liveApt.phone ?? '',
        email: '',
        patientId: liveApt.patientId ?? '',
        allergies: 'N/A',
        bloodGroup: 'N/A',
        height: 'N/A',
        weight: 'N/A',
        maritalStatus: 'N/A',
      }
    : APPOINTMENT.patient;

  const toggleDiagnosis = (code: string) => {
    setSelectedDiagnoses(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const filteredDiagnoses = RECENT_DIAGNOSES.filter(d =>
    d.desc.toLowerCase().includes(diagSearch.toLowerCase()) ||
    d.code.toLowerCase().includes(diagSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full -mt-5 -mx-5 lg:-mx-8">
      {/* ─── Top Header Bar ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-col gap-3">
        {/* Row 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={() => navigate('/appointments')}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 font-medium transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4 hidden sm:block" />
              <span className="hidden sm:inline">Back</span>
              <span className="sm:hidden"><ArrowLeft className="w-5 h-5" /></span>
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-extrabold text-slate-800">Consultation in Progress</h1>
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-3 py-1">
                {apt.type}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setShowEndModal(true)}
              className="flex items-center gap-2 border-2 border-rose-300 text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-rose-500" />
              End Consultation
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Apt Info */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 font-medium mt-1">
          <span className="font-mono font-bold text-slate-700">ID: {apt.id}</span>
          <span className="flex items-center gap-1">📅 {apt.date}, {apt.time}</span>
          <span className="flex items-center gap-1">⏱ {apt.duration}</span>
          <span>Fee: <span className="font-bold text-slate-700">{apt.fee}</span></span>
          <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-bold text-[11px]">
            {apt.paymentStatus}
          </span>
        </div>
      </div>

      {/* ─── Patient Info Bar ─────────────────────────────────────────────── */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 ${p.avatarColor}`}>
            {p.initials}
          </div>
          <div className="flex-1 min-w-0 sm:hidden block">
            <h2 className="text-base font-extrabold text-slate-800">{p.name}</h2>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5 inline-block mt-1">
              Existing Patient
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="hidden sm:flex items-center gap-3">
            <h2 className="text-base font-extrabold text-slate-800">{p.name}</h2>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
              Existing Patient
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
            <span>👤 {p.age} Years, {p.gender}</span>
            <span>📞 {p.phone}</span>
            <span>✉ {p.email}</span>
            <span>🪪 {p.patientId}</span>
          </div>
        </div>
        <button
          onClick={() => navigate(`/patients/${p.patientId}`)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded-xl transition-colors shrink-0"
        >
          View Full Profile
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ─── Tab Nav ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 flex items-end overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {activeTab !== 'Consultation' ? (
          <div className="flex-1 p-6">
            <PlaceholderTab label={activeTab} />
          </div>
        ) : (
          <>
            {/* Left: Form Area */}
            <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-5">

              {/* Clinical Notes */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-800">Clinical Notes</h3>
                </div>
                {/* Toolbar */}
                <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 flex-wrap">
                  <select className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 mr-2 focus:outline-none">
                    <option>Normal</option>
                    <option>Heading 1</option>
                    <option>Heading 2</option>
                  </select>
                  <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2 mr-1">
                    <ToolBtn icon={Bold} />
                    <ToolBtn icon={Italic} />
                    <ToolBtn icon={Underline} />
                  </div>
                  <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2 mr-1">
                    <ToolBtn icon={List} />
                    <ToolBtn icon={ListOrdered} />
                  </div>
                  <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2 mr-1">
                    <ToolBtn icon={Link2} />
                    <ToolBtn icon={Image} />
                  </div>
                  <div className="ml-auto">
                    <button className="flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1 hover:bg-teal-100 transition-colors">
                      Templates
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value.slice(0, 5000))}
                    placeholder="Start typing your clinical notes..."
                    rows={8}
                    className="w-full px-5 py-4 text-sm text-slate-700 placeholder-slate-300 focus:outline-none resize-none"
                  />
                  <span className="absolute bottom-3 right-4 text-[11px] text-slate-300">{notes.length}/5000</span>
                </div>
              </div>

              {/* Diagnosis + Plan Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Diagnosis */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-sm font-bold text-slate-800">Diagnosis</h3>
                  </div>
                  <div className="p-4">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search diagnosis..."
                        value={diagSearch}
                        onChange={e => setDiagSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                      />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Recent Diagnosis</p>
                    <div className="space-y-1">
                      {filteredDiagnoses.map(d => (
                        <button
                          key={d.code}
                          onClick={() => toggleDiagnosis(d.code)}
                          className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                            selectedDiagnoses.includes(d.code)
                              ? 'bg-teal-50 border border-teal-200 text-teal-800'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                            selectedDiagnoses.includes(d.code) ? 'bg-teal-600 border-teal-600' : 'border-slate-300'
                          }`}>
                            {selectedDiagnoses.includes(d.code) && (
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div>
                            <span className="text-[11px] font-mono font-bold text-teal-600">{d.code}</span>
                            <span className="text-xs text-slate-600 ml-2">{d.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-slate-500 hover:text-teal-700 py-2.5 rounded-xl text-sm font-semibold transition-all">
                      <Plus className="w-4 h-4" />
                      Add Diagnosis
                    </button>
                  </div>
                </div>

                {/* Plan */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-sm font-bold text-slate-800">Plan</h3>
                  </div>
                  <div className="p-4">
                    {/* Mini toolbar */}
                    <div className="flex items-center gap-0.5 mb-3 pb-3 border-b border-slate-100">
                      <ToolBtn icon={Bold} />
                      <ToolBtn icon={Italic} />
                      <ToolBtn icon={List} />
                      <ToolBtn icon={ListOrdered} />
                    </div>
                    <div className="relative">
                      <textarea
                        value={plan}
                        onChange={e => setPlan(e.target.value.slice(0, 2000))}
                        placeholder="Enter treatment plan, advice, next steps..."
                        rows={8}
                        className="w-full text-sm text-slate-700 placeholder-slate-300 focus:outline-none resize-none"
                      />
                      <span className="absolute bottom-1 right-1 text-[11px] text-slate-300">{plan.length}/2000</span>
                    </div>
                  </div>

                  {/* Attachments */}
                  <div className="px-4 pb-4">
                    <p className="text-xs font-bold text-slate-600 mb-2">Attachments <span className="text-slate-400 font-normal">(Optional)</span></p>
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => { e.preventDefault(); setDragOver(false); }}
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                        dragOver ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <Upload className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-medium">
                        Drag & drop files here or{' '}
                        <button className="text-teal-600 font-bold hover:underline">browse</button>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Supports: PDF, JPG, PNG (Max 10MB each)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Sidebar */}
            <div className="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white overflow-y-auto flex flex-col">
              <div className="flex-1 p-4 space-y-4">

                {/* Patient Summary */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-sm font-bold text-slate-800">Patient Summary</h3>
                    <button
                      onClick={() => navigate(`/patients/${p.patientId}`)}
                      className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                    >
                      Edit <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-0">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-rose-50 rounded-md flex items-center justify-center"><Flame className="w-3 h-3 text-rose-500" /></div>
                        <span className="text-xs text-slate-500">Allergies</span>
                      </div>
                      <span className="text-xs font-bold text-rose-600">{p.allergies}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-red-50 rounded-md flex items-center justify-center"><Droplet className="w-3 h-3 text-red-500" /></div>
                        <span className="text-xs text-slate-500">Blood Group</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700">{p.bloodGroup}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-blue-50 rounded-md flex items-center justify-center"><Ruler className="w-3 h-3 text-blue-500" /></div>
                        <span className="text-xs text-slate-500">Height</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700">{p.height}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-purple-50 rounded-md flex items-center justify-center"><Weight className="w-3 h-3 text-purple-500" /></div>
                        <span className="text-xs text-slate-500">Weight</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700">{p.weight}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-pink-50 rounded-md flex items-center justify-center"><Heart className="w-3 h-3 text-pink-500" /></div>
                        <span className="text-xs text-slate-500">Marital Status</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700">{p.maritalStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Chief Complaint */}
                <div className="bg-slate-50 rounded-xl p-3">
                  <h4 className="text-xs font-bold text-slate-700 mb-1.5">Chief Complaint</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{apt.chiefComplaint}</p>
                </div>

                {/* History of Present Illness */}
                <div className="bg-slate-50 rounded-xl p-3">
                  <h4 className="text-xs font-bold text-slate-700 mb-1.5">History of Present Illness</h4>
                  <p className={`text-xs text-slate-600 leading-relaxed ${showHistoryMore ? '' : 'line-clamp-3'}`}>
                    {apt.historyOfPresentIllness}
                  </p>
                  <button
                    onClick={() => setShowHistoryMore(!showHistoryMore)}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 mt-1.5 flex items-center gap-1"
                  >
                    {showHistoryMore ? 'Show Less ↑' : 'View More ↓'}
                  </button>
                </div>

                {/* Vitals */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-700">Vitals (Today)</h4>
                    <button className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Vitals
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-3 gap-3">
                    <VitalItem label="BP" value={apt.vitals.bp} />
                    <VitalItem label="Pulse" value={apt.vitals.pulse} />
                    <VitalItem label="Temperature" value={apt.vitals.temp} />
                    <VitalItem label="Resp. Rate" value={apt.vitals.rr} />
                    <VitalItem label="SpO2" value={apt.vitals.spo2} />
                    <VitalItem label="Weight" value={apt.vitals.weight} />
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Quick Actions</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: FileText, label: 'Create Prescription', color: 'bg-teal-50 text-teal-700' },
                      { icon: FlaskConical, label: 'Order Lab Test', color: 'bg-blue-50 text-blue-700' },
                      { icon: CalendarPlus, label: 'Add Follow-Up', color: 'bg-purple-50 text-purple-700' },
                    ].map(action => (
                      <button
                        key={action.label}
                        className="flex flex-col items-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all group"
                      >
                        <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                          <action.icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 text-center leading-tight">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Secure Footer */}
              <div className="border-t border-slate-100 p-4">
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-teal-700">Secure Consultation</span>
                  </div>
                  <p className="text-[10px] text-teal-600 leading-relaxed">Your consultation is private and encrypted end-to-end.</p>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-teal-600">Connected Securely</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Bottom Action Bar ────────────────────────────────────────────── */}
      <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 sm:pb-4">
        <div className="flex items-center justify-center gap-2 order-2 sm:order-1">
          <CheckCircle2 className={`w-4 h-4 transition-colors ${savedToast ? 'text-teal-600' : 'text-slate-300'}`} />
          <span className={`text-xs font-medium transition-colors ${savedToast ? 'text-teal-600' : 'text-slate-400'}`}>
            {savedToast ? 'Saved successfully!' : 'Unsaved changes'}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto order-1 sm:order-2">
          <button
            onClick={() => saveConsultationData(false)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          >
            <Save className="w-4 h-4" />
            Save as Draft
          </button>
          <button className="flex items-center gap-2 text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold transition-all">
            <Printer className="w-4 h-4" />
            Print Notes
          </button>
          <button
            onClick={() => { saveConsultationData(true); setTimeout(() => navigate('/appointments'), 600); }}
            className="flex items-center justify-center w-full sm:w-auto gap-2 bg-teal-700 hover:bg-teal-800 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <div className="text-left hidden sm:block">
              <div>Complete Consultation</div>
              <div className="text-[10px] opacity-80 font-normal">Finish and share with patient</div>
            </div>
            <span className="sm:hidden block">Complete Consultation</span>
          </button>
        </div>
      </div>

      {/* ─── End Consultation Modal ───────────────────────────────────────── */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Square className="w-6 h-6 text-rose-500 fill-rose-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1">End Consultation?</h3>
            <p className="text-sm text-slate-500 text-center mb-5">
              Are you sure you want to end this consultation? Your notes will be saved as a draft.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { saveConsultationData(false); navigate('/appointments'); }}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-colors"
              >
                End Consultation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
