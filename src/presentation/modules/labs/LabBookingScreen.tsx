import ThemedSelect from '../../components/forms/ThemedSelect';
import BookingForChip,{useFamilyBookingSelection} from '../family/BookingForChip';
import {useSearchArea,addressAt} from '../../../services/location';
import {labCity,combinedEstimate,packageCentres} from './labFlowDetails';
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
import LabReview,{type ReviewPatient} from './LabReview';
import LabPatientDetails from './LabPatientDetails';
import LabBrowse from './LabBrowse';
import LabDetailSelection from './LabDetailSelection';
import './LabJourney.css';
import {reviewDisabledReason} from './labReviewDetails';
import {payOnline,PaymentCancelled} from '../../../services/razorpayCheckout';
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
  const labParam = params.get('lab'); // a lab chosen in the search: shown first once tests are picked
  const [labPage, setLabPage] = useState<LabPublic | null>(null);
  const [labPageState,setLabPageState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
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
  const requestedStep = Math.min(5, Math.max(1, Math.trunc(Number(params.get('step'))) || 1));
  const setStep = (next: number) => { const updated = latestParams(); updated.set('step', String(next)); navigationParams.current = updated; setParams(updated); };
  const setChosen = (next: string[] | ((current: string[]) => string[])) => { const selected = Array.from(new Set(typeof next === 'function' ? next(chosenRef.current) : next)); chosenRef.current = selected; setChosenState(selected); const updated = latestParams(); updated.set('tests', selected.join(',')); navigationParams.current = updated; setParams(updated, {replace:true}); };
  const submitting = useRef(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(requestedStep);
  useEffect(() => { if (previousStep.current === requestedStep) return; previousStep.current = requestedStep; stepHeading.current?.focus({preventScroll:true}); }, [requestedStep]);

  const [comparisonAddress,setComparisonAddress]=useState<PatientAddress|null>(null);
  const searchArea=useSearchArea();
  const [resolvedCity,setResolvedCity]=useState('');
  useEffect(()=>{setResolvedCity('');if(!searchArea||searchArea.city||searchArea.label.includes(','))return;let active=true;addressAt(searchArea).then(a=>{if(active&&a?.city)setResolvedCity(a.city);});return()=>{active=false;};},[searchArea]);
  const city=resolvedCity||labCity(searchArea,comparisonAddress?.city||'');
  const setCity=(_value:string)=>undefined;
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
      setAddr((cur) => (cur.line ? cur : { line: d.addressLine1 || '', area: d.addressLine2 || '', landmark: d.landmark || '', city: d.city || '', pincode: d.pincode || '' }));
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
  const addressHasFields=addr.line.trim().length>=5&&addr.city.trim().length>=2&&validHomePin(addr.pincode);
  const step = requestedStep <= 2 ? requestedStep : !lab||!labs?.some(l=>l.id===lab.id&&l.locations.some(c=>c.id===centreId)) ? 2 : mode==='HOME'&&requestedStep>3&&!addressHasFields?3:requestedStep >= 4 && !time ? 3 : requestedStep;
  const [pay, setPay] = useState<'UPI' | 'CASH'>('CASH');
  const [reason,setReason]=useState('');
  const [catalogueRetry,setCatalogueRetry]=useState(0);
  const [upi, setUpi] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [family, setFamily] = useState<PatientFamilyMember[]>([]);
  const [forWho, setForWho] = useState('');
  useFamilyBookingSelection(family,setForWho);
  const [reviewProfile,setReviewProfile]=useState<PatientProfileData|null>(null);
  const [profileBusy,setProfileBusy]=useState(false);
  const [profileError,setProfileError]=useState<string|null>(null);
  const [profileTry,setProfileTry]=useState(0);
  const needsReview=requestedStep>=4;
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
  useEffect(() => { setError(null);fetchLabTestsApi().then(setTests).catch((e) => setError(labError(e, 'Could not load tests.'))); }, [catalogueRetry]);
  useEffect(() => { if (!rxId&&city) healthPackagesApi(city).then(setPackages).catch(() => setPackages([])); }, [rxId,city]);
  // Book a package: its lab is fixed, so go straight to centre/home and time.
  const choosePackage = (p: PublicPackage) => {setError(null);setPkg(p);setChosen([]);setLab(null);setCentreId(null);const updated=latestParams();updated.set('package',p.code);updated.set('step','1');navigationParams.current=updated;setParams(updated,{replace:true});};
  useEffect(()=>{const code=params.get('package');if(code&&packages)setPkg(packages.find(p=>p.code===code)||null);},[params.get('package'),packages]);
  useEffect(() => { getMyUserId().then((id) => (id ? getFamilyMembersApi(id) : [])).then(setFamily).catch(() => setFamily([])); }, []);
  useEffect(() => {
    if (!rxId) return;
    rxTestsApi(rxId).then((r) => { setRx(r); if (r.family_member_id) setForWho(String(r.family_member_id)); if (!params.has('tests')) setChosen(Array.from(new Set(r.tests.map((t) => t.code).filter((c): c is string => !!c)))); })
      .catch((e) => setError(labError(e, 'Could not open the prescription.')));
  }, [rxId]);
  useEffect(() => {

    if (!tests || chosen.some(code=>!tests.some(t=>t.code===code))) return;
    setLabs(null);setLabsErr(null);
    if (!chosen.length&&!pkg) { setLabs([]);setLab(null);setCentreId(null);return; }
    if(!city&&!searchArea)return;
    let active=true;
    const timer=setTimeout(()=>(pkg&&!chosen.length?labPublicApi(pkg.lab.id).then(d=>[{...d,tests_offered:d.tests?.length||0,selected:[],total:0}] as LabHit[]):findLabsApi(chosen,city,searchArea?{lat:searchArea.lat,lng:searchArea.lng,pincode:searchArea.pincode||addr.pincode,radius_km:5}:undefined)).then(rows=>{if(active)setLabs(packageCentres(rows,pkg));}).catch(e=>{if(active)setLabsErr(labError(e,'Could not load labs right now.'));}),300);
    return()=>{active=false;clearTimeout(timer);};
  }, [chosen, labsTry, tests,city,pkg,searchArea?.lat,searchArea?.lng,searchArea?.pincode,addr.pincode]);
  useEffect(()=>{
    if(!tests)return;
    const allowed=new Set(tests.map(t=>t.code));
    const valid=chosen.filter(code=>allowed.has(code));
    if(valid.length===chosen.length)return;
    setLinkNotice(true);setChosen(valid);
    if(!valid.length){const updated=latestParams();updated.set('step','1');updated.delete('lab');navigationParams.current=updated;setParams(updated,{replace:true});}
  },[tests,chosen]);
  useEffect(()=>{
    if(!labs)return;
    const eligible=labParam?labs.find(l=>l.id===labParam):null;
    if(eligible){if(lab?.id!==eligible.id){setLab(eligible);setCentreId(eligible.locations.find(c=>String(c.id)===params.get('centre'))?.id??eligible.locations[0]?.id??null);}else setLab(eligible);}
    // Opening a laboratory from browse is valid before any tests are selected. Keep the
    // lab in the URL so its catalogue can render; only reject it once selected tests
    // prove that the laboratory cannot fulfil the basket.
    else if(labParam&&chosen.length){setLab(null);setCentreId(null);const updated=latestParams();updated.delete('lab');navigationParams.current=updated;setParams(updated,{replace:true});}
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
  useEffect(() => {let active=true;if(!labParam){setLabPage(null);setLabPageState('idle');return;}setLabPage(null);setLabPageState('loading');labPublicApi(labParam).then(value=>{if(active){setLabPage(value);setLabPageState('ready');}}).catch(()=>{if(active)setLabPageState('error');});return()=>{active=false};}, [labParam]);
  const labMode = requestedStep===1 && !!labParam && !pkg && !rx && !hcReq;
  // In single-lab mode that lab is the lab: select it as soon as its price for these tests is known.
  useEffect(() => {
    if (!labMode || !labs || lab) return;
    const hit = labs.find((l) => l.id === labParam);
    if (hit) { selectLab(hit); }
  }, [labMode, labs]); // eslint-disable-line react-hooks/exhaustive-deps
  const labModeMissing = labMode && chosen.length > 0 && !!labs && !labs.some((l) => l.id === labParam);
  const labModeSum = labMode ? chosen.reduce((n, c) => n + (labPage?.tests?.find((t) => t.code === c)?.price || 0), 0) : 0;
  const toggle = (code: string) => {if(pkg?.tests.some(t=>t.code===code))return;setChosen((c) => (c.includes(code) ? c.filter((x) => x !== code) : [...c, code]));};
  const home = lab?.settings?.home;
  const [centrePrices,setCentrePrices]=useState<{key:string;prices:Record<string,number>}|null>(null);
  const priceKey=lab?.id+':'+centreId+':'+chosen.join(',')+':'+city;
  useEffect(()=>{if(!lab||!centreId||!chosen.length)return;let active=true;Promise.all(chosen.map(async code=>{const rows=await findLabsApi([code],city);const hit=rows.find(l=>l.id===lab.id);const centre=hit?.locations.find(c=>c.id===centreId);return [code,centre?.total??(!hit?.prices_vary?hit?.total:undefined)] as const;})).then(rows=>{if(active)setCentrePrices({key:priceKey,prices:Object.fromEntries(rows.filter((r):r is readonly[string,number]=>typeof r[1]==='number'))});}).catch(()=>undefined);return()=>{active=false;};},[priceKey]);
  const pricedLab=lab?{...lab,prices_vary:false,selected:lab.selected.flatMap(t=>{const price=centrePrices?.key===priceKey?centrePrices.prices[t.code]:!lab.prices_vary?t.price:undefined;return price!=null?[{...t,price}]:[];})}:null;
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
  const testsTotal = (lab?.locations.find((c) => c.id === centreId)?.total ?? lab?.total ?? 0);
  const total = testsTotal + fee;
  const scheduleTestsTotal=lab?.locations.find(c=>c.id===centreId)?.total??lab?.total;
  const scheduleTotal=typeof scheduleTestsTotal==='number'&&Number.isFinite(scheduleTestsTotal)&&(mode!=='HOME'||typeof home?.fee==='number')?scheduleTestsTotal+fee:undefined;
  const addrReady = mode !== 'HOME' || (addr.line.trim().length >= 5 && addr.city.trim().length >= 2 && homeOk);

  const book = async () => {
    if (submitting.current || availabilityBusy || availabilityError || step !== 5 || !lab || !centreId || !time || !times.includes(time)) return;
    if (mode === 'HOME' && !addrReady) { setError('Complete the address, with a pincode this lab serves.'); return; }
    submitting.current = true; setBusy(true); setError(null);
    let completed=false;
    try {
      const onlinePayment = pay === 'UPI' ? await payOnline({
        amount: Number(scheduleTotal),
        purpose: 'lab',
        description: `Lab tests at ${lab.name}`,
        prefill: {
          name: patient?.name || reviewProfile?.fullName || undefined,
          email: patient?.email || reviewProfile?.email || undefined,
          contact: patient?.phone || reviewProfile?.phone || undefined,
        },
      }) : undefined;
      const booked=await bookLabTestsApi({
        lab_partner_id: lab.id, location_id: centreId, test_codes: chosen, package_codes: pkg ? [pkg.code] : undefined, visit_date: date, visit_time: time, payment_mode: pay,
        payment: pay === 'UPI' ? {...onlinePayment,payment_method:'UPI'} : undefined,
        visit_type: mode, home_address: mode === 'HOME' ? { line: addr.line.trim(), area: addr.area.trim() || undefined, landmark: addr.landmark.trim() || undefined, city: addr.city.trim(), pincode: addr.pincode, pin: homePin || undefined } : undefined,
        prescription_id: rx?.prescription_id,
        family_member_id: forWho || undefined,
        hc_lab_request_id: hcReq?.id,
        clinical_notes: reason.trim()||undefined,
      });
      completed=true;
      navigate(`/lab-tests/booked/${encodeURIComponent(booked.id)}`,{replace:true});
    } catch (e) { if(e instanceof PaymentCancelled)setError('Payment cancelled. You have not been charged.');else if((e as {response?:{status?:number}})?.response?.status===409){keepDay.current=date;setSlotNotice(labError(e,'This time is now full. If payment succeeded, the amount is being refunded.'));setTime('');setAvailabilityTry(n=>n+1);setStep(3);}else setError(labError(e, 'Could not book. If payment succeeded, the amount is being refunded. Please try again.')); } finally { if(!completed){submitting.current = false; setBusy(false);} }
  };

  const patient:ReviewPatient|null=forWho?(()=>{const member=family.find(f=>String(f.memberUserId)===forWho);return member?{...member}:rx?.family_member_id===forWho?{name:rx.patient_name}:null;})():hcReq?.patient&&(!hcReq.patientProfileId||hcReq.patientProfileId!==reviewProfile?.patientProfileId)?{name:hcReq.patient}:reviewProfile?{name:reviewProfile.fullName,gender:reviewProfile.gender,dateOfBirth:reviewProfile.dateOfBirth,phone:reviewProfile.phone,email:reviewProfile.email}:null;
  const normalBrowse=step===1&&!labParam&&!rx&&!hcReq;
  const card = 'bg-white rounded-2xl border border-slate-200 p-5';
  const field = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';

  return (
    <div className="lj-flow w-full space-y-5 pb-10">{step===1&&!normalBrowse&&!labPage&&<LocationBar compact purpose="find labs near you"/>}
      {!normalBrowse&&step<=2&&!(step===1&&labPage)&&<><button disabled={busy} onClick={() => step > 1 ? setStep(step-1) : navigate(-1)} className="inline-flex items-center gap-1 text-sm font-bold text-slate-600"><ArrowLeft className="w-4 h-4" /> Back</button>
      <div>
        <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><FlaskConical className="w-6 h-6 text-teal-700" /> {step===2?'Select a lab':'Book lab tests'}</h1>
        <p className="text-sm text-slate-500">{step===5?"Review your booking details and choose how to pay.":"Choose your tests, compare labs near you, and visit a collection centre or have the sample collected at home."}</p>
        </div>

      </div>

      </>}
      {step>=3&&<><nav className="lj-breadcrumb"><button onClick={()=>setStep(1)}>Lab tests</button><span aria-hidden="true">&rsaquo;</span><span>{lab?.name}</span></nav><LabBookingProgress step={step} /></>}
      {linkNotice && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Some tests in this link are no longer available.</p>}
      {normalBrowse&&<LabBrowse onOpen={id=>{const next=latestParams();next.set('lab',id);next.set('step','1');setParams(next);}}/>}
      {!normalBrowse&&!(step===1&&labPage)&&<h2 ref={stepHeading} tabIndex={-1} className={(step===2?'sr-only ':'')+"text-xl font-extrabold text-slate-900 tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-orange-500"}>{!normalBrowse&&['Select tests','Select a lab','Collection method & schedule','Patient details','Review & pay'][step-1]}</h2>}
      {step === 1 && labPage && <LabDetailSelection lab={labPage} chosen={chosen} onToggle={toggle} onContinue={()=>setStep(2)} onBack={()=>{const next=latestParams();next.delete('lab');setParams(next);}}/>}
      {step===1&&labMode&&labPageState==='loading'&&<div className="lj-state" role="status">Loading laboratory and tests…</div>}
      {step===1&&labMode&&labPageState==='error'&&<div className="lj-state" role="alert"><h2>Could not load this laboratory</h2><p>Please retry or return to nearby labs.</p><button onClick={()=>{const next=latestParams();next.delete('lab');setParams(next);}}>Back to labs</button></div>}
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

      {step <= 2 && pkg && (
        <section aria-label="Your health package" className="rounded-2xl border border-teal-300 bg-teal-50/40 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-teal-800 flex items-center gap-1"><PackageCheck className="w-4 h-4" /> Health package</p>
              <h2 className="text-lg font-black text-slate-900">{pkg.name}</h2>
              <p className="text-xs text-slate-600">{pkg.lab.name}{pkg.lab.registration_number ? ` · Reg. ${pkg.lab.registration_number}` : ''}</p>
            </div>
            <button type="button" onClick={() => {setPkg(null);setLab(null);updateAppointment({package:null,step:'1',lab:null,date:null,time:null});}} className="text-xs font-bold text-slate-600 inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Change</button>
          </div>
          <PackageFacts p={pkg} />
          <ul className="grid sm:grid-cols-2 gap-1.5">{pkg.tests.map((t) => <li key={t.code} className="text-xs text-slate-700"><b>{t.name}</b> <span className="text-slate-500">· {t.parameters} parameter{t.parameters === 1 ? '' : 's'}</span>{t.about && <span className="block text-[11px] text-slate-500">{t.about}</span>}</li>)}</ul>
        </section>
      )}

      {!labMode && !normalBrowse && (<>
      <BookingForChip family={family} value={forWho} onChange={setForWho}/>{step === 1 && <LabTestSelection city={city} patientPin={searchArea?.pincode||addr.pincode} estimate={combinedEstimate(labs)} estimateLoading={labs===null} selectedPackage={pkg} tests={tests} chosen={chosen} onToggle={toggle} onClear={()=>setChosen([])} onContinue={()=>setStep(2)} query={q} onQuery={setQ} packages={packages} onPackage={choosePackage} error={error} onRetry={()=>setCatalogueRetry(n=>n+1)} onSelectOffer={(code,selected)=>{const codes=Array.from(new Set([...chosen,code]));setChosen(codes);selectLab(selected);setStep(2);}} />}

      {step === 2 && (chosen.length > 0||!!pkg) && (
        <LabComparison packageSelection={pkg} onRemoveTests={codes=>setChosen(current=>current.filter(c=>!codes.includes(c)))} savedLocation={comparisonAddress?.pin?{...comparisonAddress.pin,label:[comparisonAddress.addressLine2,comparisonAddress.city,comparisonAddress.pincode].filter(Boolean).join(", ")}:null} patientPin={searchArea?.pincode||addr.pincode} labs={labs} pinnedId={rx?.hospital_lab?.id || labParam || null} error={labsErr} onRetry={() => setLabsTry(n=>n+1)} city={city} onCity={setCity} selectedId={lab?.id || null} onSelect={selectLab} selectedLab={lab} selectedTests={chosen.map(code=>({code,name:byCode.get(code)?.name||code,fasting_hours:byCode.get(code)?.fasting_hours,patient_instructions:byCode.get(code)?.patient_instructions}))} onChange={()=>setStep(1)} onContinue={()=>setStep(3)} canContinue={!!lab && !!centreId && !!labs?.some(l=>l.id===lab.id && l.locations.some(c=>c.id===centreId)) && !labsErr} busy={busy}/>

      )}
      </>)}

      {step === 2 && (labMode) && <section aria-label="Choose a lab" className={card}><h3 className="font-bold">{lab?.name || 'Checking selected lab...'}</h3><p className="mt-2 text-sm text-slate-500">{lab?.locations.map(c=>[c.name,c.address,c.city].filter(Boolean).join(', ')).join(' / ') || 'Centre details not provided'}</p>{lab && <p className="mt-2 font-bold">{rupees(lab.total)}</p>}{labModeMissing && <p role="alert">This lab cannot offer the selected tests together. Go back to change your tests.</p>}</section>}
      {(step === 3) && lab && <LabSchedule notes={reason} onNotes={setReason} nextLabel="Continue to patient details" lab={pricedLab||lab} centreId={centreId} onCentre={id=>{setCentreId(id);updateAppointment({centre:String(id),date:null,time:null});}} mode={mode} onMode={setMode}
        tests={[...(pkg?pkg.tests.map(t=>({code:t.code,name:t.name,fasting_hours:pkg.fasting_hours,patient_instructions:byCode.get(t.code)?.patient_instructions||null})):[]),...chosen.flatMap(code=>byCode.get(code)?[byCode.get(code)!]:[])]}
        date={date} time={time} onDate={value=>{keepDay.current=null;setDate(value);}} onTime={value=>{setSlotNotice(null);setTime(value);}} onChangeLab={()=>setStep(2)} onContinue={()=>setStep(4)}
        availability={availability} loading={availabilityBusy||(!availability&&!availabilityError&&(mode==='LAB_VISIT'||validHomePin(addr.pincode)))} error={availabilityError} onRetry={()=>setAvailabilityTry(n=>n+1)} notice={slotNotice}
        address={[addr.line,addr.area,addr.city,addr.pincode].filter(Boolean).join(', ')} pincode={addr.pincode} addressReady={addrReady} savedLocation={comparisonAddress?.pin}
        testsTotal={scheduleTestsTotal} total={scheduleTotal} busy={busy}
        addressFields={<div className="mt-3 space-y-3"><p className="text-sm">{[addr.line,addr.city,addr.pincode].filter(Boolean).join(', ')}</p><details className="lj-address-edit"><summary>Change / Add new address</summary><div className="mt-3 space-y-3">{savedAddresses.length>0&&<label className="lab-schedule-centre">Saved collection address<ThemedSelect aria-label="Saved collection address" value={savedAddresses.find(a=>a.addressLine1===addr.line&&a.pincode===addr.pincode)?.addressId||''} onChange={e=>{const a=savedAddresses.find(a=>a.addressId===e.target.value);if(!a){setAddr({line:'',area:'',landmark:'',city:city,pincode:addr.pincode});setHomePin(null);updateAppointment({address:null,date:null,time:null});}if(a){setAddr({line:a.addressLine1||'',area:a.addressLine2||'',landmark:a.landmark||'',city:a.city||'',pincode:a.pincode||''});setHomePin(a.pin||null);updateAppointment({address:a.addressId,pincode:a.pincode,date:null,time:null});}}}><option value="">Enter another address</option>{savedAddresses.map(a=><option key={a.addressId} value={a.addressId}>{[a.label,a.addressLine1,a.city,a.pincode].filter(Boolean).join(', ')}</option>)}</ThemedSelect></label>}
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Collection address">
              <input aria-label="House / flat and street" value={addr.line} onChange={(e) => setAddr({ ...addr, line: e.target.value.slice(0, 120) })} placeholder="House / flat no. and street" className={`${field} sm:col-span-2`} />
              <input aria-label="Area" value={addr.area} onChange={(e) => setAddr({ ...addr, area: e.target.value.slice(0, 60) })} placeholder="Area / locality" className={field} />
              <input aria-label="Landmark (optional)" value={addr.landmark} onChange={(e) => setAddr({ ...addr, landmark: e.target.value.slice(0, 60) })} placeholder="Landmark (optional)" className={field} />
              <input aria-label="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value.replace(/[^A-Za-z .-]/g, '').slice(0, 40) })} placeholder="City" className={field} />
              <input aria-label="Pincode" inputMode="numeric" value={addr.pincode} onChange={(e) => {const pin=e.target.value.replace(/\D/g, '').slice(0, 6);setAddr({...addr,pincode:pin});setHomePin(null);updateAppointment({pincode:pin,address:null,date:null,time:null});}} placeholder="6-digit pincode" className={field} />

              <HomePinField value={homePin} onChange={setHomePin} who="sample collector" />
            </fieldset></div></details></div>}/ >}

      {step===4&&lab&&<LabPatientDetails family={family} patient={patient} who={forWho} onPatient={setForWho} reason={reason} onReason={setReason} rx={rx} onRx={setRx} loading={profileBusy} error={profileError} onRetry={()=>setProfileTry(n=>n+1)} onContinue={()=>setStep(5)}/>}
      {step === 5 && lab && <LabReview reason={reason} packageSaving={pkg&&pkg.separate_price>pkg.price?pkg.saving:undefined} lab={pricedLab||lab} centreId={centreId}
        items={[...(pkg?[{code:pkg.code,name:pkg.name,price:pkg.price}]:[]),...chosen.flatMap(code=>{const test=byCode.get(code);return test?[{code,name:test.name,price:pricedLab?.selected.find(t=>t.code===code)?.price}]:[];})]}
        preparationTests={pkg?pkg.tests.flatMap(t=>byCode.get(t.code)?[byCode.get(t.code)!]:[]):chosen.flatMap(code=>byCode.get(code)?[byCode.get(code)!]:[])}
        date={date} time={time} slotMinutes={availability?.slot_minutes} visit={mode} address={[addr.line,addr.area,addr.landmark,addr.city,addr.pincode].filter(Boolean).join(', ')}
        patient={patient}
        patientLoading={profileBusy} patientError={profileError} onRetryPatient={()=>setProfileTry(n=>n+1)} family={family} defaultPatientLabel={hcReq?.patient||undefined} forWho={forWho} onPatient={setForWho}
        testsTotal={scheduleTestsTotal} homeFee={home?.fee} total={scheduleTotal} pay={pay} onPay={setPay} upi={upi} onUpi={setUpi} onEdit={value=>setStep(value)} onBook={book} busy={busy} error={error}
        disabledReason={reviewDisabledReason({busy,checking:availabilityBusy||profileBusy,availabilityError,slotValid:times.includes(time),addressReady:addrReady,pay,upi,hasTests:!!pkg||chosen.length>0,hasCentre:!!centreId,total:scheduleTotal})}/ >}
      {!normalBrowse && error && !(step === 5 && lab) && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
      {!normalBrowse && step === 1 && !labPage && (
        <nav aria-label="Booking step navigation" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <button type="button" disabled={busy} onClick={()=>step > 1 ? setStep(step-1) : navigate('/lab-bookings')} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">{step > 1 ? 'Back to previous step' : 'My lab bookings'}</button>
          {!(step === 1 && !labMode && !pkg) && <button type="button" disabled={busy || (!chosen.length && !pkg)} onClick={()=>setStep(step+1)} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Continue to select centre</button>}
        </nav>
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
