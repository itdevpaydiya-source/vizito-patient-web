import LocationBar from '../../components/location/LocationBar';
import { useEffect, useMemo, useState, useRef } from 'react';
import HomePinField from '../../components/location/HomePinField';
import { getAddressesApi, getPatientProfileApi, type PatientProfileData, type PatientAddress } from '../../../services/patientHelper';
import FavoriteButton from '../../components/FavoriteButton';
import LabTestSelection, {LabBookingProgress} from './LabTestSelection';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FlaskConical, Search, MapPin, Clock, CheckCircle2, ArrowLeft, Utensils, Home, Building2, Stethoscope, KeyRound, ShieldCheck, PackageCheck, Droplet, Info, ChevronDown, X } from 'lucide-react';
import LabComparison from './LabComparison';
import LabSchedule from './LabSchedule';
import LabReview from './LabReview';
import {reviewDisabledReason,validUpi} from './labReviewDetails';
import {restoreAppointment,validHomePin} from './labScheduleDetails';
import { hcOrderApi } from '../../../services/homecareHelper';
import { getMyUserId, getFamilyMembersApi, type PatientFamilyMember } from '../../../services/familyHelper';
import { fetchLabTestsApi, findLabsApi, labAvailabilityApi, type LabAvailability, bookLabTestsApi, rxTestsApi, healthPackagesApi, labPublicApi, labError, rupees, type LabTestDef, type LabHit, type MyLabOrder, type RxTests, type LabHours, type PublicPackage, type LabPublic } from '../../../services/labHelper';

const label12 = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };

// Book lab tests: choose tests (or the ones your doctor ordered), compare labs by total price,
// choose a centre visit or home collection, a time inside the lab's hours, and pay.
export default function LabBookingScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const rxId = params.get('rx');
  const testParam = params.get('test');
  const singleLabEntry = useRef(!!params.get('lab') && !params.has('step'));
  const labParam = params.get('lab'); // a lab chosen in the search: shown first once tests are picked
  const [labPage, setLabPage] = useState<LabPublic | null>(null);
  // H6: tests a home care team asked for (?hc=<request>&order=<care booking>): prefilled, home collection at the care address.
  const hcId = params.get('hc');
  const hcOrderId = params.get('order');
  const [hcReq, setHcReq] = useState<{ id: string; reason: string; by: string; agency: string; patient: string | null; patientProfileId?:string } | null>(null);
  const [rx, setRx] = useState<RxTests | null>(null);
  const [linkNotice,setLinkNotice]=useState(false);
  const [tests, setTests] = useState<LabTestDef[] | null>(null);
  const [q, setQ] = useState('');
  const codesParam = params.has('tests') ? params.get('tests') || '' : params.get('test')?.toUpperCase() || '';
  const [chosen, setChosenState] = useState<string[]>(() => Array.from(new Set(codesParam.split(',').filter(Boolean))));
  const chosenRef = useRef(chosen);
  const navigationParams = useRef(params);
  // Browser history updates before React commits navigation. Always merge into its current
  // query so an interrupted render cannot overwrite a just-selected address or appointment.
  const latestParams=()=>new URLSearchParams(typeof window==='undefined'?navigationParams.current:window.location.search);
  useEffect(() => { const restored = Array.from(new Set(codesParam.split(',').filter(Boolean))); chosenRef.current = restored; setChosenState(current => current.join(',') === restored.join(',') ? current : restored); }, [codesParam]);
  const requestedStep = Math.min(4, Math.max(1, Math.trunc(Number(params.get('step'))) || 1));
  const setStep = (next: number) => { const updated = latestParams(); updated.set('step', String(next)); navigationParams.current = updated; setParams(updated); };
  const setChosen = (next: string[] | ((current: string[]) => string[])) => { const selected = Array.from(new Set(typeof next === 'function' ? next(chosenRef.current) : next)); chosenRef.current = selected; setChosenState(selected); const updated = latestParams(); updated.set('tests', selected.join(',')); navigationParams.current = updated; setParams(updated, {replace:true}); };
  const submitting = useRef(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(requestedStep);
  useEffect(() => { if (previousStep.current === requestedStep) return; previousStep.current = requestedStep; stepHeading.current?.focus({preventScroll:true}); }, [requestedStep]);
  const [catalogueView, setCatalogueView] = useState<'tests'|'packages'>('tests');

  const [comparisonAddress,setComparisonAddress]=useState<PatientAddress|null>(null);
  const [city, setCity] = useState('');
  const [labs, setLabs] = useState<LabHit[] | null>(null);
  const [lab, setLab] = useState<LabHit | null>(null);
  const [centreId, setCentreId] = useState<number | null>(null);
  const updateAppointment=(values:Record<string,string|null>,replace=true)=>{const updated=latestParams();for(const [key,value] of Object.entries(values)){if(value)updated.set(key,value);else updated.delete(key);}navigationParams.current=updated;setParams(updated,{replace});};
  const mode:'LAB_VISIT'|'HOME'=params.get('visit')==='HOME'?'HOME':'LAB_VISIT';
  const setMode=(value:'LAB_VISIT'|'HOME')=>{if(value!==mode)updateAppointment({visit:value,date:null,time:null});};
  const [savedAddresses,setSavedAddresses]=useState<PatientAddress[]>([]);
  const [addr, setAddr] = useState({ line: '', area: '', landmark: '', city: '', pincode: params.get('pincode')||'' });
  const [homePin, setHomePin] = useState<{ lat: number; lng: number } | null>(null);
  // Home collection starts from the patient's saved default address (they can still edit it here).
  useEffect(() => {
    getAddressesApi().then((list) => {
      setSavedAddresses(list);
      const d = list.find(a=>a.addressId===latestParams().get('address')) || list.find((a) => a.isDefault) || list[0];
      if (!d) return;
      setComparisonAddress(d);
      setAddr((cur) => (cur.line || cur.pincode ? cur : { line: d.addressLine1 || '', area: d.addressLine2 || '', landmark: d.landmark || '', city: d.city || '', pincode: d.pincode || '' }));
      if (d.pin) setHomePin((p) => p || d.pin || null);
    }).catch(() => undefined);
  }, []);
  useEffect(()=>{
    const selected=savedAddresses.find(a=>a.addressId===params.get('address'));
    if(selected){setAddr({line:selected.addressLine1||'',area:selected.addressLine2||'',landmark:selected.landmark||'',city:selected.city||'',pincode:selected.pincode||''});setHomePin(selected.pin||null);}
    else if(params.has('pincode'))setAddr(current=>({...current,pincode:params.get('pincode')||''}));
  },[params.get('address'),params.get('pincode'),savedAddresses]);
  const date=params.get('date')||'';
  const time=params.get('time')||'';
  const setTime=(value:string)=>updateAppointment({time:value});
  const setDate=(value:string)=>updateAppointment({date:value,time:null});
  const step = requestedStep <= 2 ? requestedStep : !lab ? 2 : requestedStep === 4 && !time ? 3 : requestedStep;
  const [pay, setPay] = useState<'UPI' | 'CASH'>('UPI');
  const [upi, setUpi] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [family, setFamily] = useState<PatientFamilyMember[]>([]);
  const [forWho, setForWho] = useState('');
  const [reviewProfile,setReviewProfile]=useState<PatientProfileData|null>(null);
  const [profileBusy,setProfileBusy]=useState(false);
  const [profileError,setProfileError]=useState<string|null>(null);
  const [profileTry,setProfileTry]=useState(0);
  const needsReview=requestedStep===4;
  useEffect(()=>{
    if(!needsReview)return;
    let active=true;setProfileBusy(true);setProfileError(null);
    getPatientProfileApi().then(profile=>{if(active)setReviewProfile(profile);}).catch(e=>{if(active)setProfileError(labError(e,'Could not load patient details.'));}).finally(()=>{if(active)setProfileBusy(false);});
    return()=>{active=false;};
  },[needsReview,profileTry]);
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


  useEffect(() => {
    if (!hcId || !hcOrderId) return;
    hcOrderApi(hcOrderId).then((o) => {
      const r = o.care?.lab_requests?.find((x) => x.id === hcId);
      if (!r) { setError('That care-team lab request was not found.'); return; }
      if (r.status !== 'OPEN') { setError('These tests are already booked. See My lab bookings.'); return; }
      setHcReq({ id: r.id, reason: r.reason, by: r.requested_by, agency: o.agency_name || 'the agency', patient: o.patient_name,patientProfileId:o.patient_profile_id });
      if (!params.has('tests')) setChosen(r.tests.map((t) => t.code)); setMode('HOME');
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
      setCentreId(d.locations[0]?.id ?? null); setMode('LAB_VISIT'); setTime(''); setStep(2);
    } catch (e) { setError(labError(e, 'Could not open this package.')); setPkg(null); }
  };
  useEffect(() => { getMyUserId().then((id) => (id ? getFamilyMembersApi(id) : [])).then(setFamily).catch(() => setFamily([])); }, []);
  useEffect(() => {
    if (!rxId) return;
    rxTestsApi(rxId).then((r) => { setRx(r); if (r.family_member_id) setForWho(String(r.family_member_id)); if (!params.has('tests')) setChosen(Array.from(new Set(r.tests.map((t) => t.code).filter((c): c is string => !!c)))); })
      .catch((e) => setError(labError(e, 'Could not open the prescription.')));
  }, [rxId]);
  useEffect(() => {
    if (!chosen.length && pkg) return;
    if (!tests || chosen.some(code=>!tests.some(t=>t.code===code))) return;
    setLabs(null);setLabsErr(null);
    if (!chosen.length) { setLab(null);setCentreId(null);return; }
    setPkg(null);
    let active=true;
    const timer=setTimeout(()=>findLabsApi(chosen).then(rows=>{if(active)setLabs(rows);}).catch(e=>{if(active)setLabsErr(labError(e,'Could not load labs right now.'));}),300);
    return()=>{active=false;clearTimeout(timer);};
  }, [chosen, labsTry, tests]);
  useEffect(()=>{
    if(!tests)return;
    const allowed=new Set(tests.map(t=>t.code));
    const valid=chosen.filter(code=>allowed.has(code));
    if(valid.length===chosen.length)return;
    setLinkNotice(true);setChosen(valid);
    if(!valid.length){const updated=latestParams();updated.set('step','1');updated.delete('lab');navigationParams.current=updated;setParams(updated,{replace:true});}
  },[tests,chosen]);
  useEffect(()=>{
    if(!labs||pkg)return;
    const eligible=labParam?labs.find(l=>l.id===labParam):null;
    if(eligible){if(lab?.id!==eligible.id){setLab(eligible);setCentreId(eligible.locations.find(c=>String(c.id)===params.get('centre'))?.id??eligible.locations[0]?.id??null);}else setLab(eligible);}
    else if(labParam){setLab(null);setCentreId(null);const updated=latestParams();updated.delete('lab');navigationParams.current=updated;setParams(updated,{replace:true});}
    else if(lab){setLab(null);setCentreId(null);}
  },[labs,labParam,pkg]);
  const selectLab=(selected:LabHit)=>{
    if(lab?.id!==selected.id){setLab(selected);setCentreId(selected.locations[0]?.id??null);setMode('LAB_VISIT');setTime('');}
    const updated=latestParams();updated.set('lab',selected.id);if(lab?.id!==selected.id){updated.delete('date');updated.delete('time');updated.delete('centre');updated.set('visit','LAB_VISIT');}navigationParams.current=updated;setParams(updated,{replace:true});
  };

  // A doctor at a hospital with its own lab: that lab is offered first and pre-selected (patient may change it).
  useEffect(() => {
    const h = rx?.hospital_lab;
    if (!h || !labs || lab) return;
    const hit = labs.find((l) => l.id === h.id);
    if (hit) { selectLab(hit); }
  }, [rx, labs]); // eslint-disable-line react-hooks/exhaustive-deps
  const byCode = useMemo(() => new Map((tests || []).map((t) => [t.code, t])), [tests]);

  const fasting = pkg ? pkg.fasting_hours : Math.max(0, ...chosen.map((c) => byCode.get(c)?.fasting_hours || 0));
  // Opened for one lab (from search): show that lab and its own tests first.
  useEffect(() => { if (singleLabEntry.current && labParam) labPublicApi(labParam).then(setLabPage).catch(() => setLabPage(null)); }, [labParam]);
  const labMode = singleLabEntry.current && !!labParam && !!labPage && !pkg && !rx && !hcReq;
  // In single-lab mode that lab is the lab: select it as soon as its price for these tests is known.
  useEffect(() => {
    if (!labMode || !labs || lab) return;
    const hit = labs.find((l) => l.id === labParam);
    if (hit) { selectLab(hit); }
  }, [labMode, labs]); // eslint-disable-line react-hooks/exhaustive-deps
  const labModeMissing = labMode && chosen.length > 0 && !!labs && !labs.some((l) => l.id === labParam);
  const labModeSum = labMode ? chosen.reduce((n, c) => n + (labPage?.tests?.find((t) => t.code === c)?.price || 0), 0) : 0;
  const toggle = (code: string) => setChosen((c) => (c.includes(code) ? c.filter((x) => x !== code) : [...c, code]));
  const home = lab?.settings?.home;
  const [availabilityResult,setAvailabilityResult]=useState<{key:string;data:LabAvailability}|null>(null);
  const [availabilityError,setAvailabilityError]=useState<string|null>(null);
  const [availabilityBusy,setAvailabilityBusy]=useState(false);
  const [availabilityTry,setAvailabilityTry]=useState(0);
  const [slotNotice,setSlotNotice]=useState<string|null>(null);
  const keepDay=useRef<string|null>(null);
  const availabilityKey=`${lab?.id||''}|${centreId||''}|${mode}|${mode==='HOME'?addr.pincode:''}`;
  const availability=availabilityResult?.key===availabilityKey?availabilityResult.data:null;
  const needsAvailability=requestedStep>=3;
  useEffect(()=>{
    if(!needsAvailability||!lab||!centreId|| (mode==='HOME'&&!validHomePin(addr.pincode))){setAvailabilityBusy(false);setAvailabilityResult(null);setAvailabilityError(null);return;}
    let active=true;setAvailabilityBusy(true);setAvailabilityError(null);setAvailabilityResult(null);
    labAvailabilityApi({lab_partner_id:lab.id,location_id:centreId,visit_type:mode,...(mode==='HOME'?{pincode:addr.pincode}:{})})
      .then(data=>{if(active)setAvailabilityResult({key:availabilityKey,data});})
      .catch(e=>{if(active)setAvailabilityError(labError(e,'Could not load available times. Please retry.'));})
      .finally(()=>{if(active)setAvailabilityBusy(false);});
    return()=>{active=false;};
  },[needsAvailability,lab?.id,centreId,mode,addr.pincode,availabilityTry]);
  useEffect(()=>{
    if(!availability||availabilityBusy)return;
    const restored=restoreAppointment(availability.bookable?availability.days:[],date,time,keepDay.current===date);
    if(date!==restored.date||time!==restored.time||params.get('visit')!==mode)updateAppointment({date:restored.date,time:restored.time,visit:mode});
  },[availability,availabilityBusy,date,time]);
  const times=availability?.bookable?availability.days.find(d=>d.date===date)?.slots.filter(s=>s.available).map(s=>s.time)||[]:[];
  const homeOk=mode==='HOME'&&validHomePin(addr.pincode)&&!!availability?.bookable;
  const fee = mode === 'HOME' ? home?.fee || 0 : 0;
  // A lab's centres can price tests differently: the chosen centre's price is what is paid.
  const testsTotal = pkg ? (lab?.total || 0) : (lab?.locations.find((c) => c.id === centreId)?.total ?? lab?.total ?? 0);
  const total = testsTotal + fee;
  const scheduleTestsTotal=pkg?pkg.price:lab?.locations.find(c=>c.id===centreId)?.total??lab?.total;
  const scheduleTotal=typeof scheduleTestsTotal==='number'&&Number.isFinite(scheduleTestsTotal)&&(mode!=='HOME'||typeof home?.fee==='number')?scheduleTestsTotal+fee:undefined;
  const addrReady = mode !== 'HOME' || (addr.line.trim().length >= 5 && addr.city.trim().length >= 2 && homeOk);

  const book = async () => {
    if (submitting.current || availabilityBusy || availabilityError || step !== 4 || !lab || !centreId || !time || !times.includes(time)) return;
    if (mode === 'HOME' && !addrReady) { setError('Complete the address, with a pincode this lab serves.'); return; }
    if (pay === 'UPI' && !validUpi(upi)) { setError('Enter your UPI ID, e.g. name@okicici.'); return; }
    submitting.current = true; setBusy(true); setError(null);
    let completed=false;
    try {
      const booked=await bookLabTestsApi({
        lab_partner_id: lab.id, location_id: centreId, test_codes: pkg ? [] : chosen, package_codes: pkg ? [pkg.code] : undefined, visit_date: date, visit_time: time, payment_mode: pay,
        payment: pay === 'UPI' ? { payment_method: 'UPI', upi_id: upi.trim() } : undefined,
        visit_type: mode, home_address: mode === 'HOME' ? { line: addr.line.trim(), area: addr.area.trim() || undefined, landmark: addr.landmark.trim() || undefined, city: addr.city.trim(), pincode: addr.pincode, pin: homePin || undefined } : undefined,
        prescription_id: rx?.prescription_id,
        family_member_id: forWho || undefined,
        hc_lab_request_id: hcReq?.id,
      });
      completed=true;
      navigate(`/lab-tests/booked/${encodeURIComponent(booked.id)}`,{replace:true});
    } catch (e) { if((e as {response?:{status?:number}})?.response?.status===409){keepDay.current=date;setSlotNotice(labError(e,'This time is now full.'));setTime('');setAvailabilityTry(n=>n+1);setStep(3);}else setError(labError(e, 'Could not book. Please try again.')); } finally { if(!completed){submitting.current = false; setBusy(false);} }
  };

  const card = 'bg-white rounded-2xl border border-slate-200 p-5';
  const field = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';

  return (
    <div className="w-full space-y-5 pb-10">{step!==2&&<LocationBar compact purpose="find labs near you"/>}
      <button disabled={busy} onClick={() => step > 1 ? setStep(step-1) : navigate(-1)} className="inline-flex items-center gap-1 text-sm font-bold text-slate-600"><ArrowLeft className="w-4 h-4" /> Back</button>
      <div>
        <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><FlaskConical className="w-6 h-6 text-teal-700" /> {labMode ? `Book tests at ${labPage!.name}` : 'Book lab tests'}</h1>
        <p className="text-sm text-slate-500">{step===4?"Review your booking details and choose how to pay.":labMode ? "Pick your tests, then a centre visit or home collection and a time. You pay only for what you book." : "Choose your tests, compare labs near you, and visit a collection centre or have the sample collected at home."}</p>
        </div>

      </div>

      <LabBookingProgress step={step} />
      {linkNotice && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Some tests in this link are no longer available.</p>}
      <h2 ref={stepHeading} tabIndex={-1} className="text-lg font-bold text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-orange-500">{['1. Select tests','2. Choose a lab','3. Choose date and time','4. Review and confirm'][step-1]}</h2>
      {step === 1 && !labMode && !pkg && !rx && !hcReq && <div className="lab-catalogue-tabs" role="group" aria-label="Test catalogue view"><button type="button" aria-pressed={catalogueView==='tests'} onClick={()=>setCatalogueView('tests')}>Tests by category</button><button type="button" aria-pressed={catalogueView==='packages'} onClick={()=>setCatalogueView('packages')}>Health packages</button></div>}
      {step === 1 && labPage && (
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

      {step === 1 && family.length > 0 && (
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

      {step <= 2 && pkg && (
        <section aria-label="Your health package" className="rounded-2xl border border-teal-300 bg-teal-50/40 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-teal-800 flex items-center gap-1"><PackageCheck className="w-4 h-4" /> Health package</p>
              <h2 className="text-lg font-black text-slate-900">{pkg.name}</h2>
              <p className="text-xs text-slate-600">{pkg.lab.name}{pkg.lab.registration_number ? ` · Reg. ${pkg.lab.registration_number}` : ''}</p>
            </div>
            <button type="button" onClick={() => { setStep(1); setPkg(null); setLab(null); }} className="text-xs font-bold text-slate-600 inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Change</button>
          </div>
          <PackageFacts p={pkg} />
          <ul className="grid sm:grid-cols-2 gap-1.5">{pkg.tests.map((t) => <li key={t.code} className="text-xs text-slate-700"><b>{t.name}</b> <span className="text-slate-500">· {t.parameters} parameter{t.parameters === 1 ? '' : 's'}</span>{t.about && <span className="block text-[11px] text-slate-500">{t.about}</span>}</li>)}</ul>
        </section>
      )}

      {step === 1 && !labMode && !pkg && !rx && catalogueView === 'packages' && packages && packages.length > 0 && (
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

      {step === 1 && !labMode && !pkg && !rx && catalogueView === 'packages' && (!packages || !packages.length) && <section className={card}><p role="status" className="text-sm text-slate-500">{packages ? 'No health packages are available right now. Choose individual tests instead.' : 'Loading health packages...'}</p></section>}
      {!pkg && !labMode && (<>
      {step === 1 && (catalogueView === 'tests' || !!rx || !!hcReq) && <LabTestSelection tests={tests} chosen={chosen} onToggle={toggle} onClear={()=>setChosen([])} onContinue={()=>setStep(2)} query={q} onQuery={setQ} />}

      {step === 2 && chosen.length > 0 && (
        <LabComparison savedLocation={comparisonAddress?.pin?{...comparisonAddress.pin,label:[comparisonAddress.addressLine2,comparisonAddress.city,comparisonAddress.pincode].filter(Boolean).join(", ")}:null} patientPin={comparisonAddress?.pincode} labs={labs} pinnedId={rx?.hospital_lab?.id || labParam || null} error={labsErr} onRetry={() => setLabsTry(n=>n+1)} city={city} onCity={setCity} selectedId={lab?.id || null} onSelect={selectLab} selectedLab={lab} selectedTests={chosen.map(code=>({code,name:byCode.get(code)?.name||code,fasting_hours:byCode.get(code)?.fasting_hours,patient_instructions:byCode.get(code)?.patient_instructions}))} onChange={()=>setStep(1)} onContinue={()=>setStep(3)} canContinue={!!lab && !!centreId && !!labs?.some(l=>l.id===lab.id && l.locations.some(c=>c.id===centreId)) && !labsErr} busy={busy}/>

      )}
      </>)}

      {step === 2 && (pkg || labMode) && <section aria-label="Choose a lab" className={card}><h3 className="font-bold">{lab?.name || 'Checking selected lab...'}</h3><p className="mt-2 text-sm text-slate-500">{lab?.locations.map(c=>[c.name,c.address,c.city].filter(Boolean).join(', ')).join(' / ') || 'Centre details not provided'}</p>{lab && <p className="mt-2 font-bold">{rupees(lab.total)}</p>}{labModeMissing && <p role="alert">This lab cannot offer the selected tests together. Go back to change your tests.</p>}</section>}
      {step === 3 && lab && <LabSchedule lab={lab} centreId={centreId} onCentre={id=>{setCentreId(id);updateAppointment({centre:String(id),date:null,time:null});}} mode={mode} onMode={setMode}
        tests={pkg?pkg.tests.map(t=>({code:t.code,name:t.name,fasting_hours:pkg.fasting_hours,patient_instructions:null})):chosen.flatMap(code=>byCode.get(code)?[byCode.get(code)!]:[])}
        date={date} time={time} onDate={value=>{keepDay.current=null;setDate(value);}} onTime={value=>{setSlotNotice(null);setTime(value);}} onChangeLab={()=>setStep(2)} onContinue={()=>setStep(4)}
        availability={availability} loading={availabilityBusy||(!availability&&!availabilityError&&(mode==='LAB_VISIT'||validHomePin(addr.pincode)))} error={availabilityError} onRetry={()=>setAvailabilityTry(n=>n+1)} notice={slotNotice}
        address={[addr.line,addr.area,addr.city,addr.pincode].filter(Boolean).join(', ')} pincode={addr.pincode} addressReady={addrReady} savedLocation={comparisonAddress?.pin}
        testsTotal={scheduleTestsTotal} total={scheduleTotal} busy={busy}
        addressFields={<div className="mt-3 space-y-3">{savedAddresses.length>0&&<label className="lab-schedule-centre">Saved collection address<select aria-label="Saved collection address" value={savedAddresses.find(a=>a.addressLine1===addr.line&&a.pincode===addr.pincode)?.addressId||''} onChange={e=>{const a=savedAddresses.find(a=>a.addressId===e.target.value);if(a){setAddr({line:a.addressLine1||'',area:a.addressLine2||'',landmark:a.landmark||'',city:a.city||'',pincode:a.pincode||''});setHomePin(a.pin||null);updateAppointment({address:a.addressId,pincode:a.pincode,date:null,time:null});}}}><option value="">Enter another address</option>{savedAddresses.map(a=><option key={a.addressId} value={a.addressId}>{[a.label,a.addressLine1,a.city,a.pincode].filter(Boolean).join(', ')}</option>)}</select></label>}
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Collection address">
              <input aria-label="House / flat and street" value={addr.line} onChange={(e) => setAddr({ ...addr, line: e.target.value.slice(0, 120) })} placeholder="House / flat no. and street" className={`${field} sm:col-span-2`} />
              <input aria-label="Area" value={addr.area} onChange={(e) => setAddr({ ...addr, area: e.target.value.slice(0, 60) })} placeholder="Area / locality" className={field} />
              <input aria-label="Landmark (optional)" value={addr.landmark} onChange={(e) => setAddr({ ...addr, landmark: e.target.value.slice(0, 60) })} placeholder="Landmark (optional)" className={field} />
              <input aria-label="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value.replace(/[^A-Za-z .-]/g, '').slice(0, 40) })} placeholder="City" className={field} />
              <input aria-label="Pincode" inputMode="numeric" value={addr.pincode} onChange={(e) => {const pin=e.target.value.replace(/\D/g, '').slice(0, 6);setAddr({...addr,pincode:pin});setHomePin(null);updateAppointment({pincode:pin,address:null,date:null,time:null});}} placeholder="6-digit pincode" className={field} />
              
              <HomePinField value={homePin} onChange={setHomePin} who="sample collector" />
            </fieldset></div>}/ >}

      {step === 4 && lab && <LabReview lab={lab} centreId={centreId}
        items={pkg?[{code:pkg.code,name:pkg.name,price:pkg.price}]:chosen.flatMap(code=>{const test=byCode.get(code);return test?[{code,name:test.name,price:lab.prices_vary?undefined:lab.selected.find(t=>t.code===code)?.price}]:[];})}
        preparationTests={pkg?pkg.tests.flatMap(t=>byCode.get(t.code)?[byCode.get(t.code)!]:[]):chosen.flatMap(code=>byCode.get(code)?[byCode.get(code)!]:[])}
        date={date} time={time} slotMinutes={availability?.slot_minutes} visit={mode} address={[addr.line,addr.area,addr.landmark,addr.city,addr.pincode].filter(Boolean).join(', ')}
        patient={forWho?(()=>{const member=family.find(f=>String(f.memberUserId)===forWho);return member?{...member}:rx?.family_member_id===forWho?{name:rx.patient_name}:null;})():hcReq?.patient&&(!hcReq.patientProfileId||hcReq.patientProfileId!==reviewProfile?.patientProfileId)?{name:hcReq.patient}:reviewProfile?{name:reviewProfile.fullName,gender:reviewProfile.gender,dateOfBirth:reviewProfile.dateOfBirth,phone:reviewProfile.phone,email:reviewProfile.email}:null}
        patientLoading={profileBusy} patientError={profileError} onRetryPatient={()=>setProfileTry(n=>n+1)} family={family} defaultPatientLabel={hcReq?.patient||undefined} forWho={forWho} onPatient={setForWho}
        testsTotal={scheduleTestsTotal} homeFee={home?.fee} total={scheduleTotal} pay={pay} onPay={setPay} upi={upi} onUpi={setUpi} onEdit={setStep} onBook={book} busy={busy} error={error}
        disabledReason={reviewDisabledReason({busy,checking:availabilityBusy,availabilityError,slotValid:times.includes(time),addressReady:addrReady,pay,upi,hasTests:!!pkg||chosen.length>0,hasCentre:!!centreId,total:scheduleTotal})}/ >}
      {error && !(step === 4 && lab) && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
      <nav aria-label="Booking step navigation" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <button type="button" disabled={busy} onClick={()=>step > 1 ? setStep(step-1) : navigate('/lab-bookings')} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">{step > 1 ? 'Back to previous step' : 'My lab bookings'}</button>
        {step < 3 && !(step === 2 && !pkg && !labMode) && !(step === 1 && !labMode && !pkg && catalogueView === 'tests') && <button type="button" disabled={busy || (step === 1 ? !chosen.length && !pkg : step === 2 ? !lab || !centreId || !!labsErr : !lab || !centreId || !time || !times.includes(time) || !addrReady)} onClick={()=>setStep(step+1)} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{step === 1 ? 'Continue to select centre' : step === 2 ? 'Continue to date and time' : 'Continue to review'}</button>}
      </nav>
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
  const sampleLabel = specimenType || 'Not provided';
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
