import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, MessageSquare, AlertTriangle, ChevronDown, ChevronUp, FileText, Send, AlertCircle, Clock, X,
  ArrowRight, Headphones, Siren, Paperclip, CheckCircle2, RotateCcw, Inbox, Lock,
} from 'lucide-react';
import {
  SUPPORT_CATEGORIES, createTicketApi, getMyTicketsApi, getTicketApi, replyTicketApi, closeTicketApi, readFileAsDataUrl,
  type SupportTicket, type TicketKind, type TicketStatus,
} from '../../../services/supportHelper';
import { getDashboardApi, type DashboardBooking } from '../../../services/dashboardHelper';
import { formatDate } from '../../../utils/dateFormat';
import { formatDoctorName } from '../../../utils/doctorLabel';

export interface FAQItem {
  question: string;
  answer: string;
  category: 'Booking' | 'Records' | 'Family' | 'Pharmacy' | 'Payments';
  link?: { label: string; to: string };
}

// Every answer describes a flow that exists in this app today.
export const PATIENT_FAQS: FAQItem[] = [
  {
    question: 'How do I book a doctor or hospital appointment?',
    answer: 'Open Healthcare Services and choose Doctor Consultation or Hospital. Pick the doctor (for a hospital: the branch and department first), then a date and a free time slot. Pay online by UPI, card, net banking or wallet, or choose Pay at Clinic. The booking appears under Bookings with its reference number.',
    category: 'Booking',
    link: { label: 'Book an appointment', to: '/healthcare-services' },
  },
  {
    question: 'How do I cancel a booking? Will I get a refund?',
    answer: 'Open Bookings, tap the upcoming booking and choose Cancel booking. You can cancel any time before the appointment starts. If you paid online, the full amount is refunded to the same payment method (banks usually take 5–7 working days). Pay-at-clinic bookings have nothing to refund.',
    category: 'Payments',
    link: { label: 'Go to Bookings', to: '/my-consultations' },
  },
  {
    question: 'Where are my prescriptions? Can I download them?',
    answer: 'Medical Records lists every prescription your doctor finalised after a visit — medicines with how to take them, tests advised, allergies, vitals and the follow-up date. Tap View, then Print / Download (choose "Save as PDF" to keep a copy).',
    category: 'Records',
    link: { label: 'Open Medical Records', to: '/my-records' },
  },
  {
    question: 'How do I get my prescribed medicines from a pharmacy?',
    answer: 'In Medical Records tap Send to Pharmacy on a prescription and choose a pharmacy, or start a new order from Pharmacy Orders. Choose pickup or delivery. If the pharmacy cannot fulfil the order, any online payment is refunded automatically and the order shows as failed.',
    category: 'Pharmacy',
    link: { label: 'Pharmacy Orders', to: '/pharmacy-orders' },
  },
  {
    question: 'Can I book for my parents, spouse or children?',
    answer: 'Yes. Add them once under Family Profiles (name, date of birth, gender and relationship). They can then be chosen as the patient while booking.',
    category: 'Family',
    link: { label: 'Family Profiles', to: '/family-profiles' },
  },
  {
    question: 'How do I rate my doctor after a visit?',
    answer: 'Open Bookings → Completed, tap the visit and write a review with a star rating. You can see your reviews and any reply from the doctor under Ratings & Reviews.',
    category: 'Booking',
    link: { label: 'Ratings & Reviews', to: '/reviews' },
  },
];

const STATUS_UI: Record<TicketStatus, { label: string; cls: string }> = {
  OPEN: { label: 'Open', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  IN_PROGRESS: { label: 'In progress', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  AWAITING_YOU: { label: 'Support replied', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  RESOLVED: { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CLOSED: { label: 'Closed', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const MAX_FILE = 2 * 1024 * 1024;
const inputCls = 'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';

export default function HelpSupportScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [formKind, setFormKind] = useState<TicketKind | null>(null);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true); setTicketsError(null);
    try { setTickets(await getMyTicketsApi()); }
    catch { setTicketsError('Could not load your requests.'); }
    finally { setTicketsLoading(false); }
  }, []);
  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Deep links: /help?booking=BK-... opens the form about that booking; /help?ticket=<id> (from a
  // notification) opens that ticket.
  useEffect(() => {
    if (params.get('booking')) setFormKind('ISSUE');
    if (params.get('ticket')) setOpenTicketId(params.get('ticket'));
  }, [params]);

  const filteredFaqs = PATIENT_FAQS.filter((f) => {
    const q = searchTerm.trim().toLowerCase();
    return !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
  });

  const openCount = tickets.filter((t) => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 w-full">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#B45F28] via-[#6B4530] to-[#2B1A11] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold">
            <Headphones className="w-3.5 h-3.5" /> Help & Support
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">How can we help?</h1>
          <p className="text-white/80 text-sm sm:text-base font-medium leading-relaxed">
            Search the answers below, or send a request to the Vizito support team and follow it here.
          </p>
          <div className="mt-6 relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              aria-label="Search help"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search: cancel, refund, prescription, pharmacy…"
              className="w-full pl-12 pr-10 py-3.5 bg-white text-slate-900 rounded-2xl font-semibold text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-white/30 shadow-lg"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} aria-label="Clear search" className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Emergency — support tickets are not for emergencies */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
        <Siren className="w-6 h-6 text-rose-600 shrink-0" />
        <p className="text-sm font-semibold text-rose-900 flex-1">
          Medical emergency? Don’t wait for a support reply — call an ambulance now.
        </p>
        <div className="flex gap-2">
          <a href="tel:108" className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black">Call 108</a>
          <a href="tel:112" className="px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-black">Call 112</a>
        </div>
      </div>

      {/* Two ways in */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={() => setFormKind('QUESTION')} className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-teal-200 transition-all group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0"><MessageSquare className="w-6 h-6" /></div>
            <div className="flex-1">
              <h3 className="font-extrabold text-slate-800 text-base">Ask a question</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Bookings, payments, prescriptions or your account.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-1 transition-all mt-1" />
          </div>
        </button>
        <button onClick={() => setFormKind('ISSUE')} className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-rose-200 transition-all group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0"><AlertTriangle className="w-6 h-6" /></div>
            <div className="flex-1">
              <h3 className="font-extrabold text-slate-800 text-base">Report a problem</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Payment deducted, booking missing, app error — attach a screenshot.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-1 transition-all mt-1" />
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* FAQs */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-teal-600" /> Common questions</h2>
          {filteredFaqs.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={faq.question}>
                    <button onClick={() => setOpenFaq(isOpen ? null : idx)} aria-expanded={isOpen} className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-50">
                      <span className={`text-xs sm:text-sm font-bold pr-4 ${isOpen ? 'text-teal-700' : 'text-slate-800'}`}>{faq.question}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-teal-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs text-slate-600 font-medium leading-relaxed bg-slate-50/50 border-t border-slate-100 space-y-3">
                        <p>{faq.answer}</p>
                        {faq.link && (
                          <button onClick={() => navigate(faq.link!.to)} className="inline-flex items-center gap-1 text-teal-700 font-bold hover:underline">
                            {faq.link.label} <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="font-extrabold text-slate-800 text-sm">No answer matches “{searchTerm}”.</h3>
              <button onClick={() => setFormKind('QUESTION')} className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl font-bold text-xs">
                <MessageSquare className="w-4 h-4" /> Ask the support team
              </button>
            </div>
          )}
        </div>

        {/* Your requests */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2"><Inbox className="w-5 h-5 text-teal-600" /> Your requests</h3>
            {openCount > 0 && <span className="text-[10px] font-bold text-slate-500">{openCount} open</span>}
          </div>
          {ticketsLoading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading…</p>
          ) : ticketsError ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-xs font-semibold text-rose-600">{ticketsError}</p>
              <button onClick={loadTickets} className="inline-flex items-center gap-1 text-xs font-bold text-slate-700"><RotateCcw className="w-3.5 h-3.5" /> Retry</button>
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No requests yet. Anything you send to support is tracked here, with every reply.</p>
          ) : (
            <ul className="space-y-2" aria-label="Your support requests">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setOpenTicketId(t.id)} className="w-full text-left p-3 rounded-2xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 line-clamp-2">{t.subject}</span>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_UI[t.status]?.cls}`}>{STATUS_UI[t.status]?.label || t.status}</span>
                    </div>
                    <span className="block text-[11px] text-slate-400 font-semibold mt-1">{t.ticket_number} · {formatDate(t.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-[11px] text-slate-600 font-medium space-y-1">
            <p className="flex items-center gap-1.5 font-bold text-slate-700"><Clock className="w-3.5 h-3.5" /> Reply times</p>
            <p>Payment &amp; refund: within 24 hours. Everything else: within 48 hours. Replies also arrive in your notifications.</p>
          </div>
        </div>
      </div>

      {formKind && (
        <TicketFormModal
          kind={formKind}
          presetBooking={params.get('booking') || ''}
          onClose={() => {
            setFormKind(null);
            if (params.get('booking')) { params.delete('booking'); setParams(params, { replace: true }); }
          }}
          onCreated={(t) => { setTickets((prev) => [t, ...prev]); }}
        />
      )}
      {openTicketId && (
        <TicketDetailModal
          id={openTicketId}
          onClose={() => {
            setOpenTicketId(null);
            if (params.get('ticket')) { params.delete('ticket'); setParams(params, { replace: true }); }
          }}
          onChanged={(t) => setTickets((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...t } : x)))}
        />
      )}
    </div>
  );
}

// ── New request ──
const TicketFormModal: React.FC<{
  kind: TicketKind;
  presetBooking: string;
  onClose: () => void;
  onCreated: (t: SupportTicket) => void;
}> = ({ kind: initialKind, presetBooking, onClose, onCreated }) => {
  const [kind, setKind] = useState<TicketKind>(initialKind);
  const [category, setCategory] = useState<string>(presetBooking ? 'Booking & appointments' : '');
  const [bookingRef, setBookingRef] = useState(presetBooking);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<SupportTicket | null>(null);
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);

  // The patient's own bookings, so a problem can be tied to the exact visit (support sees the ref).
  useEffect(() => {
    getDashboardApi()
      .then((d) => setBookings([...d.active, ...d.upcoming, ...d.history].filter((b) => b.bookingNumber)))
      .catch(() => setBookings([]));
  }, []);

  const bookingLabel = (b: DashboardBooking) =>
    [b.bookingNumber, formatDoctorName(b.doctorName), formatDate(b.appointmentDate || b.bookingDate, '')].filter(Boolean).join(' · ');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!category) return setError('Choose what your request is about.');
    if (subject.trim().length < 5) return setError('Add a short subject (at least 5 characters).');
    if (description.trim().length < 15) return setError('Describe the problem in a little more detail (at least 15 characters).');
    if (category === 'Payment & refund' && !bookingRef) return setError('Choose the booking this payment is for, so we can trace it.');
    let attachment_data: string | undefined;
    if (file) {
      if (!['image/png', 'image/jpeg', 'application/pdf'].includes(file.type)) return setError('Attach a PNG, JPG or PDF file.');
      if (file.size > MAX_FILE) return setError('The attachment must be 2 MB or smaller.');
      attachment_data = await readFileAsDataUrl(file);
    }
    setSending(true);
    try {
      const t = await createTicketApi({
        kind, category, subject: subject.trim(), description: description.trim(),
        booking_reference: bookingRef || undefined,
        attachment_name: file?.name, attachment_data,
      });
      setCreated(t);
      onCreated(t);
    } catch (err: any) {
      setError(err?.message || 'Could not send your request.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={kind === 'ISSUE' ? 'Report a problem' : 'Ask a question'}>
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-100 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-900 text-base">{created ? 'Request sent' : kind === 'ISSUE' ? 'Report a problem' : 'Ask a question'}</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {created ? (
          <div className="text-center space-y-3 py-4" role="status">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-800">Your request number is {created.ticket_number}</p>
            <p className="text-slate-500 font-medium">
              The support team will reply by {new Date(created.respond_by).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}.
              You’ll get a notification, and the reply shows under Your requests.
            </p>
            <button onClick={onClose} className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3" noValidate>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Request type">
              {(['QUESTION', 'ISSUE'] as TicketKind[]).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                  className={`py-2 rounded-xl border font-bold ${kind === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {k === 'QUESTION' ? 'Question' : 'Problem'}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="t-cat" className="block font-bold text-slate-700 mb-1">What is it about? *</label>
              <select id="t-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                <option value="">Choose…</option>
                {SUPPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="t-book" className="block font-bold text-slate-700 mb-1">Related booking {category === 'Payment & refund' ? '*' : '(optional)'}</label>
              <select id="t-book" value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} className={inputCls}>
                <option value="">Not about a specific booking</option>
                {presetBooking && !bookings.some((b) => b.bookingNumber === presetBooking) && <option value={presetBooking}>{presetBooking}</option>}
                {bookings.map((b) => <option key={b.id} value={b.bookingNumber!}>{bookingLabel(b)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="t-sub" className="block font-bold text-slate-700 mb-1">Subject *</label>
              <input id="t-sub" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)}
                placeholder={kind === 'ISSUE' ? 'e.g. Money deducted but booking not confirmed' : 'e.g. Can I change my appointment time?'} className={inputCls} />
            </div>
            <div>
              <label htmlFor="t-desc" className="block font-bold text-slate-700 mb-1">Details *</label>
              <textarea id="t-desc" rows={5} value={description} maxLength={4000} onChange={(e) => setDescription(e.target.value)}
                placeholder={kind === 'ISSUE' ? 'What happened, when, and what you expected. For payments: amount and UPI/bank reference.' : 'Tell us what you need help with.'}
                className={`${inputCls} font-medium`} />
              <span className="block text-right text-[10px] text-slate-400 mt-0.5">{description.length}/4000</span>
            </div>
            <div>
              <label htmlFor="t-file" className="block font-bold text-slate-700 mb-1">Screenshot or receipt (optional · PNG, JPG or PDF, up to 2 MB)</label>
              <input id="t-file" type="file" accept="image/png,image/jpeg,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs text-slate-600" />
            </div>
            <p className="flex items-start gap-1.5 text-[11px] text-slate-500"><Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Don’t include card numbers, CVV, OTPs or passwords — Vizito will never ask for them.</p>
            {error && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 font-bold text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={sending} className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold flex items-center gap-1.5">
                <Send className="w-4 h-4" /> {sending ? 'Sending…' : 'Send to support'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ── One request, with the conversation ──
const TicketDetailModal: React.FC<{ id: string; onClose: () => void; onChanged: (t: SupportTicket) => void }> = ({ id, onClose, onChanged }) => {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getTicketApi(id).then(setTicket).catch(() => setError('Could not open this request.'));
  }, [id]);

  const update = (t: SupportTicket) => { setTicket(t); onChanged(t); };

  const sendReply = async () => {
    if (reply.trim().length < 2) return;
    setBusy(true); setError(null);
    try { update(await replyTicketApi(id, reply.trim())); setReply(''); }
    catch (e: any) { setError(e?.message || 'Could not send your reply.'); }
    finally { setBusy(false); }
  };

  const close = async () => {
    setBusy(true);
    try { update(await closeTicketApi(id)); } catch { setError('Could not close this request.'); } finally { setBusy(false); }
  };

  const attachmentHref = useMemo(() => ticket?.attachment_data || null, [ticket]);
  const closed = ticket?.status === 'CLOSED';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Support request">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 text-xs">
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="font-extrabold text-slate-900 text-sm">{ticket?.subject || 'Support request'}</h3>
            {ticket && <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{ticket.ticket_number} · {ticket.category}{ticket.booking_reference ? ` · ${ticket.booking_reference}` : ''}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ticket && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_UI[ticket.status]?.cls}`}>{STATUS_UI[ticket.status]?.label}</span>}
            <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-3 flex-1">
          {!ticket && !error && <p className="text-slate-400 py-6 text-center">Loading…</p>}
          {ticket && (
            <>
              <Bubble mine name="You" when={ticket.created_at} body={ticket.description} />
              {attachmentHref && (
                <a href={attachmentHref} download={ticket.attachment_name || 'attachment'} className="ml-auto flex w-fit items-center gap-1.5 text-[11px] font-bold text-teal-700 hover:underline">
                  <Paperclip className="w-3.5 h-3.5" /> {ticket.attachment_name}
                </a>
              )}
              {(ticket.messages || []).map((m) => (
                <Bubble key={m.id} mine={m.author_type === 'requester'} name={m.author_type === 'support' ? (m.author_name || 'Vizito Support') : 'You'} when={m.created_at} body={m.body} />
              ))}
              {!(ticket.messages || []).some((m) => m.author_type === 'support') && !closed && (
                <p className="text-center text-[11px] text-slate-400 font-semibold py-2">
                  Waiting for the support team · reply expected by {new Date(ticket.respond_by).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </>
          )}
          {error && <p role="alert" className="text-rose-600 font-bold">{error}</p>}
        </div>

        {ticket && (
          <div className="border-t border-slate-100 px-6 py-4 space-y-2">
            {closed ? (
              <p className="text-slate-500 font-semibold">This request is closed. If you still need help, send a new request.</p>
            ) : (
              <>
                <label htmlFor="t-reply" className="sr-only">Your reply</label>
                <textarea id="t-reply" rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" className={`${inputCls} font-medium`} />
                <div className="flex items-center justify-between gap-2">
                  <button onClick={close} disabled={busy} className="text-[11px] font-bold text-slate-500 hover:text-slate-800">
                    {ticket.status === 'RESOLVED' ? 'Close request' : 'My problem is solved — close'}
                  </button>
                  <button onClick={sendReply} disabled={busy || reply.trim().length < 2} className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Send reply
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Bubble: React.FC<{ mine: boolean; name: string; when: string; body: string }> = ({ mine, name, when, body }) => (
  <div className={`max-w-[85%] ${mine ? 'ml-auto' : ''}`}>
    <div className={`rounded-2xl px-4 py-3 whitespace-pre-line font-medium ${mine ? 'bg-teal-50 border border-teal-100 text-slate-800' : 'bg-slate-100 text-slate-800'}`}>{body}</div>
    <p className={`text-[10px] text-slate-400 font-semibold mt-1 ${mine ? 'text-right' : ''}`}>
      {name} · {new Date(when).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}
    </p>
  </div>
);
