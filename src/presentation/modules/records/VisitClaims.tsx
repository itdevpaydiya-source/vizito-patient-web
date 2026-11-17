import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Building2,Check,ShieldCheck} from 'lucide-react';
import BookingDialog from '../bookings/BookingDialog';
import {recordDate,recordError,recordsApi,type VisitClaim} from './recordsApi';
import '../bookings/BookingsReference.css';
import './MedicalRecords.css';

// "Claim my clinic visits": clinic walk-in visits on the patient's verified mobile that are not linked to any
// account yet. Only who/where/when is shown; nothing is linked until the patient confirms it is them.
// Families can share one phone, so each patient name is a separate choice ("Not me" hides it).
export default function VisitClaims({onClaimed}:{onClaimed?:()=>void}){
 const [claims,setClaims]=useState<VisitClaim[]>([]),[confirm,setConfirm]=useState<VisitClaim|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState<{name:string|null;count:number}|null>(null);
 useEffect(()=>{let live=true;recordsApi.visitClaims().then(r=>{if(live)setClaims(r.claims||[]);}).catch(()=>undefined);return()=>{live=false;};},[]);
 const drop=(id:string)=>setClaims(list=>list.filter(c=>c.patient_record_id!==id));
 const claim=async(c:VisitClaim)=>{setBusy(true);setError('');try{const r=await recordsApi.claimVisits(c.patient_record_id);drop(c.patient_record_id);setConfirm(null);setDone({name:c.patient_name,count:r.linked_visits});onClaimed?.();}catch(e){setError(recordError(e));}finally{setBusy(false);}};
 const notMe=async(c:VisitClaim)=>{setError('');try{await recordsApi.dismissVisits(c.patient_record_id);drop(c.patient_record_id);}catch(e){setError(recordError(e));}};
 if(!claims.length&&!done)return null;
 const visits=(n:number)=>`${n} ${n===1?'visit':'visits'}`;
 return <section className="vc-wrap" aria-label="Clinic visits found">
  {done&&<div className="vc-done" role="status"><Check/><p>{visits(done.count)} added to your records. Prescriptions and lab advice from {done.count===1?'this visit':'these visits'} are now in Medical Records.</p><Link className="booking-button" to="/my-records">View records</Link><button className="vc-close" aria-label="Close message" onClick={()=>setDone(null)}>×</button></div>}
  {claims.map(c=><article className="vc-card" key={c.patient_record_id}>
   <span className="vc-icon"><Building2/></span>
   <div className="vc-text"><h2>We found {visits(c.visit_count)}{c.clinic_name?` at ${c.clinic_name}`:''} for {c.patient_name||'a patient'} — is this you?</h2>
    <p>{[c.doctor_name,c.latest_visit_date&&`Last visit ${recordDate(c.latest_visit_date)}`].filter(Boolean).join(' · ')}</p>
    <small><ShieldCheck/>Found because the clinic saved your verified mobile number. Nothing is added until you confirm.</small></div>
   <div className="vc-actions"><button className="booking-button primary" onClick={()=>{setError('');setConfirm(c);}}>Yes, add to my records</button><button className="booking-button" onClick={()=>void notMe(c)}>Not me</button></div>
  </article>)}
  {error&&!confirm&&<p role="alert" className="mr-error">{error}</p>}
  {confirm&&<BookingDialog label="Add clinic visits" onClose={()=>{if(!busy)setConfirm(null);}} className="mr-page mr-dialog"><h2>Are you {confirm.patient_name||'this patient'}?</h2>
   <p>{visits(confirm.visit_count)}{confirm.clinic_name?` at ${confirm.clinic_name}`:''}{confirm.doctor_name?` with ${confirm.doctor_name}`:''} will be added to your own medical records and appointments, including prescriptions and lab advice.</p>
   <p>If these visits belong to a family member who shares your phone, choose “Not me” so they stay with them.</p>
   {error&&<p role="alert" className="mr-error">{error}</p>}
   <footer><button className="booking-button" disabled={busy} onClick={()=>setConfirm(null)}>Cancel</button><button className="booking-button primary" disabled={busy} onClick={()=>void claim(confirm)}>{busy?'Adding…':`Yes, I am ${confirm.patient_name||'this patient'}`}</button></footer>
  </BookingDialog>}
 </section>;
}
