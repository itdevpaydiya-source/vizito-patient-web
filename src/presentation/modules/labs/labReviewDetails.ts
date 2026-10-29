import {rupees} from '../../../services/labHelper';
import {istToday,slotLabel} from './labScheduleDetails';
export type LabVisitType='LAB_VISIT'|'HOME';
export const validReviewPrice=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
export const validUpi=(value:string)=>/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(value.trim());
export const reviewPaymentOptions=(visit:LabVisitType)=>[{value:'UPI' as const,label:'Pay online'},{value:'CASH' as const,label:visit==='HOME'?'Pay the collector':'Pay at the centre'}];
export const reviewButtonLabel=(pay:'UPI'|'CASH',visit:LabVisitType,total?:number,busy=false)=>busy?'Booking…':pay==='UPI'?validReviewPrice(total)?`Pay ${rupees(total)} and confirm booking`:'Confirm booking':visit==='HOME'?'Book home collection':'Book visit';
export function reviewDisabledReason(p:{busy:boolean;checking:boolean;availabilityError?:string|null;slotValid:boolean;addressReady:boolean;pay:'UPI'|'CASH';upi:string;hasTests:boolean;hasCentre:boolean;total?:number}) {
 if(p.busy)return 'Your booking is being processed. Please wait.';
 if(!p.hasTests)return 'Select tests before confirming your booking.';
 if(!p.hasCentre)return 'Choose a diagnostic centre before confirming.';
 if(p.checking)return 'Checking your selected appointment…';
 if(p.availabilityError)return 'Return to date and time to retry availability.';
 if(!p.slotValid)return 'Choose an available appointment before confirming.';
 if(!p.addressReady)return 'Complete your home collection address before confirming.';
 if(p.pay==='UPI'&&!validReviewPrice(p.total))return 'Return to lab selection to check the payable amount.';
 return null;
}
export function appointmentRange(time:string,minutes?:number) {
 if(!/^\d{2}:\d{2}$/.test(time))return null;
 if(!minutes||minutes<=0)return `${slotLabel(time)} (IST)`;
 const [h,m]=time.split(':').map(Number),end=(h*60+m+minutes)%1440;
 return `${slotLabel(time)} – ${slotLabel(`${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`)} (IST)`;
}
export function relativeAppointmentDay(date:string,today=istToday()) {
 if(date===today)return 'Today';
 const tomorrow=new Date(`${today}T12:00:00+05:30`);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
 return date===new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(tomorrow)?'Tomorrow':null;
}
