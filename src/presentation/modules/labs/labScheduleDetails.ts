import type {LabAvailabilityDay, LabSlot} from '../../../services/labHelper';
export const validHomePin=(pin:string)=>/^\d{6}$/.test(pin);
export const slotLabel=(time:string)=>{const [h,m]=time.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;};
export const slotRemaining=(slot:LabSlot)=>!slot.available?'Full':slot.left!==null&&slot.left>0&&slot.left<=3?`${slot.left} left`:null;
export const groupSlots=(slots:LabSlot[])=>[
 {name:'Morning',slots:slots.filter(s=>Number(s.time.slice(0,2))<12)},
 {name:'Afternoon',slots:slots.filter(s=>Number(s.time.slice(0,2))>=12&&Number(s.time.slice(0,2))<17)},
 {name:'Evening',slots:slots.filter(s=>Number(s.time.slice(0,2))>=17)},
].filter(g=>g.slots.length);
export const dayAvailable=(day:LabAvailabilityDay)=>day.open&&day.slots.some(s=>s.available);
export function calendarCells(month:string,days:LabAvailabilityDay[]) {
 const [year,m]=month.split('-').map(Number);
 const offset=new Date(Date.UTC(year,m-1,1)).getUTCDay();
 const length=new Date(Date.UTC(year,m,0)).getUTCDate();
 const byDate=new Map(days.map(d=>[d.date,d]));
 return [...Array.from({length:offset},()=>null),...Array.from({length},(_,i)=>{
  const date=`${month}-${String(i+1).padStart(2,'0')}`,day=byDate.get(date);
  return {date,day,available:!!day&&dayAvailable(day),reason:day?(day.open?'Fully booked':'Closed'):null};
 })];
}
export const appointmentLabel=(date:string)=>new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-GB',{timeZone:'Asia/Kolkata',weekday:'short',day:'numeric',month:'short',year:'numeric'});
export const istToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function restoreAppointment(days:LabAvailabilityDay[],date:string,time:string,keepDay=false){
 const day=days.find(d=>d.date===date&& (keepDay||dayAvailable(d)))||days.find(dayAvailable);
 return {date:day?.date||'',time:day?.slots.some(s=>s.time===time&&s.available)?time:''};
}
export const preparationText=(test:{patient_instructions?:string|null;fasting_hours?:number})=>test.patient_instructions?.trim()||(test.fasting_hours&&test.fasting_hours>0?`Fasting ${test.fasting_hours} hours needed`:null);
