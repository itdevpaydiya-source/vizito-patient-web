import type {BookingTimelineEntry} from '../bookings/BookingTimeline';
import type {RentalOrder,RentalCategory} from './rentalOrdersApi';
export const rentalMoney=(v:number|string)=>`₹${Number(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const istToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const day=(s:string)=>Date.parse(s.slice(0,10)+'T00:00:00Z')/86400000;
export const daysBetween=(from:string,to:string)=>Math.round(day(to)-day(from));
export const rentalDate=(s:string)=>new Date(s.slice(0,10)+'T00:00:00+05:30').toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric'});
export const rentalStamp=(s:string)=>new Date(s).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
export const rentalAddress=(o:RentalOrder)=>[o.delivery_address.addressLine,o.delivery_address.city,o.delivery_address.pincode].filter(Boolean).filter((v,i,a)=>!i||v?.trim().toLowerCase()!==a[i-1]?.trim().toLowerCase()).join(', ');
export const rentalGroup=(o:RentalOrder)=>['CANCELLED','REJECTED'].includes(o.status)?'cancelled':o.status==='COMPLETED'?'completed':o.delivered_at||o.delivery_address.delivery_status==='delivered'?'active':'upcoming';
export const rentalStatus=(o:RentalOrder)=>o.status==='CANCELLED'?'Cancelled':o.status==='REJECTED'?'Declined':o.status==='COMPLETED'?'Returned':o.delivery_address.return_schedule?.status==='collected_awaiting_inspection'?'Return inspection pending':o.delivery_address.return_schedule?'Return scheduled':rentalGroup(o)==='active'?'Delivered – in use':o.delivery_address.delivery_status==='out_for_delivery'?'Out for delivery':o.status==='ACCEPTED'?'Confirmed':'Requested';
export function rentalProgress(o:RentalOrder,today=istToday()){const elapsed=Math.max(0,Math.min(o.duration_days,daysBetween(o.start_date,today)+1));return {day:elapsed,total:o.duration_days,percent:Math.min(100,Math.max(0,Math.round(elapsed/o.duration_days*100)))};}
export const dueSoon=(o:RentalOrder,today=istToday())=>rentalGroup(o)==='active'&&daysBetween(today,o.end_date)>=0&&daysBetween(today,o.end_date)<=3;
export const paidAmount=(o:RentalOrder)=>o.payments.filter(p=>p.status==='PAID').reduce((sum,p)=>sum+Number(p.amount),0);
export const rentalPaymentLabel=(o:RentalOrder)=>paidAmount(o)>0?(o.bill.amount_due>0?'Part paid':'Paid'):o.payments.some(p=>p.status==='REFUNDED')?'Refunded':'Pay on delivery';
export const categoryLabels:Record<RentalCategory,string>={OXYGEN:'Oxygen',BED:'Beds',MOBILITY:'Mobility',MONITOR:'Monitors',OTHER:'Other'};
export const safetyText:Record<RentalCategory,string[]>={OXYGEN:['Keep away from smoking and open flames.','Use in a well-ventilated room.','Keep the equipment at least 30 cm from walls.','Clean the filter as directed in the device manual.'],BED:['Lock the wheels before use.','Keep side rails up.'],MOBILITY:['Apply the wheelchair brakes when transferring.'],MONITOR:['Follow the device manual.'],OTHER:[]};
/** Only actual recorded event dates populate the timeline. */
export function rentalTimeline(o:RentalOrder):BookingTimelineEntry[]{
 const history=o.delivery_address.status_history||[];const at=(...codes:string[])=>history.find(h=>codes.includes(h.status.toUpperCase()))?.timestamp||null;
 if(['CANCELLED','REJECTED'].includes(o.status))return [{code:'REQUESTED',label:'Requested',occurred_at:o.created_at,state:'completed'},{code:o.status,label:rentalStatus(o),occurred_at:at(o.status),state:at(o.status)?'completed':'current'}];
 const rows:[string,string,string|null][]=[['REQUESTED','Requested',o.created_at],['CONFIRMED','Confirmed',at('ACCEPTED','CONFIRMED')],['OUT_FOR_DELIVERY','Out for delivery',o.delivery_address.dispatched_at||at('OUT_FOR_DELIVERY')],['DELIVERED','Delivered – in use',o.delivered_at||at('DELIVERED')],['RETURN_SCHEDULED','Return scheduled',o.delivery_address.return_schedule?.scheduled_at||at('RETURN_SCHEDULED')],['RETURNED','Returned',o.delivery_address.return_schedule?.collected_at||at('RETURN_COLLECTED','RETURNED','COMPLETED')]];
 if(o.deposit.amount>0&&o.deposit.status!=='NOT_COLLECTED')rows.push(['DEPOSIT_REFUNDED','Deposit refunded',o.deposit.refunded_at]);
 let current=false;return rows.map(([code,label,occurred_at])=>{const state=occurred_at?'completed':!current&&o.status!=='COMPLETED'?'current':'pending';if(!occurred_at)current=true;return {code,label,occurred_at,state};});
}
