import {useRef,type ReactNode} from 'react';
import {FlaskConical,Building2,CalendarDays,UserRound,ClipboardList,Pencil} from 'lucide-react';
import type {LabHit,LabTestDef} from '../../../services/labHelper';
import {rupees} from '../../../services/labHelper';
import type {PatientFamilyMember} from '../../../services/familyHelper';
import {ageLabelFromDob} from '../../../services/familyHelper';
import {TestPaymentNote} from '../../../config/payments';
import {appointmentLabel,preparationText} from './labScheduleDetails';
import {validPin} from './labComparisonDetails';
import {appointmentRange,relativeAppointmentDay,reviewButtonLabel,reviewPaymentOptions,validReviewPrice,type LabVisitType} from './labReviewDetails';
import './LabReview.css';

export type ReviewPatient={name?:string|null;gender?:string|null;dateOfBirth?:string|null;age?:number|null;phone?:string|null;email?:string|null};
export type LabReviewProps={
 lab:LabHit;centreId:number|null;items:{code:string;name:string;price?:number}[];
 preparationTests:Pick<LabTestDef,'code'|'name'|'fasting_hours'|'patient_instructions'>[];
 date:string;time:string;slotMinutes?:number;visit:LabVisitType;address:string;
 patient:ReviewPatient|null;patientLoading:boolean;patientError:string|null;onRetryPatient:()=>void;
 family:PatientFamilyMember[];defaultPatientLabel?:string;forWho:string;onPatient:(id:string)=>void;
 testsTotal?:number;homeFee?:number;total?:number;pay:'UPI'|'CASH';onPay:(pay:'UPI'|'CASH')=>void;upi:string;onUpi:(value:string)=>void;
 onEdit:(step:number)=>void;onBook:()=>void;disabledReason:string|null;busy:boolean;error:string|null;
};
/** Shared note keeps its existing simulation configuration, but can never render in a production build. */
export function LabReviewPaymentNote(){return import.meta.env.PROD?null:<TestPaymentNote/>;}
export default function LabReview(p:LabReviewProps){
 const centre=p.lab.locations.find(c=>c.id===p.centreId);
 const patientSelect=useRef<HTMLSelectElement>(null);
 const prep=p.preparationTests.filter(t=>preparationText(t));
 const age=p.patient?.dateOfBirth?ageLabelFromDob(p.patient.dateOfBirth):p.patient?.age!=null?`${p.patient.age} years`:null;
 const tag=relativeAppointmentDay(p.date);
 const button=<button type="button" className="lab-review-primary" disabled={!!p.disabledReason||p.busy} onClick={p.onBook}>{reviewButtonLabel(p.pay,p.visit,p.total,p.busy)}</button>;
 const sectionHeader=(title:string,icon:ReactNode,edit:()=>void,label:string)=><header><h3>{icon}{title}</h3><button type="button" disabled={p.busy} onClick={edit}><Pencil size={14} aria-hidden="true"/>{label}</button></header>;
 return <section className="lab-review" aria-label="Booking review" aria-busy={p.busy}>
  <div className="lab-review-sections">
   <section className="lab-review-card" aria-label="Selected tests">{sectionHeader('1. Selected tests',<FlaskConical size={20} aria-hidden="true"/>,()=>p.onEdit(1),'Edit tests')}<ul className="lab-review-items">{p.items.map(t=><li key={t.code}><strong>{t.name}</strong>{validReviewPrice(t.price)&&<strong>{rupees(t.price)}</strong>}</li>)}</ul></section>
   <section className="lab-review-card" aria-label="Diagnostic centre">{sectionHeader('2. Diagnostic centre',<Building2 size={20} aria-hidden="true"/>,()=>p.onEdit(2),'Edit lab')}<div className="lab-review-centre">{p.lab.logo_url&&<img src={p.lab.logo_url} alt=""/>}<div><h4>{p.lab.name}</h4>{centre&&<p>{[centre.name,centre.address,centre.city,centre.pincode].filter(Boolean).join(', ')}</p>}{p.lab.registration_number&&<p>Reg. no. {p.lab.registration_number}</p>}{validPin(centre?.pin)&&<a href={`https://www.google.com/maps/search/?api=1&query=${centre.pin.lat},${centre.pin.lng}`} target="_blank" rel="noreferrer">View on map</a>}</div></div></section>
   <section className="lab-review-card" aria-label="Appointment">{sectionHeader('3. Appointment',<CalendarDays size={20} aria-hidden="true"/>,()=>p.onEdit(3),'Edit appointment')}<div className="lab-review-appointment"><div>{p.date&&<strong>{appointmentLabel(p.date)}</strong>}{tag&&<span className="lab-review-day-tag">{tag}</span>}</div><div>{p.time&&<strong>{appointmentRange(p.time,p.slotMinutes)}</strong>}</div><div><strong>{p.visit==='HOME'?'Home collection':'Visit centre'}</strong>{p.visit==='HOME'&&p.address&&<p>{p.address}</p>}</div></div></section>
   <section className="lab-review-card" aria-label="Patient details">{sectionHeader('4. Patient',<UserRound size={20} aria-hidden="true"/>,()=>patientSelect.current?.focus(),'Edit patient')}<label className="lab-review-patient-select">Who is this for?<select ref={patientSelect} value={p.forWho} disabled={p.busy} onChange={e=>p.onPatient(e.target.value)}><option value="">{p.defaultPatientLabel||'Myself'}</option>{p.forWho&&!p.family.some(f=>String(f.memberUserId)===p.forWho)&&p.patient?.name&&<option value={p.forWho}>{p.patient.name}</option>}{p.family.map(f=><option key={f.memberUserId} value={String(f.memberUserId)}>{[f.name,f.relationship].filter(Boolean).join(' · ')}</option>)}</select></label>{p.patientLoading?<p role="status">Loading patient details…</p>:p.patientError?<div role="alert"><p>{p.patientError}</p><button type="button" onClick={p.onRetryPatient}>Retry patient details</button></div>:p.patient&&<div className="lab-review-patient"><div>{p.patient.name&&<h4>{p.patient.name}</h4>}{(p.patient.gender||age)&&<p>{[p.patient.gender,age].filter(Boolean).join(' · ')}</p>}</div>{p.patient.phone&&<p>{p.patient.phone}</p>}{p.patient.email&&<p>{p.patient.email}</p>}</div>}</section>
   {prep.length>0&&<section className="lab-review-card lab-review-preparation" aria-label="Test preparation">{sectionHeader('5. Test preparation',<ClipboardList size={20} aria-hidden="true"/>,()=>p.onEdit(1),'Edit tests')}{prep.map(t=><div key={t.code}><strong>{t.name}</strong><p>{preparationText(t)}</p></div>)}</section>}
  </div>
  <aside className="lab-review-sidebar" aria-label="Booking price and payment">
   <section className="lab-review-card"><h3>Price summary</h3><ul className="lab-review-prices">{p.items.map(t=><li key={t.code}><span>{t.name}</span>{validReviewPrice(t.price)&&<strong>{rupees(t.price)}</strong>}</li>)}</ul>{validReviewPrice(p.testsTotal)&&<div className="lab-review-price-line"><span>Tests total</span><strong>{rupees(p.testsTotal)}</strong></div>}{p.visit==='HOME'&&validReviewPrice(p.homeFee)&&<div className="lab-review-price-line"><span>Home collection fee</span><strong>{rupees(p.homeFee)}</strong></div>}{validReviewPrice(p.total)&&<div className="lab-review-total"><strong>Total payable</strong><strong>{rupees(p.total)}</strong></div>}</section>
   <section className="lab-review-card"><h3>Payment method</h3><fieldset className="lab-review-payments" disabled={p.busy}><legend className="sr-only">Payment</legend>{reviewPaymentOptions(p.visit).map(option=><label key={option.value}><input type="radio" name="lab-review-payment" checked={p.pay===option.value} onChange={()=>p.onPay(option.value)}/><span>{option.label}</span></label>)}</fieldset>{p.pay==='UPI'&&<><label className="lab-review-upi">UPI ID<input aria-label="UPI ID" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={p.upi} disabled={p.busy} onChange={e=>p.onUpi(e.target.value.replace(/\s/g,''))} aria-describedby={p.disabledReason?'lab-review-validation':undefined}/></label><LabReviewPaymentNote/></>}{p.error&&<p role="alert" className="lab-review-error">{p.error}</p>}{p.disabledReason&&<p id="lab-review-validation" role="status" className="lab-review-validation">{p.disabledReason}</p>}<div className="lab-review-desktop-submit">{button}</div></section>
   <section className="lab-review-policy"><h3>Cancellation &amp; refund</h3><p>Cancel any time before your sample is collected. Online payments held by VIZITO are refunded automatically; payments already settled to the lab need support. You can change the time up to 2 times.</p></section>
  </aside>
  <div className="lab-review-mobile-bar" role="region" aria-label="Confirm booking"><div>{validReviewPrice(p.total)&&<><span>Total payable</span><strong>{rupees(p.total)}</strong></>}{p.disabledReason&&<small>{p.disabledReason}</small>}</div>{button}</div>
 </section>;
}
