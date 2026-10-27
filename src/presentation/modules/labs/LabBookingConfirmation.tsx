import {SuccessCheck,Toast} from '../../components/motion/Motion';
import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {Copy,CalendarDays,Download,FlaskConical,Building2,UserRound,Headphones,Info,XCircle} from 'lucide-react';
import {myLabOrderApi,labPublicApi,findLabsApi,labAvailabilityApi,labReceiptApi,labError,rupees,type LabConfirmationOrder,type LabPublic,type LabHit} from '../../../services/labHelper';
import {getPatientProfileApi,type PatientProfileData} from '../../../services/patientHelper';
import {getFamilyMembersApi,ageLabelFromDob,type PatientFamilyMember} from '../../../services/familyHelper';
import {useSearchArea,nearest} from '../../../services/location';
import {comparisonDistance,validPin} from './labComparisonDetails';
import {appointmentLabel,preparationText} from './labScheduleDetails';
import {appointmentRange,relativeAppointmentDay,validReviewPrice} from './labReviewDetails';
import {bookedOn,buildLabIcs,calendarDates,confirmationPayment,confirmationPerson,confirmationTimeline,googleCalendarUrl,receiptFilename,labDocumentLabel,saveLabDocumentFile as saveConfirmationFile,type CalendarBooking} from './labConfirmationDetails';
import './LabBookingConfirmation.css';

export {saveLabDocumentFile as saveConfirmationFile} from './labConfirmationDetails';
export function ConfirmationVisitCode({code}:{code?:string|null}){return code?<section className="lab-confirm-code" aria-label="Home visit code"><h3>Visit code</h3><strong>{code}</strong><p>Give this code only to the collector when they arrive.</p></section>:null;}

export default function LabBookingConfirmation(){
 const {orderId}=useParams();
 const [order,setOrder]=useState<LabConfirmationOrder|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[retry,setRetry]=useState(0);
 const [lab,setLab]=useState<LabPublic|null>(null),[rating,setRating]=useState<LabHit['rating']>(),[minutes,setMinutes]=useState<number>();
 const [profile,setProfile]=useState<PatientProfileData|null>(null),[family,setFamily]=useState<PatientFamilyMember[]>([]);
 const [toast,setToast]=useState<string|null>(null),[actionError,setActionError]=useState<string|null>(null),[receiptBusy,setReceiptBusy]=useState(false);
 const area=useSearchArea();

 useEffect(()=>{
  let active=true;setLoading(true);setOrder(null);setError(null);setLab(null);setRating(undefined);setMinutes(undefined);setProfile(null);setFamily([]);
  myLabOrderApi(orderId||'').then(async (value:LabConfirmationOrder)=>{
   if(!active)return;setOrder(value);setLoading(false);
   const jobs:Promise<unknown>[]=[getPatientProfileApi().then(async p=>{if(!active)return;setProfile(p);if(p?.userId){const members=await getFamilyMembersApi(p.userId);if(active)setFamily(members);}})];
   if(value.lab_partner_id){jobs.push(labPublicApi(value.lab_partner_id).then(l=>{if(active)setLab(l);}));const codes=Array.from(new Set(value.items.map(i=>i.test_code).filter(Boolean)));if(codes.length)jobs.push(findLabsApi(codes).then(labs=>{if(active)setRating(labs.find(l=>l.id===value.lab_partner_id)?.rating);}));}
   if(value.lab_partner_id&&value.location_id&&(value.visit_type!=='HOME'||value.home_pincode))jobs.push(labAvailabilityApi({lab_partner_id:value.lab_partner_id,location_id:value.location_id,visit_type:value.visit_type==='HOME'?'HOME':'LAB_VISIT',...(value.visit_type==='HOME'?{pincode:value.home_pincode!}:{})}).then(a=>{if(active)setMinutes(a.slot_minutes);}));
   await Promise.allSettled(jobs);
  }).catch(e=>{if(active){setError([403,404].includes(e?.response?.status)?'Booking not found':labError(e,'Could not load this booking. Please retry.'));setLoading(false);}});
  return()=>{active=false;};
 },[orderId,retry]);
 if(loading)return <div className="lab-confirm-loading" role="status">Loading your booking…</div>;
 if(error||!order)return <section className="lab-confirm-card" role="alert"><h1>{error||'Booking not found'}</h1>{error!=='Booking not found'&&<button type="button" onClick={()=>setRetry(n=>n+1)}>Retry</button>}<Link to="/lab-bookings">My lab bookings</Link></section>;
 const home=order.visit_type==='HOME',cancelled=order.status==='CANCELLED';
 const items=order.items.filter(i=>i.status!=='CANCELLED'||cancelled);
 const prep=(code:string)=>{const specific=lab?.tests?.find(t=>t.code===code);return specific?preparationText({patient_instructions:specific.instructions,fasting_hours:specific.fasting_hours}):null;};
 const centre=lab?.locations.find(c=>Number(c.id)===Number(order.location_id));
 const saved=profile?.addresses.find(a=>a.isDefault)||profile?.addresses[0];const pin=saved?.latitude!=null&&saved?.longitude!=null?{lat:Number(saved.latitude),lng:Number(saved.longitude)}:null;
 const distance=centre&&nearest(validPin(area)?area:validPin(pin)?pin:null,[centre].filter(c=>validPin(c.pin)));
 const person=confirmationPerson(order,profile,family),age=person.dob?ageLabelFromDob(person.dob):null;
 const location=home?[order.home_address,order.home_pincode].filter(Boolean).join(', '):[order.location_name,order.location_address].filter(Boolean).join(', ');
 const payment=confirmationPayment(order),date=order.visit_date?.slice(0,10),tag=date?relativeAppointmentDay(date):null;
 const testsTotal=items.length&&items.every(i=>validReviewPrice(i.price))?Math.round(items.reduce((sum,i)=>sum+i.price,0)*100)/100:null;
 const calendar:CalendarBooking|null=date&&order.visit_time&&minutes?{id:order.id,date,time:order.visit_time,minutes,lab:order.lab_name,address:location,number:order.order_number}:null;
 let calendarReady=false;if(calendar){try{calendarDates(calendar);calendarReady=true;}catch{/* omit incomplete calendar data */}}
 const copy=async()=>{setActionError(null);try{await navigator.clipboard.writeText(order.order_number);setToast('Booking ID copied');}catch{setActionError('Could not copy the booking ID. You can select and copy it directly.');}};
 const receipt=async()=>{if(receiptBusy)return;setReceiptBusy(true);setActionError(null);try{const file=await labReceiptApi(order.id);saveConfirmationFile(file.blob,receiptFilename(file.disposition,order.order_number,order.payment_status));}catch{setActionError(`Could not download the ${labDocumentLabel(order.payment_status) === 'Download receipt' ? 'receipt' : 'booking slip'}. Please try again.`);}finally{setReceiptBusy(false);}};
 return <div className="lab-confirm-page">
  <header className={`lab-confirm-hero ${cancelled?'lab-confirm-cancelled':''}`}><span className="lab-confirm-success">{cancelled?<XCircle size={44}/>:<SuccessCheck payment={['PAID','REFUNDED'].includes(order.payment_status||'')}/>}</span><div className="lab-confirm-hero-copy"><h1>{cancelled?'Booking cancelled':home?'Home collection booked!':'Lab booking confirmed!'}</h1>{!cancelled&&<p className="lab-confirm-subtitle">Your appointment has been booked successfully.</p>}<p>Your confirmation is saved in Notifications and My lab bookings.</p></div><div className="lab-confirm-reference">{order.order_number&&<><span>Booking ID</span><div><strong>{order.order_number}</strong><button type="button" aria-label="Copy booking ID" onClick={()=>void copy()}><Copy size={16}/>{toast === 'Booking ID copied' ? 'Copied' : null}</button></div></>}{bookedOn(order.created_at)&&<><span>Booked on</span><p>{bookedOn(order.created_at)} (IST)</p></>}</div></header>
  {home&&<ConfirmationVisitCode code={order.home_visit_code}/>}
  <div className="lab-confirm-columns"><div className="lab-confirm-main">
   <section className="lab-confirm-card"><h2><FlaskConical size={21} aria-hidden="true"/>Booking details</h2>
    <section className="lab-confirm-detail-row"><h3><FlaskConical size={22} aria-hidden="true"/>Tests booked</h3><ul className="lab-confirm-tests">{items.map((item,i)=><li key={`${item.test_code}-${i}`}><div><strong>{item.test_name}</strong>{prep(item.test_code)&&<p>{prep(item.test_code)}</p>}</div>{validReviewPrice(item.price)&&<strong>{rupees(item.price)}</strong>}</li>)}</ul></section>
    <section className="lab-confirm-detail-row"><h3><Building2 size={22} aria-hidden="true"/>Diagnostic centre</h3><div className="lab-confirm-centre">{lab?.logo_url&&<img src={lab.logo_url} alt=""/>}<div>{order.lab_name&&<h4>{order.lab_name}</h4>}{rating&&rating.count>0&&Number.isFinite(rating.average)&&<p className="lab-confirm-rating">★ {rating.average} ({rating.count} reviews)</p>}{(order.location_name||order.location_address)&&<p>{[order.location_name,order.location_address].filter(Boolean).join(', ')}{distance&&` · ${comparisonDistance(distance.metres)} away (approx.)`}</p>}{lab?.registration_number&&<p>Reg. no. {lab.registration_number}</p>}{lab?.nabl&&Number.isFinite(new Date(lab.nabl.valid_until).getTime())&&<p>NABL cert. {lab.nabl.cert_no} · valid till {new Date(lab.nabl.valid_until).toLocaleDateString('en-GB',{timeZone:'Asia/Kolkata',month:'short',year:'numeric'})}</p>}{validPin(centre?.pin)&&<a href={`https://www.google.com/maps/search/?api=1&query=${centre.pin.lat},${centre.pin.lng}`} target="_blank" rel="noreferrer">View on map</a>}</div></div></section>
    <section className="lab-confirm-detail-row"><h3><CalendarDays size={22} aria-hidden="true"/>Appointment</h3><div className="lab-confirm-appointment"><div>{date&&<strong>{appointmentLabel(date)}</strong>}{tag&&<span className="lab-confirm-tag">{tag}</span>}{order.visit_time&&<p>{appointmentRange(order.visit_time,minutes)}</p>}</div><div>{order.visit_type&&<strong>{home?'Home collection':'Visit centre'}</strong>}{home&&location&&<p>{location}</p>}</div></div></section>
    <section className="lab-confirm-detail-row"><h3><UserRound size={22} aria-hidden="true"/>Patient</h3><div className="lab-confirm-patient"><div>{person.name&&<h4>{person.name}</h4>}{(person.gender||age)&&<p>{[person.gender,age].filter(Boolean).join(' · ')}</p>}</div>{person.phone&&<p>{person.phone}</p>}{person.email&&<p>{person.email}</p>}</div></section>
   </section>
   <section className="lab-confirm-card lab-confirm-important"><h2><Info size={21} aria-hidden="true"/>Important instructions</h2><ul>{!home&&<li>Arrive 10–15 minutes early.</li>}<li>Carry a valid ID.</li>{items.some(i=>prep(i.test_code))&&<li>Follow the preparation instructions above.</li>}{validPin(centre?.pin)&&<li>Check the lab location on the map.</li>}</ul></section>
  </div><aside className="lab-confirm-sidebar">
   <section className="lab-confirm-card"><h2>Price summary</h2><ul className="lab-confirm-price-list">{items.map((item,i)=><li key={`${item.test_code}-${i}`}><span>{item.test_name}</span>{validReviewPrice(item.price)&&<strong>{rupees(item.price)}</strong>}</li>)}</ul>{testsTotal!==null&&<div className="lab-confirm-price-line"><span>Tests total ({items.length} {items.length===1?'test':'tests'})</span><strong>{rupees(testsTotal)}</strong></div>}{home&&validReviewPrice(order.home_fee)&&<div className="lab-confirm-price-line"><span>Home collection fee</span><strong>{rupees(order.home_fee)}</strong></div>}<div className="lab-confirm-total"><div><h3>{payment.totalLabel}</h3>{payment.label&&<span>{payment.label}</span>}</div>{validReviewPrice(order.total_amount)&&<strong>{rupees(order.total_amount)}</strong>}</div></section>
   <section className="lab-confirm-card"><h2>What happens next?</h2>{!cancelled&&<ol className="lab-confirm-timeline">{confirmationTimeline(home,order.fasting_hours>0,date).map(text=><li key={text}>{text}</li>)}</ol>}<div className="lab-confirm-actions"><Link className="lab-confirm-primary" to={`/lab-bookings?open=${encodeURIComponent(order.id)}`}>View booking details</Link><div className="lab-confirm-action-pair">{calendar&&calendarReady&&!cancelled&&<details><summary><CalendarDays size={16} aria-hidden="true"/>Add to calendar</summary><button type="button" onClick={()=>saveConfirmationFile(new Blob([buildLabIcs(calendar)],{type:'text/calendar;charset=utf-8'}),`VIZITO-${order.order_number||order.id}.ics`)}>Download .ics</button><a href={googleCalendarUrl(calendar)} target="_blank" rel="noreferrer">Google Calendar</a></details>}<button type="button" disabled={receiptBusy} onClick={()=>void receipt()}><Download size={16} aria-hidden="true"/>{receiptBusy?'Downloading…':labDocumentLabel(order.payment_status)}</button></div><Link to="/lab-tests">Book more tests</Link></div>{actionError&&<p role="alert" className="lab-confirm-error">{actionError}</p>}</section>
   <section className="lab-confirm-card lab-confirm-help"><h2><Headphones size={21} aria-hidden="true"/>Need help?</h2><p>Get help with your lab booking.</p><Link to="/help">Get help</Link></section>
  </aside></div>
  {toast&&<Toast onClose={()=>setToast(null)}>{toast}</Toast>}
 </div>;
}
