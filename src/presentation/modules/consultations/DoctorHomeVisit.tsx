import type {PatientFamilyMember} from '../../../services/familyHelper';
import {useEffect,useMemo,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowLeft,ArrowRight,CalendarDays,Check,Clock,House,Info,MapPin,Moon,Plus,ShieldCheck,Stethoscope,Sun,Sunrise} from 'lucide-react';
import {bookHomeVisitApi,checkHomeVisitApi,homeVisitAreaSummary,homeVisitOfferApi,labError,rupees,type HomeVisitDoctor} from '../../../services/labHelper';
import {getAddressesApi,getPatientProfileApi,type PatientAddress} from '../../../services/patientHelper';
import {payOnline,PaymentCancelled,type PaidOnline} from '../../../services/razorpayCheckout';
import {paidLabel} from '../../../config/payments';
import {formatDoctorName} from '../../../utils/doctorLabel';
import HomePinField from '../../components/location/HomePinField';
import CancellationRefundPolicy from '../../components/CancellationRefundPolicy';
import {dateLabel,timeLabel} from '../bookings/bookingsPresentation';
import {istDateTime12} from './homeVisitStatus';
import './DoctorJourney.css';
import './DoctorSlotPicker.css';
import './DoctorHomeVisit.css';

const istDay=(offsetDays=0)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+offsetDays*86400000));
const dayChip=(iso:string,opt:Intl.DateTimeFormatOptions)=>new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-IN',{...opt,timeZone:'UTC'});
const niceDay=(iso:string)=>dayChip(iso,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
export const HOME_VISIT_REQUEST_NOTE='The doctor confirms your request. If they can’t come, you’re not charged (online payments are refunded).';
type Receipt=Awaited<ReturnType<typeof bookHomeVisitApi>>;
type Addr={line:string;area:string;city:string;pincode:string;landmark:string};
const STEPS=['Date & time','Patient & address','Review & pay'];
const PERIODS=[{name:'Morning',from:0,to:12,Icon:Sunrise},{name:'Afternoon',from:12,to:16,Icon:Sun},{name:'Evening',from:16,to:24,Icon:Moon}];

/**
 * The one doctor home-visit booking flow (Find doctors › Home visit and Home care › Doctor at home).
 * Steps: date & time → patient & address → review & pay → request sent. Everything is checked with the
 * server BEFORE any online payment, so a patient is never charged for a request that can't be sent.
 */
export function DoctorHomeVisit({doctor,offer,pincode,onBack,backLabel='Back to consultation types',family,who,onWho}:{family:PatientFamilyMember[];who:string;onWho:(value:string)=>void;doctor:{id:string;name:string};offer:HomeVisitDoctor;pincode:string;onBack:()=>void;backLabel?:string}){
 const doctorLabel=formatDoctorName(doctor.name)||'the doctor';
 const [params,setParams]=useSearchParams();
 const step=Math.min(2,Math.max(0,Number(params.get('hv_step')||0)));
 const goStep=(n:number)=>{setParams(p=>{const q=new URLSearchParams(p);if(n)q.set('hv_step',String(n));else q.delete('hv_step');return q;});window.scrollTo({top:0,behavior:'smooth'});};
 const covered=useMemo(()=>new Set(offer.pincodes),[offer.pincodes]);
 const areaText=homeVisitAreaSummary(offer,pincode);

 // ── Step 1: dates (14 days, free times per day) ──
 const [days,setDays]=useState<{date:string;times:string[]|null}[]>(()=>Array.from({length:7},(_,i)=>({date:istDay(i),times:null})));
 const [date,setDate]=useState(offer.next_slot?.date||istDay(0)),[time,setTime]=useState(params.get('hv_time')||''),[daysErr,setDaysErr]=useState('');
 useEffect(()=>{let alive=true;const todo=days.filter(d=>d.times===null);if(!todo.length)return;
  Promise.all(todo.map(d=>homeVisitOfferApi(doctor.id,d.date).then(o=>({date:d.date,times:o.slots||[]})).catch(()=>null))).then(res=>{if(!alive)return;
   setDaysErr(res.some(r=>r===null)?'Some dates could not be loaded.':'');
   setDays(cur=>cur.map(d=>res.find(r=>r?.date===d.date)||(d.times===null?{...d,times:[]}:d)));});
  return()=>{alive=false;};},[days,doctor.id]);
 const today=istDay();
 const day=days.find(d=>d.date===date);
 const loadingDays=days.some(d=>d.times===null);
 // If the chosen day has no times once loaded, move to the first day that has.
 // eslint-disable-next-line react-hooks/set-state-in-effect -- move off an empty day once dates load
 useEffect(()=>{if(loadingDays)return;if(day&&day.times&&day.times.length)return;const first=days.find(d=>d.times&&d.times.length);if(first&&first.date!==date){setDate(first.date);setTime('');}},[loadingDays]);// eslint-disable-line react-hooks/exhaustive-deps
 const reloadTimes=()=>setDays(cur=>cur.map(d=>({...d,times:null})));

 // ── Step 2: patient + address + reason ──
 const [self,setSelf]=useState<{name:string|null;phone?:string|null;gender?:string|null;dateOfBirth?:string|null}>({name:null});
 const [saved,setSaved]=useState<PatientAddress[]|null>(null);
 const [addrChoice,setAddrChoice]=useState<string>('');// saved addressId or 'new'
 const [address,setAddress]=useState<Addr>({line:'',area:'',city:'',pincode:covered.has(pincode)?pincode:'',landmark:''});
 const [pin,setPin]=useState<{lat:number;lng:number}|null>(null);
 const [reason,setReason]=useState('');
 const [touched,setTouched]=useState<Record<string,boolean>>({}),[tried,setTried]=useState(false);
 useEffect(()=>{getPatientProfileApi().then(p=>{if(p)setSelf({name:p.fullName,phone:p.phone,gender:p.gender,dateOfBirth:p.dateOfBirth});}).catch(()=>{});
  getAddressesApi().then(list=>{setSaved(list);const ok=list.filter(a=>covered.has(a.pincode||''));const pick=ok.find(a=>a.isDefault&&a.pincode===pincode)||ok.find(a=>a.pincode===pincode)||ok.find(a=>a.isDefault)||ok[0];
   if(pick)pickSaved(pick);else setAddrChoice('new');}).catch(()=>{setSaved([]);setAddrChoice('new');});},[]);// eslint-disable-line react-hooks/exhaustive-deps
 function pickSaved(a:PatientAddress){setAddrChoice(a.addressId);setAddress({line:a.addressLine1||'',area:a.addressLine2||'',city:a.city||'',pincode:a.pincode||'',landmark:a.landmark||''});setPin(a.pin||null);}
 const member=who?family.find(f=>String(f.memberUserId)===who):null;
 const patientName=member?`${member.name} (${member.relationship})`:self.name?`${self.name} (You)`:'You';
 const errs={
  line:address.line.trim().length<5?'Enter the house / flat number and street.':'',
  city:address.city.trim().length<2?'Enter the city.':'',
  pincode:!/^[1-9]\d{5}$/.test(address.pincode)?'Enter a valid 6-digit PIN code.':!covered.has(address.pincode)?`${doctorLabel} doesn’t make home visits at this address (PIN ${address.pincode}). Choose another address in the doctor’s area.`:'',
  reason:reason.trim().length<5?'Tell the doctor briefly why you need a home visit (at least 5 characters).':'',
 };
 const show=(k:keyof typeof errs)=>(tried||touched[k])&&errs[k]?errs[k]:'';
 const step2Ok=!errs.line&&!errs.city&&!errs.pincode&&!errs.reason;

 // ── Step 3: payment + send ──
 const [pay,setPay]=useState<'CASH'|'UPI'>('CASH'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[slotGone,setSlotGone]=useState(false),[receipt,setReceipt]=useState<Receipt|null>(null);
 const body=()=>({doctor_partner_id:doctor.id,visit_date:date,visit_time:time,reason:reason.trim(),family_member_id:who||undefined,
  address:{line:address.line.trim(),area:address.area.trim()||undefined,city:address.city.trim(),pincode:address.pincode,landmark:address.landmark.trim()||undefined,pin:pin||undefined}});
 const fail=(e:unknown,fallback:string)=>{const m=labError(e,fallback);setError(m);setSlotGone(/no longer available|choose another time/i.test(m));};
 const send=async()=>{
  if(busy)return;setError('');setSlotGone(false);setBusy(true);
  try{await checkHomeVisitApi(body());}catch(e){fail(e,'Unable to check your request. Please try again.');setBusy(false);return;}
  let payment:PaidOnline|undefined;
  if(pay==='UPI'){try{payment=await payOnline({amount:Number(offer.fee),purpose:'home_visit',description:`Home visit by ${doctorLabel}`});}
   catch(e){setError(e instanceof PaymentCancelled?e.message:`${(e as Error)?.message||'The payment failed.'} You can try again or choose to pay the doctor after the visit.`);setBusy(false);return;}}
  try{setReceipt(await bookHomeVisitApi({...body(),payment_mode:pay,payment}));setParams(p=>{const q=new URLSearchParams(p);q.delete('hv_step');return q;},{replace:true});}
  catch(e){fail(e,'Unable to send the home visit request. Please try another time.');}
  finally{setBusy(false);}
 };

 const next=()=>{setError('');
  if(step===0){if(!time){setError('Choose a visit time to continue.');return;}goStep(1);return;}
  if(step===1){setTried(true);if(!step2Ok){setError('Check the highlighted details.');setTimeout(()=>document.querySelector<HTMLElement>('.hv-invalid input,.hv-invalid textarea')?.focus(),0);return;}goStep(2);}
 };
 // Opening a later step without a time (e.g. reload) goes back to step 1.
 useEffect(()=>{if(step>0&&!time&&!receipt)goStep(0);if(step===2&&!step2Ok&&!receipt)goStep(1);},[step]);// eslint-disable-line react-hooks/exhaustive-deps

 if(receipt){const by=istDateTime12(receipt.expires_at),patient=receipt.patient?.family_member_id?`${receipt.patient.name} (${receipt.patient.relationship})`:receipt.patient?.name||'You';
  return <section className="dj dj-confirm hv-confirm" aria-live="polite"><Check/><h1>Request sent</h1><p role="status">Waiting for {formatDoctorName(receipt.doctor_name)||doctorLabel} to confirm{by?` by ${by}`:''}. We’ll notify you as soon as they do.</p>
   <dl><div><dt>Booking number</dt><dd>{receipt.booking_number||'Not provided'}</dd></div><div><dt>Doctor</dt><dd>{formatDoctorName(receipt.doctor_name)||doctorLabel} · Home visit</dd></div><div><dt>Date &amp; time</dt><dd>{dateLabel(receipt.visit_date)}, {timeLabel(receipt.visit_time)}</dd></div><div><dt>Patient</dt><dd>{patient}</dd></div><div><dt>Address</dt><dd>{receipt.address}{receipt.pincode?` – ${receipt.pincode}`:''}</dd></div><div><dt>Fee</dt><dd>{rupees(receipt.fee)} · {receipt.payment_status==='PAID'?paidLabel():'Pay the doctor after the visit (cash or UPI)'}</dd></div></dl>
   <ol className="hv-next"><li><b>Doctor confirms</b><span>You get a 4-digit visit code.</span></li><li><b>Doctor on the way</b><span>You see it in your bookings.</span></li><li><b>At your door</b><span>Share the code so you know it’s your doctor.</span></li></ol>
   <p>If the doctor can’t come, you’re not charged (online payments are refunded). Not for emergencies — call 108.</p>
   <Link className="dj-primary" to="/home-care?tab=mine&view=doctor">View your request</Link><Link to="/home-care?tab=doctor">Back to Home care</Link></section>;}

 const summary=<aside className="dj-appointment-summary hv-summary"><div className="dj-final-heading"><h2>Visit summary</h2>{step>0&&<button onClick={()=>goStep(0)}>Edit</button>}</div>
  <div className="hv-doc"><span aria-hidden><Stethoscope/></span><div><strong>{doctorLabel}</strong><small>{[offer.qualification,offer.specialization].filter(Boolean).join(' · ')||'Doctor'}</small></div></div>
  <dl><div><dt>Visit type</dt><dd>Home visit · about {offer.visit_minutes} min</dd></div><div><dt>Date</dt><dd>{time?niceDay(date):'Not chosen yet'}</dd></div><div><dt>Doctor arrives</dt><dd>{time?timeLabel(time):'Not chosen yet'}</dd></div>{step>0&&<div><dt>Patient</dt><dd>{patientName}</dd></div>}{step>1&&<div><dt>Address</dt><dd>{[address.line,address.area,address.city].filter(Boolean).join(', ')} – {address.pincode}</dd></div>}<div><dt>Home visit fee</dt><dd><strong>{rupees(offer.fee)}</strong></dd></div></dl>
  <p className="dj-no-hold">The time is held only after you send the request. The doctor then confirms it.</p></aside>;

 return <div className="dj dj-book hv-book">
  <button className="dj-back" onClick={onBack}><ArrowLeft/>{backLabel}</button>
  <h1>Book a doctor home visit</h1><p>{doctorLabel} visits you at home · {rupees(offer.fee)} · about {offer.visit_minutes} min</p>
  <ol className="dj-stepper">{STEPS.map((s,i)=><li key={s} aria-current={step===i?'step':undefined}><span>{i<step?<Check/>:i+1}</span>{s}</li>)}</ol>
  <section className="dj-panel">
   {step===0&&<div className="ds-picker">
    <section className="ds-summary hv-doc-row" aria-label="Doctor summary">
     <div className="ds-identity"><div className="hv-avatar" aria-hidden><Stethoscope/></div><div><h2>{doctorLabel}</h2><p>{[offer.qualification,offer.specialization,offer.experience?`${offer.experience} yrs exp`:null].filter(Boolean).join(' · ')}</p></div></div>
     <div className="ds-place"><p><House/>Home visit · about {offer.visit_minutes} min</p><p><MapPin/>Visits {areaText}</p></div>
     <div className="ds-price"><small>Home visit fee</small><strong>{rupees(offer.fee)}</strong><small>Pay after the visit or online</small></div>
    </section>
    <section className="ds-dates-panel"><h2>Select date</h2><p>Next {days.length} days · Only the times this doctor visits homes can be requested.</p>
     <div className="ds-date-strip" aria-label="Visit dates">{days.map(d=>{const n=d.times?.length??0;const cls=d.times===null?'':n?(n<=2?'few':'available'):'unavailable';const status=d.times===null?'Checking…':n?(n<=2?`${n} left`:`${n} times`):'No visits';
      return <button key={d.date} className={cls} aria-pressed={d.date===date} aria-label={`${niceDay(d.date)}, ${status}`} onClick={()=>{setDate(d.date);setTime('');setError('');}}><small>{d.date===today?'Today':dayChip(d.date,{weekday:'short'})}</small><strong>{dayChip(d.date,{day:'2-digit',month:'short'})}</strong><span>{status}</span></button>;})}
      {days.length<14&&<button className="hv-more" onClick={()=>setDays(cur=>[...cur,...Array.from({length:7},(_,i)=>({date:istDay(cur.length+i),times:null}))])}><Plus/><span>More dates</span></button>}</div>
     {daysErr&&<p className="dj-error" role="alert">{daysErr} <button onClick={reloadTimes}>Retry</button></p>}
    </section>
    <section className="ds-times-panel"><header><h2>Arrival times for {dayChip(date,{weekday:'short',day:'numeric',month:'short'})}</h2><span><Clock/>about {offer.visit_minutes} min visit</span></header>
     {!day||day.times===null?<p role="status">Loading available times…</p>:!day.times.length?<div className="ds-state"><CalendarDays/><h3>No home visits on {dayChip(date,{weekday:'long',day:'numeric',month:'short'})}</h3><p>{date===today?'The doctor needs at least 2 hours’ notice to plan the trip. ':''}Choose another date{days.some(d=>d.times?.length)?'':' or another doctor'}.</p>{!days.some(d=>d.times?.length)&&<button onClick={onBack}>See other doctors</button>}</div>
     :<div className="ds-groups">{PERIODS.map(({name,from,to,Icon})=>{const ts=day.times!.filter(t=>Number(t.slice(0,2))>=from&&Number(t.slice(0,2))<to);return ts.length>0&&<section key={name} className={`ds-group ${name.toLowerCase()}`}><h3><Icon/>{name} <span>({ts.length} time{ts.length===1?'':'s'})</span></h3><div className="ds-slots">{ts.map(t=><button key={t} aria-pressed={time===t} onClick={()=>{setTime(t);setError('');}}><span>{timeLabel(t)}</span></button>)}</div></section>;})}</div>}
     <p className="ds-ist"><Info/>The time is when the doctor arrives at your home (IST).</p>
    </section>
   </div>}

   {step===1&&<div className="dj-final-grid"><div className="dj-final-main">
    <header><h2>Patient &amp; address</h2><p>Who the doctor will see, and where.</p></header>
    <section className="dj-final-card"><h3>Who is the visit for?</h3>
     <div className="dj-person-cards" role="radiogroup" aria-label="Visit patient"><button role="radio" aria-checked={!who} onClick={()=>onWho('')}><strong>{self.name||'You'}</strong><span>Self</span></button>{family.map(f=><button key={f.memberUserId} role="radio" aria-checked={who===String(f.memberUserId)} onClick={()=>onWho(String(f.memberUserId))}><strong>{f.name}</strong><span>{f.relationship}{f.age!=null?` · ${f.age} y`:''}</span></button>)}<Link to="/family-members">Add family member</Link></div>
    </section>
    <section className="dj-final-card"><h3>Visit address</h3><p className="dj-hint">{doctorLabel} visits {areaText}.</p>
     {saved===null?<p role="status">Loading your saved addresses…</p>:<div className="hv-addresses" role="radiogroup" aria-label="Visit address">
      {saved.map(a=>{const ok=covered.has(a.pincode||'');return <button key={a.addressId} role="radio" aria-checked={addrChoice===a.addressId} disabled={!ok} onClick={()=>pickSaved(a)}>
       <MapPin/><span><strong>{a.label||(a.addressType==='HOME'?'Home':a.addressType==='WORK'?'Work':'Saved address')}{a.isDefault?' · Default':''}</strong><small>{[a.addressLine1,a.addressLine2,a.city].filter(Boolean).join(', ')} – {a.pincode||'No PIN'}</small>{!ok&&<em>Outside {doctorLabel}’s visit area</em>}</span></button>;})}
      <button role="radio" aria-checked={addrChoice==='new'} onClick={()=>{setAddrChoice('new');setAddress({line:'',area:'',city:'',pincode:covered.has(pincode)?pincode:'',landmark:''});setPin(null);setTouched({});}}><Plus/><span><strong>Use a different address</strong><small>Enter it below and drop a pin</small></span></button>
     </div>}
     {addrChoice==='new'&&<div className="dj-address hv-form">
      {([['line','House / flat no. and street',120,true,'address-line1'],['area','Area / locality',60,false,'address-line2'],['landmark','Landmark',60,false,'off'],['city','City',40,true,'address-level2'],['pincode','PIN code',6,true,'postal-code']] as const).map(([k,label,max,req,ac])=>{const er=k in errs?show(k as keyof typeof errs):'';
       return <label key={k} className={er?'hv-invalid':''}>{label}{req?' *':' (optional)'}<input value={address[k]} maxLength={max} autoComplete={ac} inputMode={k==='pincode'?'numeric':undefined} aria-invalid={!!er} onBlur={()=>setTouched(t=>({...t,[k]:true}))}
        onChange={e=>setAddress({...address,[k]:k==='pincode'?e.target.value.replace(/\D/g,'').slice(0,6):k==='city'?e.target.value.replace(/[^A-Za-z .-]/g,''):e.target.value})}/>{er&&<small className="hv-err" role="alert">{er}</small>}</label>;})}
      <div className="hv-pin"><HomePinField value={pin} onChange={setPin} who="doctor" currentAddress={address} onAddressResolved={r=>{setAddress(cur=>({...cur,line:r.line||cur.line,area:r.area||cur.area,city:r.city||cur.city,pincode:r.pincode||cur.pincode,landmark:r.landmark||cur.landmark}));if(r.pin!==undefined)setPin(r.pin);}}/></div>
     </div>}
     {addrChoice!=='new'&&show('pincode')&&<small className="hv-err" role="alert">{show('pincode')}</small>}
    </section>
    <section className={`dj-final-card ${show('reason')?'hv-invalid':''}`}><h3>Why do you need a home visit? *</h3>
     <label>Symptoms and why the patient can’t travel<textarea value={reason} maxLength={300} aria-invalid={!!show('reason')} onBlur={()=>setTouched(t=>({...t,reason:true}))} onChange={e=>setReason(e.target.value)} placeholder="e.g. Father, 78, fever for 3 days and too weak to travel to the clinic"/><small>{reason.length}/300</small></label>
     {show('reason')&&<small className="hv-err" role="alert">{show('reason')}</small>}
     <p className="dj-hint">Not for emergencies. For chest pain, breathlessness, fainting or heavy bleeding, call 108.</p>
    </section>
   </div>{summary}</div>}

   {step===2&&<div className="dj-final-grid"><div className="dj-final-main">
    <header><h2>Review &amp; send request</h2><p>Check the details. The doctor confirms your request before the visit.</p></header>
    <section className="dj-final-card"><div className="dj-final-heading"><h3>Visit</h3><button onClick={()=>goStep(0)}>Edit</button></div><dl className="dj-review-facts"><div><dt>Doctor</dt><dd>{doctorLabel}</dd></div><div><dt>Date</dt><dd>{niceDay(date)}</dd></div><div><dt>Doctor arrives</dt><dd>{timeLabel(time)}</dd></div></dl></section>
    <section className="dj-final-card"><div className="dj-final-heading"><h3>Patient &amp; address</h3><button onClick={()=>goStep(1)}>Edit</button></div><dl className="dj-review-facts"><div><dt>Patient</dt><dd>{patientName}</dd></div><div><dt>Address</dt><dd>{[address.line,address.area,address.landmark?`Near ${address.landmark}`:'',address.city].filter(Boolean).join(', ')} – {address.pincode}</dd></div><div><dt>Map pin</dt><dd>{pin?'Pinned for the doctor':'Not pinned'}</dd></div></dl><p><b>Reason:</b> {reason.trim()}</p></section>
    <section className="dj-final-card"><h3>How do you want to pay?</h3><fieldset className="dj-payment-options" disabled={busy}><div>
     <label><input type="radio" name="home-visit-payment" value="CASH" checked={pay==='CASH'} onChange={()=>setPay('CASH')}/><span><strong>Pay the doctor after the visit</strong><small>Cash or UPI to the doctor at your home</small></span></label>
     <label><input type="radio" name="home-visit-payment" value="UPI" checked={pay==='UPI'} onChange={()=>setPay('UPI')}/><span><strong>Pay online now</strong><small>UPI, cards or net banking. Refunded in full if the doctor can’t come.</small></span></label></div></fieldset>
    </section>
    {error&&<div className="dj-error" role="alert">{error}{slotGone&&<button onClick={()=>{setTime('');reloadTimes();goStep(0);}}>Choose another time</button>}</div>}
   </div><aside className="dj-review-side"><section><h2>Bill summary</h2><dl><div><dt>Home visit fee</dt><dd>{rupees(offer.fee)}</dd></div><div><dt>{pay==='UPI'?'Pay now':'Pay after the visit'}</dt><dd><strong>{rupees(offer.fee)}</strong></dd></div></dl></section><section><h2>What happens next</h2><p>{HOME_VISIT_REQUEST_NOTE}</p></section><section><h2>Cancellation policy</h2><CancellationRefundPolicy service="doctor"/></section></aside></div>}

   {error&&step!==2&&<p className="dj-error" role="alert">{error}</p>}
   <footer className="dj-book-actions">
    {step===0&&<div className="ds-selected"><CalendarDays/><span><strong>{time?`Selected: ${dayChip(date,{weekday:'short',day:'numeric',month:'short'})} · ${timeLabel(time)} · Home visit`:'No time selected'}</strong>{!time&&<small>Choose an arrival time to continue.</small>}</span></div>}
    <button disabled={busy} onClick={()=>{setError('');if(step===0)onBack();else goStep(step-1);}}>Back</button>
    {step<2?<button className="dj-primary" disabled={step===0&&(!time||loadingDays&&!day?.times)} onClick={next}>Continue <ArrowRight/></button>
     :<button className="dj-primary" disabled={busy} onClick={()=>void send()}>{busy?(pay==='UPI'?'Processing…':'Sending request…'):pay==='UPI'?`Pay ${rupees(offer.fee)} & send request`:'Send home visit request'}{!busy&&<ShieldCheck/>}</button>}
   </footer>
  </section>
 </div>;
}
