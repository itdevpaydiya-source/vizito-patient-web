import {rupees,type MyHomeVisit} from '../../../services/labHelper';

// One reading of a doctor home visit's status for every patient screen (Home care list, My bookings
// card and details). A home visit is a REQUEST until the doctor confirms; the visit code exists only
// after confirmation.
export type HomeVisitTone='amber'|'sky'|'indigo'|'violet'|'emerald'|'rose'|'slate';
export interface HomeVisitView{label:string;tone:HomeVisitTone;detail:string|null;code:string|null;money:string|null;findAnother:boolean;canCancel:boolean}
export const FIND_ANOTHER_DOCTOR='/home-care?tab=doctor';

/** "18 Nov, 3:30 PM" in IST. */
export function istDateTime12(iso?:string|null):string|null{
 if(!iso)return null;const d=new Date(iso);if(!Number.isFinite(d.getTime()))return null;
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(d);
 const get=(t:string)=>parts.find(p=>p.type===t)?.value||'';
 return `${get('day')} ${get('month')}, ${get('hour')}:${get('minute')} ${get('dayPeriod').toUpperCase()}`;
}

type Visit=Pick<MyHomeVisit,'status'|'visit_code'|'payment_status'|'fee'|'cancellation_reason'|'failed_reason'|'cancelled_by'>&{expires_at?:string|null};

/** What happened to the money when a request ended without a visit. */
export function homeVisitMoney(v:Pick<MyHomeVisit,'payment_status'|'fee'>):string{
 const s=String(v.payment_status||'').toUpperCase();
 if(s==='REFUNDED')return `${rupees(v.fee)} refunded`;
 if(s==='PAID')return `Refund of ${rupees(v.fee)} in progress`;
 return 'Not charged';
}

export function homeVisitView(v:Visit):HomeVisitView{
 const base={detail:null,code:null,money:null,findAnother:false,canCancel:false};
 switch(String(v.status||'').toUpperCase()){
  case 'REQUESTED':{const by=istDateTime12(v.expires_at);return {...base,label:'Waiting for doctor',tone:'amber',detail:by?`Doctor confirms by ${by}`:'Waiting for the doctor to confirm',canCancel:true};}
  case 'SCHEDULED':return {...base,label:'Confirmed',tone:'sky',code:v.visit_code||null,canCancel:true};
  case 'ON_THE_WAY':return {...base,label:'Doctor on the way',tone:'indigo',code:v.visit_code||null};
  case 'ARRIVED':case 'IN_CONSULTATION':return {...base,label:'Doctor with you',tone:'violet'};
  case 'COMPLETED':return {...base,label:'Completed',tone:'emerald'};
  case 'DECLINED':return {...base,label:'Declined by doctor',tone:'rose',detail:v.cancellation_reason||v.failed_reason||null,money:homeVisitMoney(v),findAnother:true};
  case 'EXPIRED':return {...base,label:'Not confirmed in time',tone:'rose',detail:'The doctor did not confirm your request in time.',money:homeVisitMoney(v),findAnother:true};
  case 'FAILED':return {...base,label:'Visit did not happen',tone:'rose',detail:v.failed_reason?`Doctor: ${v.failed_reason}`:null};
  case 'NO_SHOW':return {...base,label:'Missed',tone:'slate'};
  case 'CANCELLED':return {...base,label:'Cancelled',tone:'slate',detail:v.cancellation_reason?`Cancelled${v.cancelled_by&&v.cancelled_by!=='PATIENT'?' by the doctor':''}: ${v.cancellation_reason}`:null};
  default:return {...base,label:'Status unavailable',tone:'slate'};
 }
}
export const VISIT_CODE_HINT='Give this code to the doctor at your door';
