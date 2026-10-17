import { useEffect, useMemo, useState } from 'react';
import HomePinField from '../../components/location/HomePinField';
import { getAddressesApi } from '../../../services/patientHelper';
import FavoriteButton from '../../components/FavoriteButton';
import CancellationRefundPolicy from '../../components/CancellationRefundPolicy';
import ServiceVisual from '../../components/illustrations/ServiceVisual';
import { paidLabel, refundText, refundWillText, TestPaymentNote } from '../../../config/payments';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FlaskConical, Search, MapPin, Clock, CheckCircle2, ArrowLeft, Utensils, Home, Building2, Stethoscope, KeyRound, ShieldCheck, PackageCheck, Droplet, Info, ChevronDown, X } from 'lucide-react';
import LabChooser from './LabChooser';
import { hcOrderApi } from '../../../services/homecareHelper';
import { getMyUserId, getFamilyMembersApi, type PatientFamilyMember } from '../../../services/familyHelper';
import { fetchLabTestsApi, findLabsApi, bookLabTestsApi, rxTestsApi, healthPackagesApi, labPublicApi, labError, rupees, type LabTestDef, type LabHit, type MyLabOrder, type RxTests, type LabHours, type PublicPackage, type LabPublic } from '../../../services/labHelper';

const POPULAR = ['CBC', 'THYROID', 'LIPID', 'HBA1C', 'VITD', 'FBS'];
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dayChips = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() + i * 86400000); return { iso: iso(d), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) }; });
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
// Slots every 30 minutes inside the window; today hides times less than 15 minutes away (the server checks too).
const slots = (dateIso: string, win: LabHours | null) => {
  if (!win) return [];
  const out: string[] = [];
  for (let m = toMin(win.open); m < toMin(win.close); m += 30) {
    const t = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    if (new Date(`${dateIso}T${t}:00`).getTime() >= Date.now() + 15 * 60000) out.push(t);
  }
  return out;
};
const label12 = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };

// Book lab tests: choose tests (or the ones your doctor ordered), compare labs by total price,
// choose a centre visit or home collection, a time inside the lab's hours, and pay.
export default function LabBookingScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rxId = params.get('rx');
  const testParam = params.get('test');
  const labParam = params.get('lab'); // a lab chosen in the search: shown first once tests are picked
  const [labPage, setLabPage] = useState<LabPublic | null>(null);
  // H6: tests a home care team asked for (?hc=<request>&order=<care booking>): prefilled, home collection at the care address.
  const hcId = params.get('hc');
  const hcOrderId = params.get('order');
  const [hcReq, setHcReq] = useState<{ id: string; reason: string; by: string; agency: string; patient: string | null } | null>(null);
  const [rx, setRx] = useState<RxTests | null>(null);
  const [tests, setTests] = useState<LabTestDef[] | null>(null);
  const [q, setQ] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [labs, setLabs] = useState<LabHit[] | null>(null);
  const [lab, setLab] = useState<LabHit | null>(null);
  const [centreId, setCentreId] = useState<number | null>(null);
  const [mode, setMode] = useState<'LAB_VISIT' | 'HOME'>('LAB_VISIT');
  const [addr, setAddr] = useState({ line: '', area: '', landmark: '', city: '', pincode: '' });
  const [homePin, setHomePin] = useState<{ lat: number; lng: number } | null>(null);
  // Home collection starts from the patient's saved default address (they can still edit it here).
  useEffect(() => {
    getAddressesApi().then((list) => {
      const d = list.find((a) => a.isDefault) || list[0];
      if (!d) return;
      setAddr((cur) => (cur.line || cur.pincode ? cur : { line: d.addressLine1 || '', area: d.addressLine2 || '', landmark: d.landmark || '', city: d.city || '', pincode: d.pincode || '' }));
      if (d.pin) setHomePin((p) => p || d.pin || null);
    }).catch(() => undefined);
  }, []);
  const [date, setDate] = useState(dayChips()[1].iso);
  const [time, setTime] = useState('');
  const [pay, setPay] = useState<'UPI' | 'CASH'>('UPI');
  const [upi, setUpi] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<MyLabOrder | null>(null);
  const [family, setFamily] = useState<PatientFamilyMember[]>([]);
  const [forWho, setForWho] = useState('');
  const [packages, setPackages] = useState<PublicPackage[] | null>(null);
  const [labsErr, setLabsErr] = useState<string | null>(null);
  const [labsTry, setLabsTry] = useState(0);
  const [pkg, setPkg] = useState<PublicPackage | null>(null);
  const [openPkg, setOpenPkg] = useState<string | null>(null);
  const [pkgQ, setPkgQ] = useState('');
  const [pkgShown, setPkgShown] = useState(6);
  const pkgList = (packages || []).filter((p) => { const s = pkgQ.trim().toLowerCase(); return !s || `${p.name} ${p.lab.name} ${p.audience || ''} ${p.tests.map((t) => t.name).join(' ')}`.toLowerCase().includes(s); });
  // The same checkup from several labs is one card (cheapest first); the patient compares labs inside it.
  const pkgGroups = useMemo(() => {
    const m = new Map<string, PublicPackage[]>();
    for (const p of pkgList) { const k = `${p.name.toLowerCase()}|${p.tests.map((t) => t.code).sort().join(',')}`; m.set(k, [...(m.get(k) || []), p]); }
    return Array.from(m.values()).map((labs) => [...labs].sort((a, b) => a.price - b.price));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages, pkgQ]);

  useEffect(() => { if (testParam) setChosen([testParam.toUpperCase()]); }, [testParam]);
  useEffect(() => {
    if (!hcId || !hcOrderId) return;
    hcOrderApi(hcOrderId).then((o) => {
      const r = o.care?.lab_requests?.find((x) => x.id === hcId);
      if (!r) { setError('That care-team lab request was not found.'); return; }
      if (r.status !== 'OPEN') { setError('These tests are already booked. See My lab bookings.'); return; }
      setHcReq({ id: r.id, reason: r.reason, by: r.requested_by, agency: o.agency_name || 'the agency', patient: o.patient_name });
      setChosen(r.tests.map((t) => t.code)); setMode('HOME');
      setAddr({ line: o.address || '', area: '', landmark: o.landmark || '', city: '', pincode: o.pincode || '' });
    }).catch((e) => setError(labError(e, 'Could not load the care-team request.')));
  }, [hcId, hcOrderId]);
  useEffect(() => { fetchLabTestsApi().then(setTests).catch((e) => setError(labError(e, 'Could not load tests.'))); }, []);
  useEffect(() => { if (!rxId) healthPackagesApi().then(setPackages).catch(() => setPackages([])); }, [rxId]);
  // Book a package: its lab is fixed, so go straight to centre/home and time.
  const choosePackage = async (p: PublicPackage) => {
    setError(null); setChosen([]); setPkg(p); setLab(null); setCentreId(null);
    try {
      const d = await labPublicApi(p.lab.id);
      setLab({ id: d.id, name: d.name, locations: d.locations, tests_offered: 0, selected: [], total: p.price, settings: d.settings, registration_number: d.registration_number });
      setCentreId(d.locations[0]?.id ?? null); setMode('LAB_VISIT'); setTime('');
    } catch (e) { setError(labError(e, 'Could not open this package.')); setPkg(null); }
  };
  useEffect(() => { getMyUserId().then((id) => (id ? getFamilyMembersApi(id) : [])).then(setFamily).catch(() => setFamily([])); }, []);
  useEffect(() => {
    if (!rxId) return;
    rxTestsApi(rxId).then((r) => { setRx(r); if (r.family_member_id) setForWho(String(r.family_member_id)); setChosen(Array.from(new Set(r.tests.map((t) => t.code).filter((c): c is string => !!c)))); })
      .catch((e) => setError(labError(e, 'Could not open the prescription.')));
  }, [rxId]);
  useEffect(() => {
    if (!chosen.length && pkg) return; // package mode keeps its lab
    setLab(null); setCentreId(null); setLabs(null);
    if (!chosen.length) return;
    setPkg(null);
    setLabsErr(null);
    const t = setTimeout(() => findLabsApi(chosen, city.trim()).then(setLabs).catch((e) => setLabsErr(labError(e, 'Could not load labs right now.'))), 300);
    return () => clearTimeout(t);
  }, [chosen, city, labsTry]);

  // A doctor at a hospital with its own lab: that lab is offered first and pre-selected (patient may change it).
  useEffect(() => {
    const h = rx?.hospital_lab;
    if (!h || !labs || lab) return;
    const hit = labs.find((l) => l.id === h.id);
    if (hit) { setLab(hit); setCentreId(hit.locations[0]?.id ?? null); }
  }, [rx, labs]); // eslint-disable-line react-hooks/exhaustive-deps
  const byCode = useMemo(() => new Map((tests || []).map((t) => [t.code, t])), [tests]);
  const shown = (tests || []).filter((t) => { const s = q.trim().toLowerCase(); return !s || t.name.toLowerCase().includes(s) || t.code.toLowerCase().includes(s) || (t.short_name || '').toLowerCase().includes(s); });
  const fasting = pkg ? pkg.fasting_hours : Math.max(0, ...chosen.map((c) => byCode.get(c)?.fasting_hours || 0));
  // Opened for one lab (from search): show that lab and its own tests first.
  useEffect(() => { if (labParam) labPublicApi(labParam).then(setLabPage).catch(() => setLabPage(null)); }, [labParam]);
  const labMode = !!labParam && !!labPage && !pkg && !rx && !hcReq;
  // In single-lab mode that lab is the lab: select it as soon as its price for these tests is known.
  useEffect(() => {
    if (!labMode || !labs || lab) return;
    const hit = labs.find((l) => l.id === labParam);
    if (hit) { setLab(hit); setCentreId(hit.locations[0]?.id ?? null); }
  }, [labMode, labs]); // eslint-disable-line react-hooks/exhaustive-deps
  const labModeMissing = labMode && chosen.length > 0 && !!labs && !labs.some((l) => l.id === labParam);
  const labModeSum = labMode ? chosen.reduce((n, c) => n + (labPage?.tests?.find((t) => t.code === c)?.price || 0), 0) : 0;
  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const toggle = (code: string) => setChosen((c) => (c.includes(code) ? c.filter((x) => x !== code) : [...c, code]));
  const home = lab?.settings?.home;
  const homeOk = mode === 'HOME' && !!home?.enabled && /^\d{6}$/.test(addr.pincode) && home.pincodes.includes(addr.pincode);
  const window_: LabHours | null = mode === 'HOME' ? (home ? { open: home.open, close: home.close } : null)
    : (lab && centreId ? (lab.settings?.centre_hours?.[String(centreId)]?.[new Date(`${date}T00:00:00`).getDay()] ?? (lab.settings ? null : { open: '07:00', close: '19:30' })) : null);
  const times = slots(date, window_);
  // Centre visits: a day the centre is closed can't be picked; suggest the next open time.
  const windowOn = (d: string): LabHours | null => (mode === 'HOME' ? (home ? { open: home.open, close: home.close } : null)
    : lab && centreId ? (lab.settings?.centre_hours?.[String(centreId)]?.[new Date(`${d}T00:00:00`).getDay()] ?? (lab.settings ? null : { open: '07:00', close: '19:30' })) : null);
  const nextOpen = (() => { for (const d of dayChips()) { const t = slots(d.iso, windowOn(d.iso)); if (t.length && !(d.iso === date)) return { iso: d.iso, label: d.label, time: t[0] }; } return null; })();
  const fee = mode === 'HOME' ? home?.fee || 0 : 0;
  // A lab's centres can price tests differently: the chosen centre's price is what is paid.
  const testsTotal = pkg ? (lab?.total || 0) : (lab?.locations.find((c) => c.id === centreId)?.total ?? lab?.total ?? 0);
  const total = testsTotal + fee;
  const addrReady = mode !== 'HOME' || (addr.line.trim().length >= 5 && addr.city.trim().length >= 2 && homeOk);

  const book = async () => {
    if (!lab || !centreId || !time) return;
    if (mode === 'HOME' && !addrReady) { setError('Complete the address, with a pincode this lab serves.'); return; }
    if (pay === 'UPI' && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upi.trim())) { setError('Enter your UPI ID, e.g. name@okicici.'); return; }
    setBusy(true); setError(null);
    try {
      setDone(await bookLabTestsApi({
        lab_partner_id: lab.id, location_id: centreId, test_codes: pkg ? [] : chosen, package_codes: pkg ? [pkg.code] : undefined, visit_date: date, visit_time: time, payment_mode: pay,
        payment: pay === 'UPI' ? { payment_method: 'UPI', upi_id: upi.trim() } : undefined,
        visit_type: mode, home_address: mode === 'HOME' ? { line: addr.line.trim(), area: addr.area.trim() || undefined, landmark: addr.landmark.trim() || undefined, city: addr.city.trim(), pincode: addr.pincode, pin: homePin || undefined } : undefined,
        prescription_id: rx?.prescription_id,
        family_member_id: forWho || undefined,
        hc_lab_request_id: hcReq?.id,
      }));
    } catch (e) { setError(labError(e, 'Could not book. Please try again.')); } finally { setBusy(false); }
  };

  const card = 'bg-white rounded-2xl border border-slate-200 p-5';
  const field = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';

  if (done) {
    const atHome = done.visit_type === 'HOME';
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className={`${card} text-center space-y-2`}>
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h1 className="text-xl font-black text-slate-900">{atHome ? 'Home collection booked' : 'Lab tests booked'}</h1>
          {done.items.some((i) => i.package_name) && <p className="text-sm font-bold text-teal-800">{Array.from(new Set(done.items.map((i) => i.package_name).filter(Boolean))).join(', ')}</p>}
          <p className="text-sm text-slate-600">{done.items.map((i) => i.test_name).join(', ')}</p>
          <p className="text-sm font-bold text-slate-800">{done.lab_name}{atHome ? '' : `, ${done.location_name}`}</p>
          {atHome && <p className="text-sm text-slate-700">At {done.home_address}</p>}
          <p className="text-sm text-slate-700">{new Date(`${done.visit_date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })} at {label12(done.visit_time)}</p>
          <p className="text-xs font-mono text-slate-500">{done.order_number}</p>
          <p className="text-sm font-bold">{rupees(done.total_amount)} · {done.payment_status === 'PAID' ? paidLabel() : atHome ? 'Pay the collector' : 'Pay at the centre'}</p>
          {atHome && done.home_visit_code && (
            <div className="mx-auto max-w-xs rounded-xl border-2 border-teal-600 bg-teal-50 px-4 py-3" aria-label="Visit code">
              <p className="text-xs font-bold text-teal-900 flex items-center justify-center gap-1"><KeyRound className="w-3.5 h-3.5" /> Visit code</p>
              <p className="text-3xl font-black tracking-[0.3em] text-teal-900 tabular-nums">{done.home_visit_code}</p>
              <p className="text-[11px] text-teal-900">Give it only to the collector when they arrive. It is also in My lab bookings.</p>
            </div>
          )}
          {done.fasting_hours > 0 && <p className="text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">Fast for {done.fasting_hours} hours before the sample. Water is allowed.</p>}
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={() => navigate('/lab-bookings')} className="px-4 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold">My lab bookings</button>
          <button onClick={() => { setDone(null); setChosen([]); setRx(null); setPkg(null); setLab(null); }} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700">Book more tests</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pb-10">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm font-bold text-slate-600"><ArrowLeft className="w-4 h-4" /> Back</button>
      <div className={labMode ? '' : 'grid sm:grid-cols-[1fr_220px] gap-4 items-center'}>
        <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><FlaskConical className="w-6 h-6 text-teal-700" /> {labMode ? `Book tests at ${labPage!.name}` : 'Book lab tests'}</h1>
        <p className="text-sm text-slate-500">{labMode ? "Pick your tests, then a centre visit or home collection and a time. You pay only for what you book." : "Choose your tests, compare labs near you, and visit a collection centre or have the sample collected at home."}</p>
        </div>
        {!labMode && <ServiceVisual id="diagnostic" className="hidden sm:block h-28 rounded-2xl" />}
      </div>

      {labPage && (
        <section aria-label="This laboratory" className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-5 flex flex-wrap items-start gap-4 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0"><FlaskConical className="w-7 h-7" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">{labPage.name}<FavoriteButton partnerId={String((labPage as any).id)} name={labPage.name} /></h2>
              <p className="text-xs text-slate-600 mt-0.5">{['Registered laboratory', labPage.registration_number ? `Reg. No. ${labPage.registration_number}` : null].filter(Boolean).join(' · ')}</p>
              <p className="text-xs text-slate-600 mt-1">{labPage.locations.map((l: any) => [l.name, l.area || l.city].filter(Boolean).join(', ')).join(' · ') || 'Centres being added'}</p>
              {(labPage.settings as any)?.home?.enabled && <p className="text-xs font-semibold text-emerald-700 mt-1">Home sample collection available</p>}
            </div>
          </div>
          {!!labPage.tests?.length && (
            <div className="p-5 space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">{labMode ? '1. Choose tests at this lab' : 'Tests at this lab'}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {labPage.tests.map((t) => {
                  const on = chosen.includes(t.code);
                  return (
                    <li key={t.code} className={`rounded-xl border p-3 flex items-start justify-between gap-3 ${on ? 'border-teal-600 bg-teal-50/40' : 'border-slate-200'}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{t.name}</p>
                        <LabTestBadges
                          fastingHours={t.fasting_hours}
                          specimenType={(t as any).specimen_type || byCode.get(t.code)?.specimen_type}
                          tatHours={t.tat_hours}
                          className="mt-1"
                        />
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-slate-900">₹{t.price}</p>
                        <button type="button" aria-pressed={on} onClick={() => toggle(t.code)} className={`mt-1 px-3 py-1 rounded-lg text-xs font-bold ${on ? 'bg-teal-700 text-white' : 'border border-teal-700 text-teal-700'}`}>{on ? 'Added' : 'Add'}</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {labMode && chosen.length > 0 && fasting > 0 && <p className="text-xs font-semibold text-amber-900 flex items-center gap-1"><Utensils className="w-3.5 h-3.5" /> Needs {fasting} hours of fasting before the sample. Water is fine.</p>}
              {labMode && chosen.length > 0 && !lab && !labModeMissing && <p className="text-xs text-slate-500">Checking times at this lab…</p>}
              {labModeMissing && <p role="alert" className="text-xs font-semibold text-rose-700">This lab can’t take these tests together online right now. Remove one, or book them at another lab.</p>}
            </div>
          )}
        </section>
      )}
      {hcReq && (
        <section aria-label="Asked for by your care team" className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 space-y-1">
          <p className="text-sm font-black text-violet-900 flex items-center gap-1.5"><Home className="w-4 h-4" /> Tests asked for by your home care team{hcReq.patient ? ` for ${hcReq.patient}` : ''}</p>
          <p className="text-xs text-violet-900">{hcReq.by}, {hcReq.agency}: {hcReq.reason}</p>
          <p className="text-xs text-slate-600">Home collection at the care address is selected. Choose a lab that serves this pincode. The report comes to you; the care team only sees that it is ready.</p>
        </section>
      )}
      {rx && (
        <section aria-label="Ordered by your doctor" className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 space-y-1">
          <p className="text-sm font-black text-teal-900 flex items-center gap-1.5"><Stethoscope className="w-4 h-4" /> Tests ordered by {rx.doctor_name}{rx.family_member_id ? ` for ${rx.patient_name}` : ''}</p>
          {rx.hospital_lab && <p className="text-xs font-semibold text-teal-900">{rx.hospital_lab.name} (your doctor’s hospital) is selected below. You can choose another lab.</p>}
          <p className="text-xs text-teal-900">Prescribed on {new Date(rx.prescribed_on).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}. Your report will also be shared with your doctor.</p>
          {rx.tests.some((t) => !t.code) && <p className="text-xs text-slate-600">Not bookable here: {rx.tests.filter((t) => !t.code).map((t) => t.name).join(', ')} (ask your doctor or a scan centre).</p>}
        </section>
      )}

      {family.length > 0 && (
        <section aria-label="Who is this for" className={`${card} space-y-2`}>
          <h2 className="text-sm font-black text-slate-900">Who are the tests for?</h2>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Patient">
            {[{ id: '', name: 'Myself' }, ...family.map((f) => ({ id: String(f.memberUserId), name: `${f.name} (${f.relationship}${f.age !== null && f.age !== undefined ? `, ${f.age} y` : ''})` }))].map((p) => (
              <button key={p.id || 'me'} type="button" role="radio" aria-checked={forWho === p.id} onClick={() => setForWho(p.id)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${forWho === p.id ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-200'}`}>{p.name}</button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">The report is made out to this person; you manage the booking and get the notifications.</p>
        </section>
      )}

      {pkg && (
        <section aria-label="Your health package" className="rounded-2xl border border-teal-300 bg-teal-50/40 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-teal-800 flex items-center gap-1"><PackageCheck className="w-4 h-4" /> Health package</p>
              <h2 className="text-lg font-black text-slate-900">{pkg.name}</h2>
              <p className="text-xs text-slate-600">{pkg.lab.name}{pkg.lab.registration_number ? ` · Reg. ${pkg.lab.registration_number}` : ''}</p>
            </div>
            <button type="button" onClick={() => { setPkg(null); setLab(null); }} className="text-xs font-bold text-slate-600 inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Change</button>
          </div>
          <PackageFacts p={pkg} />
          <ul className="grid sm:grid-cols-2 gap-1.5">{pkg.tests.map((t) => <li key={t.code} className="text-xs text-slate-700"><b>{t.name}</b> <span className="text-slate-500">· {t.parameters} parameter{t.parameters === 1 ? '' : 's'}</span>{t.about && <span className="block text-[11px] text-slate-500">{t.about}</span>}</li>)}</ul>
        </section>
      )}

      {!labMode && !pkg && !rx && packages && packages.length > 0 && !chosen.length && (
        <section aria-label="Health checkups" className={`${card} space-y-3`}>
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5"><PackageCheck className="w-5 h-5 text-teal-700" /> Health checkups</h2>
            <p className="text-xs text-slate-500">Packages from registered labs, cheaper than booking the same tests one by one. Compare labs inside each checkup.</p>
          </div>
          {(packages?.length || 0) > 6 || pkgQ ? (
            <label className="relative block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input aria-label="Search health checkups" value={pkgQ} onChange={(e) => { setPkgQ(e.target.value); setPkgShown(6); }} placeholder="Search checkups by name, lab or test (e.g. diabetes, thyroid)" className={`${field} pl-9`} />
            </label>
          ) : null}
          {!pkgGroups.length && <p className="text-sm text-slate-500">No checkup matches “{pkgQ}”.</p>}
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pkgGroups.slice(0, pkgShown).map((labs) => {
              const p = labs[0]; const key = p.code; const open = openPkg === key;
              return (
                <li key={key} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-2.5 hover:border-teal-300 hover:shadow-sm transition">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-black text-slate-900 leading-snug line-clamp-2 min-h-[2.75rem]">{p.name}</p>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 min-h-[2rem]">{p.audience || ' '}</p>
                      {/* Same line on every card: one lab names it; several labs say how many. */}
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate"><ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" /><span className="truncate">{labs.length === 1 ? `${p.lab.name}${p.lab.registration_number ? ` · Reg. ${p.lab.registration_number}` : ''}` : `Offered by ${labs.length} registered labs`}</span></p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-slate-500">{labs.length > 1 ? 'from' : ''}</p>
                      <p className="text-lg font-black text-slate-900 tabular-nums leading-none">{rupees(p.price)}</p>
                      <p className="text-[11px] text-slate-400 line-through tabular-nums">{rupees(p.separate_price)}</p>
                      {p.saving_pct > 0 && <p className="mt-1 inline-block text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">Save {labs.length > 1 ? 'up to ' : ''}{Math.max(...labs.map((x) => x.saving_pct || 0))}%</p>}
                    </div>
                  </div>
                  <PackageFacts p={p} />
                  {openPkg === `inc:${key}` ? (
                    <ul className="space-y-1 border-t border-slate-100 pt-2">{p.tests.map((t) => <li key={t.code} className="text-[11px] text-slate-700"><b>{t.name}</b> · {t.parameters} parameter{t.parameters === 1 ? '' : 's'}{t.about && <span className="block text-slate-500">{t.about}</span>}</li>)}</ul>
                  ) : <p className="text-[11px] text-slate-600 line-clamp-2">{p.tests.map((t) => t.name).join(' · ')}</p>}
                  {open && (
                    <ul className="border-t border-slate-100 pt-2 space-y-1.5" aria-label={`Labs offering ${p.name}`}>
                      {labs.slice(0, 8).map((x) => (
                        <li key={x.code} className="flex items-center gap-2 text-xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="flex-1 min-w-0"><b className="text-slate-800 block truncate">{x.lab.name}</b>{x.lab.registration_number && <span className="text-slate-500">Reg. {x.lab.registration_number}</span>}</span>
                          <span className="font-black tabular-nums text-slate-900">{rupees(x.price)}</span>
                          <button type="button" onClick={() => choosePackage(x)} className="px-2.5 py-1 rounded-lg border border-teal-700 text-teal-800 font-bold hover:bg-teal-50">Book</button>
                        </li>
                      ))}
                      {labs.length > 8 && <li className="text-[11px] text-slate-500">+ {labs.length - 8} more labs; search by lab name above.</li>}
                    </ul>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <button type="button" aria-expanded={openPkg === `inc:${key}`} onClick={() => setOpenPkg(openPkg === `inc:${key}` ? null : `inc:${key}`)} className="text-xs font-bold text-slate-600 inline-flex items-center gap-0.5 whitespace-nowrap">{openPkg === `inc:${key}` ? 'Hide tests' : `What's included (${p.test_count})`}<ChevronDown className={`w-3.5 h-3.5 ${openPkg === `inc:${key}` ? 'rotate-180' : ''}`} /></button>
                    {labs.length > 1 ? (
                      <button type="button" aria-expanded={open} onClick={() => setOpenPkg(open ? null : key)} className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap">{open ? 'Hide labs' : `Compare ${labs.length} labs`}<ChevronDown className={`w-3.5 h-3.5 ${open ? 'rotate-180' : ''}`} /></button>
                    ) : (
                      <button type="button" onClick={() => choosePackage(p)} className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-bold whitespace-nowrap">Book now</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {pkgGroups.length > pkgShown && <button type="button" onClick={() => setPkgShown(pkgShown + 6)} className="w-full py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">Show more checkups ({pkgGroups.length - pkgShown} more)</button>}
          
        </section>
      )}

      {!pkg && !labMode && (<>
      <section aria-label="Choose tests" className={`${card} space-y-3`}>
        <h2 className="text-sm font-black text-slate-900">1. Choose tests</h2>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set([...chosen, ...POPULAR])).filter((c) => byCode.has(c)).map((c) => (
            <button key={c} type="button" aria-pressed={chosen.includes(c)} onClick={() => toggle(c)} className={`px-3 py-1.5 rounded-full border text-xs font-bold ${chosen.includes(c) ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-200'}`}>{byCode.get(c)!.short_name || byCode.get(c)!.name}</button>
          ))}
        </div>
        <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input aria-label="Search tests" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tests (e.g. vitamin, sugar, urine)" className={`${field} pl-9`} /></div>
        {q.trim() && (
          <ul className="max-h-56 overflow-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
            {shown.map((t) => (
              <li key={t.code}><label className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={chosen.includes(t.code)} onChange={() => toggle(t.code)} />
                <span className="flex-1">
                  <span className="font-semibold text-slate-800">{t.name}</span>
                  {t.about && <span className="block text-xs text-slate-500 mb-1">{t.about}</span>}
                  <LabTestBadges
                    fastingHours={t.fasting_hours}
                    specimenType={t.specimen_type}
                    tatHours={t.tat_hours}
                    className="mt-0.5"
                  />
                </span>
              </label></li>
            ))}
            {!shown.length && <li className="px-3 py-2 text-sm text-slate-500">No test matches “{q}”.</li>}
          </ul>
        )}
        {chosen.length > 0 && <AboutTests tests={chosen.map((c) => byCode.get(c)).filter((t): t is LabTestDef => !!t)} onRemove={toggle} />}
        {fasting > 0 && <p className="text-xs font-semibold text-amber-900 flex items-center gap-1"><Utensils className="w-3.5 h-3.5" /> Needs {fasting} hours of fasting before the sample. Water is fine.</p>}
      </section>

      {chosen.length > 0 && (
        <section aria-label="Choose a lab" className={`${card} space-y-3`}>
          <h2 className="text-sm font-black text-slate-900">2. Choose a lab</h2>
          <LabChooser labs={labs} pinnedId={rx?.hospital_lab?.id || labParam || null} error={labsErr} onRetry={() => setLabsTry((n) => n + 1)} city={city} onCity={setCity} selectedId={lab?.id || null} onSelect={(l) => { setLab(l); setCentreId(l.locations[0]?.id ?? null); setMode('LAB_VISIT'); setTime(''); }} />
        </section>
      )}
      </>)}

      {lab && (
        <section id="lab-when" aria-label="Centre and time" className={`${card} space-y-3 scroll-mt-4`}>
          <h2 className="text-sm font-black text-slate-900">{pkg || labMode ? '2' : '3'}. Where and when</h2>
          {home?.enabled && (
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Sample collection">
              <button type="button" role="radio" aria-checked={mode === 'LAB_VISIT'} onClick={() => { setMode('LAB_VISIT'); setTime(''); }} className={`rounded-xl border p-3 text-left ${mode === 'LAB_VISIT' ? 'border-teal-600 bg-teal-50/40' : 'border-slate-200'}`}>
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><Building2 className="w-4 h-4" /> Visit a centre</span><span className="block text-xs text-slate-500">No extra charge</span>
              </button>
              <button type="button" role="radio" aria-checked={mode === 'HOME'} onClick={() => { setMode('HOME'); setTime(''); }} className={`rounded-xl border p-3 text-left ${mode === 'HOME' ? 'border-teal-600 bg-teal-50/40' : 'border-slate-200'}`}>
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><Home className="w-4 h-4" /> Home collection</span><span className="block text-xs text-slate-500">{home.fee ? `${rupees(home.fee)} collection fee` : 'Free'} · {label12(home.open)}–{label12(home.close)}</span>
              </button>
            </div>
          )}
          {mode === 'LAB_VISIT' ? (
            <div className="space-y-2">
              {lab.locations.map((c) => (
                <label key={c.id} className={`flex items-start gap-2 rounded-xl border p-3 cursor-pointer ${centreId === c.id ? 'border-teal-600 bg-teal-50/30' : 'border-slate-200'}`}>
                  <input type="radio" name="centre" checked={centreId === c.id} onChange={() => { setCentreId(c.id); setTime(''); }} className="mt-1" />
                  <span className="flex-1"><span className="flex justify-between gap-2 text-sm font-bold text-slate-900">{c.name}{!pkg && (lab as any).prices_vary && c.total !== undefined && <span className="tabular-nums">{rupees(c.total)}</span>}</span><span className="block text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {[c.address, c.city, c.pincode].filter(Boolean).join(', ')}</span></span>
                </label>
              ))}
            </div>
          ) : (
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Collection address">
              <input aria-label="House / flat and street" value={addr.line} onChange={(e) => setAddr({ ...addr, line: e.target.value.slice(0, 120) })} placeholder="House / flat no. and street" className={`${field} sm:col-span-2`} />
              <input aria-label="Area" value={addr.area} onChange={(e) => setAddr({ ...addr, area: e.target.value.slice(0, 60) })} placeholder="Area / locality" className={field} />
              <input aria-label="Landmark (optional)" value={addr.landmark} onChange={(e) => setAddr({ ...addr, landmark: e.target.value.slice(0, 60) })} placeholder="Landmark (optional)" className={field} />
              <input aria-label="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value.replace(/[^A-Za-z .-]/g, '').slice(0, 40) })} placeholder="City" className={field} />
              <input aria-label="Pincode" inputMode="numeric" value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="6-digit pincode" className={field} />
              {addr.pincode.length === 6 && !homeOk && <p role="alert" className="sm:col-span-2 text-xs font-semibold text-rose-700">{lab.name} does not collect at home in {addr.pincode}. Choose a centre visit or another lab.</p>}
              <HomePinField value={homePin} onChange={setHomePin} who="sample collector" />
            </fieldset>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Visit date">
            {dayChips().map((d) => { const closed = !windowOn(d.iso); return (
              <button key={d.iso} type="button" disabled={closed} aria-pressed={date === d.iso} onClick={() => { setDate(d.iso); setTime(''); }} title={closed ? 'Closed' : undefined}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${closed ? 'bg-slate-50 text-slate-300 border-slate-100 line-through cursor-not-allowed' : date === d.iso ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>{d.label}{closed ? ' · Closed' : ''}</button>
            ); })}
          </div>
          {(!window_ || !times.length) && nextOpen && (
            <button type="button" onClick={() => { setDate(nextOpen.iso); setTime(nextOpen.time); }} className="text-sm font-bold text-teal-700 hover:underline">Next available: {nextOpen.label}, {label12(nextOpen.time)}</button>
          )}
          {!window_ ? <p className="text-sm text-slate-500">This centre is closed on that day. Choose another day.</p> : times.length ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2" role="group" aria-label="Visit time">
              {times.map((t) => <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(t)} className={`px-2 py-1.5 rounded-lg border text-xs font-bold tabular-nums ${time === t ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-200'}`}>{label12(t)}</button>)}
            </div>
          ) : <p className="text-sm text-slate-500">No more times that day. Choose another day.</p>}
          {window_ && <p className="text-[11px] text-slate-500">{mode === 'HOME' ? 'Home collection' : 'Open'} {label12(window_.open)} – {label12(window_.close)} that day.</p>}
        </section>
      )}

      {lab && time && addrReady && (
        <section id="lab-pay" aria-label="Pay" className={`${card} space-y-3 scroll-mt-4`}>
          <h2 className="text-sm font-black text-slate-900">{pkg || labMode ? '3' : '4'}. Pay {rupees(total)}</h2>
          {pkg && <p className="text-xs text-slate-600">{pkg.name} {rupees(pkg.price)} <span className="line-through text-slate-400">{rupees(pkg.separate_price)}</span> · you save {rupees(pkg.saving)}</p>}
          {fee > 0 && <p className="text-xs text-slate-600">{pkg ? 'Package' : 'Tests'} {rupees(testsTotal)} + home collection {rupees(fee)}</p>}
          <div className="flex gap-2" role="radiogroup" aria-label="Payment">
            <button type="button" role="radio" aria-checked={pay === 'UPI'} onClick={() => setPay('UPI')} className={`px-3 py-2 rounded-xl border text-sm font-bold ${pay === 'UPI' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}>Pay now (UPI)</button>
            <button type="button" role="radio" aria-checked={pay === 'CASH'} onClick={() => setPay('CASH')} className={`px-3 py-2 rounded-xl border text-sm font-bold ${pay === 'CASH' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}>{mode === 'HOME' ? 'Pay the collector' : 'Pay at the centre'}</button>
          </div>
          {pay === 'UPI' && <TestPaymentNote />}
          {pay === 'UPI' && <input aria-label="UPI ID" value={upi} onChange={(e) => setUpi(e.target.value.replace(/\s/g, ''))} placeholder="yourname@upi" className={field} />}
          <p className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}, {label12(time)} {mode === 'HOME' ? `at home (${addr.pincode})` : `at ${lab.locations.find((c) => c.id === centreId)?.name}`}</p>

          {/* Before your test preparation box (Requirement 3) */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-50/80 to-amber-100/30 border border-amber-200/80 p-4 space-y-3" data-testid="before-your-test">
            <h3 className="font-black text-amber-950 text-xs sm:text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              Before your test
            </h3>
            <div className="space-y-2 text-xs text-amber-900">
              <div className="flex items-start gap-2">
                <Utensils className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {fasting > 0 ? (fasting >= 10 ? 'Fasting 10–12 h required' : `Fasting ${fasting} h required`) : 'No fasting required'}
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {fasting > 0
                      ? 'Do not eat or drink anything except plain water for 10–12 hours before your sample collection.'
                      : 'You may eat and drink normally before your sample collection.'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Droplet className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    Sample type: {Array.from(new Set(chosen.map((c) => byCode.get(c)?.specimen_type).filter(Boolean))).join(', ') || 'Blood sample'}
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Sample will be collected using sterile, single-use vacuum containers by a certified technician.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    Report timeline: {Math.max(0, ...chosen.map((c) => byCode.get(c)?.tat_hours || 0)) > 0
                      ? `Within ${Math.max(0, ...chosen.map((c) => byCode.get(c)?.tat_hours || 0))} hours`
                      : 'Usually within 24 hours'}
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Your digital lab report will be released to Medical Records with pathologist verification.
                  </p>
                </div>
              </div>
              {chosen.some((c) => byCode.get(c)?.patient_instructions) && (
                <div className="flex items-start gap-2 border-t border-amber-200/60 pt-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Special instructions:</p>
                    <ul className="list-disc list-inside text-[11px] text-amber-800 mt-0.5 space-y-0.5">
                      {chosen.filter((c) => byCode.get(c)?.patient_instructions).map((c) => (
                        <li key={c}><strong>{byCode.get(c)!.name}:</strong> {byCode.get(c)!.patient_instructions}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cancellation & Refund Policy (Requirement 4) */}
          <CancellationRefundPolicy service="lab" />

          {error && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
          <button type="button" disabled={busy} onClick={book} className="w-full px-4 py-3 rounded-xl bg-teal-700 text-white text-sm font-bold disabled:opacity-60">{busy ? 'Booking…' : pay === 'UPI' ? `Pay ${rupees(total)} & book` : mode === 'HOME' ? 'Book home collection' : 'Book visit'}</button>
        </section>
      )}
      {error && !(lab && time && addrReady) && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
      {labMode && chosen.length > 0 && (
        <div role="region" aria-label="Booking summary" className="sticky bottom-3 z-30 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-lg px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-700 min-w-0">
              <b className="text-slate-900">{chosen.length} test{chosen.length === 1 ? '' : 's'}</b> · <b className="text-slate-900 tabular-nums">{rupees(lab ? total : labModeSum)}</b>
              <span className="block text-[11px] text-slate-500 truncate">{!lab ? (labModeMissing ? 'Not available together here' : 'Checking times…') : !time ? 'Next: choose a centre or home collection, then a time' : !addrReady ? 'Next: complete the address' : 'Next: pay and confirm'}</span>
            </p>
            <button type="button" disabled={!lab} onClick={() => goTo(lab && time && addrReady ? 'lab-pay' : 'lab-when')}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold disabled:opacity-50">
              {lab && time && addrReady ? 'Review & pay' : 'Choose time'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PackageFacts({ p }: { p: PublicPackage }) {
  return (
    <p className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
      <span className="font-bold text-slate-800">{p.test_count} tests · {p.parameters} parameters</span>
      <span className="inline-flex items-center gap-1"><Utensils className="w-3 h-3" />{p.fasting_hours ? `${p.fasting_hours} h fasting` : 'No fasting'}</span>
      <span className="inline-flex items-center gap-1"><Droplet className="w-3 h-3" />{p.samples.join(', ')}</span>
      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />Report in {p.tat_hours} h</span>
      {p.lab.home_collection && <span className="inline-flex items-center gap-1"><Home className="w-3 h-3" />Home collection</span>}
    </p>
  );
}

// What each chosen test is, why it is done, the sample and how to prepare (plain words, before paying).
function AboutTests({ tests, onRemove }: { tests: LabTestDef[]; onRemove: (code: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul aria-label="About your tests" className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {tests.map((t) => (
        <li key={t.code} className="px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">{t.name}</p>
              {t.about && <p className="text-xs text-slate-600">{t.about}</p>}
              <LabTestBadges
                fastingHours={t.fasting_hours}
                specimenType={t.specimen_type}
                tatHours={t.tat_hours}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" aria-expanded={open === t.code} aria-label={`About ${t.name}`} onClick={() => setOpen(open === t.code ? null : t.code)} className="text-teal-700"><Info className="w-4 h-4" /></button>
              <button type="button" aria-label={`Remove ${t.name}`} onClick={() => onRemove(t.code)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
          </div>
          {open === t.code && (
            <dl className="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {t.why_done && <div className="sm:col-span-2"><dt className="font-bold text-slate-500">Why doctors order it</dt><dd className="text-slate-700">{t.why_done}</dd></div>}
              <div><dt className="font-bold text-slate-500">Sample</dt><dd className="text-slate-700">{t.specimen_type}</dd></div>
              <div><dt className="font-bold text-slate-500">Preparation</dt><dd className="text-slate-700">{t.patient_instructions || (t.fasting_hours ? `Fast for ${t.fasting_hours} hours; water is allowed.` : 'No fasting needed.')}</dd></div>
              <div><dt className="font-bold text-slate-500">Usual report time</dt><dd className="text-slate-700">{t.tat_hours} hours (each lab shows its own)</dd></div>
            </dl>
          )}
        </li>
      ))}
    </ul>
  );
}

export function LabTestBadges({
  fastingHours,
  specimenType,
  tatHours,
  className = '',
}: {
  fastingHours?: number | null;
  specimenType?: string | null;
  tatHours?: number | null;
  className?: string;
}) {
  const fHours = Number(fastingHours || 0);
  const fastingLabel = fHours > 0 ? (fHours >= 10 ? 'Fasting 10–12 h' : `Fasting ${fHours} h`) : 'No fasting';
  const sampleLabel = specimenType || 'Blood sample';
  const reportLabel = tatHours ? `Report in ${tatHours < 24 ? `${tatHours} h` : `${Math.round(tatHours / 24)} d`}` : 'Report in 24 h';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        <Utensils className="w-3 h-3 text-amber-600 shrink-0" />
        {fastingLabel}
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
        <Droplet className="w-3 h-3 text-sky-600 shrink-0" />
        {sampleLabel}
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
        <Clock className="w-3 h-3 text-teal-600 shrink-0" />
        {reportLabel}
      </span>
    </div>
  );
}
