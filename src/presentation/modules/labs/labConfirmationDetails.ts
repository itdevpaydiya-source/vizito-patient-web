import type {LabConfirmationOrder} from '../../../services/labHelper';
import type {PatientProfileData} from '../../../services/patientHelper';
import type {PatientFamilyMember} from '../../../services/familyHelper';
import {istToday} from './labScheduleDetails';
export const calendarEscape=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
/** RFC 5545 folds at 75 UTF-8 octets, without splitting a Unicode character. */
const foldLine=(value:string)=>{let out='',line='',bytes=0;for(const char of value){const size=new TextEncoder().encode(char).length;if(bytes+size>75){out+=line+'\r\n';line=' ';bytes=1;}line+=char;bytes+=size;}return out+line;};
const utcStamp=(date:Date)=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export type CalendarBooking={id:string;date:string;time:string;minutes:number;lab?:string|null;address?:string|null;number?:string|null};
export function calendarDates(p:CalendarBooking){
 const start=new Date(`${p.date}T${p.time}:00+05:30`);
 if(!Number.isFinite(start.getTime())||!Number.isFinite(p.minutes)||p.minutes<=0)throw new Error('Appointment time is unavailable.');
 return {start:utcStamp(start),end:utcStamp(new Date(start.getTime()+p.minutes*60000))};
}
export function buildLabIcs(p:CalendarBooking,now=new Date()){
 const dates=calendarDates(p);
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//VIZITO//Lab booking//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${calendarEscape(p.id)}@vizito`, `DTSTAMP:${utcStamp(now)}`,`DTSTART:${dates.start}`,`DTEND:${dates.end}`,`SUMMARY:${calendarEscape(p.lab?`Lab appointment — ${p.lab}`:'Lab appointment')}`,p.address?`LOCATION:${calendarEscape(p.address)}`:null,p.number?`DESCRIPTION:${calendarEscape(`Booking ID: ${p.number}`)}`:null,'END:VEVENT','END:VCALENDAR'].filter((s):s is string=>s!==null).map(foldLine).join('\r\n')+'\r\n';
}
export function googleCalendarUrl(p:CalendarBooking){const dates=calendarDates(p);return `https://calendar.google.com/calendar/render?${new URLSearchParams({action:'TEMPLATE',text:p.lab?`Lab appointment — ${p.lab}`:'Lab appointment',dates:`${dates.start}/${dates.end}`,ctz:'Asia/Kolkata',...(p.address?{location:p.address}:{}),...(p.number?{details:`Booking ID: ${p.number}`}:{})})}`;}
export function confirmationPayment(order:Pick<LabConfirmationOrder,'payment_status'|'payment_mode'|'visit_type'>){
 if(order.payment_status==='REFUNDED')return {totalLabel:'Total',label:'Refunded'};
 if(order.payment_status==='PAID')return {totalLabel:'Total paid',label:['UPI','ONLINE'].includes(order.payment_mode||'')?'Paid online':'Paid'};
 if(['UPI','ONLINE'].includes(order.payment_mode||''))return {totalLabel:'Total',label:order.payment_status==='PENDING'?'Payment pending':null};
 return {totalLabel:'Total',label:order.visit_type==='HOME'?'To pay the collector':order.visit_type==='LAB_VISIT'?'To pay at the centre':null};
}
export function confirmationTimeline(home:boolean,fasting:boolean,date?:string,today=istToday()){return [home?'The collector comes to your address at the selected time':'Visit the centre at your selected time',...(fasting&&(!date||date>today)?["We'll send a fasting reminder the evening before."]:[]),"You'll be notified in the app when your report is ready; it appears in My lab bookings."];}
// Cross-origin APIs may not expose Content-Disposition. In that case use the
// existing server filename convention with the actual order number.
export const labDocumentLabel=(status?:string|null)=>['PAID','REFUNDED'].includes(status || '')?'Download receipt':'Download booking slip';
export function receiptFilename(disposition:string|null,number?:string,status?:string|null){
 const extended=disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];let name:string|undefined;
 try{name=extended?decodeURIComponent(extended):disposition?.match(/filename="([^"]+)"|filename=([^;]+)/i)?.slice(1).find(Boolean)?.trim();}catch{/* malformed optional header */}
 return (name||`VIZITO-${status !== undefined && !['PAID','REFUNDED'].includes(status || '') ? 'booking-slip' : 'receipt'}${number?`-${number}`:''}.pdf`).replace(/[\\/\x00-\x1f]/g,'_');
}
export function confirmationPerson(order:LabConfirmationOrder,profile:PatientProfileData|null,family:PatientFamilyMember[]){
 const own=!!profile?.patientProfileId&&profile.patientProfileId===order.patient_profile_id;
 const member=family.find(f=>String(f.memberUserId)===order.patient_profile_id);
 return {name:order.patient_name||(own?profile?.fullName:member?.name),phone:order.patient_phone||(own?profile?.phone:member?.phone),gender:order.patient_gender||(own?profile?.gender:member?.gender),dob:order.patient_dob||(own?profile?.dateOfBirth:member?.dateOfBirth),email:order.patient_email||(own?profile?.email:member?.email)};
}
export function bookedOn(value?:string){if(!value)return null;const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString('en-GB',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}):null;}

export function saveLabDocumentFile(blob:Blob,filename:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
