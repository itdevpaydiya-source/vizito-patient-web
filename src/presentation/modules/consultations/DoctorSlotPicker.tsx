import {useEffect,useRef,useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight,Clock,Info,MapPin,Moon,Sun,Sunrise} from 'lucide-react';
import {formatSlotTime,type AvailableSlot,type Branch,type ProviderAvailability} from '../../../services/bookingHelper';
import type {ProviderItem} from '../../../services/types';
import MediaImage from '../../components/MediaImage';
import './DoctorSlotPicker.css';

export const bookingDayLabel=(date:string)=>new Date(`${date}T12:00:00Z`).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
const money=(fee:number)=>`₹${fee.toLocaleString('en-IN')}`;
export function slotMinutes(slot:Pick<AvailableSlot,'start_time'|'end_time'>):number {
 const minutes=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
 return (minutes(slot.end_time)-minutes(slot.start_time)+1440)%1440;
}
type Props={doctor:ProviderItem;clinic?:Branch;mode:'In Person'|'Video';date:string;today:string;slots:AvailableSlot[];slot:AvailableSlot|null;availability:ProviderAvailability|null;loading:boolean;summaryLoading:boolean;error:string;onDate:(date:string)=>void;onSlot:(slot:AvailableSlot)=>void;onNext:()=>void;onChange:()=>void;onOtherDoctors:()=>void;onRetry:()=>void};
export default function DoctorSlotPicker({doctor,clinic,mode,date,today,slots,slot,availability,loading,summaryLoading,error,onDate,onSlot,onNext,onChange,onOtherDoctors,onRetry}:Props){
 const [calendar,setCalendar]=useState(false),[month,setMonth]=useState(date.slice(0,7));
 const stripRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const strip=stripRef.current;if(!strip)return;
  const reveal=()=>{const selected=strip.querySelector<HTMLButtonElement>('[aria-pressed="true"]');if(!selected)return;const card=selected.getBoundingClientRect(),bounds=strip.getBoundingClientRect();if(card.left<bounds.left)strip.scrollLeft-=bounds.left-card.left+2;else if(card.right>bounds.right)strip.scrollLeft+=card.right-bounds.right+2;};
  reveal();const observer=new ResizeObserver(reveal);observer.observe(strip);return()=>observer.disconnect();
 },[date,availability,summaryLoading]);
 const day=availability?.days.find(d=>d.date===date),next=availability?.next_available;
 const price=slot?(mode==='Video'?slot.video_fee:slot.fee):next?(mode==='Video'?next.video_fee:next.fee):null;
 const duration=slot?slotMinutes(slot):availability?.slot_minutes;
 const changeMonth=(n:number)=>setMonth(current=>{const d=new Date(`${current}-01T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,7);});
 const count=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate(),offset=new Date(`${month}-01T12:00:00Z`).getUTCDay();
 const selectDate=(value:string)=>{onDate(value);setCalendar(false);};
 return <div className="ds-picker">
  <section className="ds-summary" aria-label="Doctor and clinic summary">
   <div className="ds-identity"><MediaImage src={doctor.logo||undefined} name={doctor.name} kind="doctor"/><div><h2>{doctor.name}</h2><p>{doctor.specialization||doctor.specialtyOrType}</p><p>{clinic?.name}</p></div></div>
   <div className="ds-place">{clinic&&<p><MapPin/>{[clinic.area,clinic.city].filter(Boolean).join(', ')||clinic.address_line_1}</p>}<p><Clock/>{mode==='Video'?'Video consultation':'In-clinic visit'}</p></div>
   <div className="ds-price"><small>Consultation fee</small><strong>{price!=null?money(price):summaryLoading?'Checking…':'Select an available slot'}</strong>{duration!=null&&duration>0&&<small>({duration} minutes)</small>}</div>
   <button className="ds-change" onClick={onChange}>Change <ChevronRight/></button>
  </section>
  <section className="ds-dates-panel">
   <div className="ds-next-row"><button className="ds-next" disabled={!next||summaryLoading} onClick={onNext}><CalendarDays/><span>{summaryLoading?'Checking next available…':next?<>Next available: <strong>{bookingDayLabel(next.date)}, {formatSlotTime(next.start_time)}</strong></>:'No available slots in the next 60 days'}</span><ChevronRight/></button><button className="ds-calendar-toggle" aria-expanded={calendar} aria-controls="booking-calendar" onClick={()=>{setMonth(date.slice(0,7));setCalendar(!calendar);}}><CalendarDays/>Calendar</button></div>
   {calendar&&<section className="ds-calendar" id="booking-calendar" aria-label="Appointment calendar"><header><button aria-label="Previous month" disabled={month<=today.slice(0,7)} onClick={()=>changeMonth(-1)}><ChevronLeft/></button><strong>{new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-IN',{month:'long',year:'numeric',timeZone:'UTC'})}</strong><button aria-label="Next month" onClick={()=>changeMonth(1)}><ChevronRight/></button></header><div className="ds-calendar-grid">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><small key={d}>{d}</small>)}{Array.from({length:offset},(_,i)=><span key={`blank-${i}`}/>)}{Array.from({length:count},(_,i)=>{const value=`${month}-${String(i+1).padStart(2,'0')}`;return <button key={value} aria-label={value} aria-pressed={date===value} disabled={value<today} onClick={()=>selectDate(value)}>{i+1}</button>;})}</div><button onClick={()=>setCalendar(false)}>Close calendar</button></section>}
   <h2>Select date</h2><p>Showing next 14 days · Only the doctor's available slots can be booked.</p>
   {summaryLoading?<p role="status">Loading dates…</p>:<div ref={stripRef} className="ds-date-strip" aria-label="Appointment dates">{availability?.days.map(d=>{const status=d.status==='AVAILABLE'?(d.available_slots<=2?`${d.available_slots} left`:`${d.available_slots} slots`):d.status==='FULLY_BOOKED'?'Fully booked':'Not available';return <button key={d.date} data-date={d.date} data-status={d.status} className={d.status==='AVAILABLE'?(d.available_slots<=2?'few':'available'):'unavailable'} aria-label={`${bookingDayLabel(d.date)}, ${status}`} aria-pressed={d.date===date} onClick={()=>onDate(d.date)}><small>{new Date(`${d.date}T12:00:00Z`).toLocaleDateString('en-IN',{weekday:'short',timeZone:'UTC'})}</small><strong>{new Date(`${d.date}T12:00:00Z`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',timeZone:'UTC'})}</strong><span>{status}</span></button>;})}</div>}
  </section>
  <section className="ds-times-panel"><header><h2>Slots for {bookingDayLabel(date)}</h2>{duration!=null&&duration>0&&<span><Clock/>{duration} min per slot</span>}</header>
   {error?<div className="ds-state" role="alert"><h3>Unable to load appointments</h3><p>{error}</p><button onClick={onRetry}>Retry</button></div>:loading||summaryLoading?<p role="status">Loading available times…</p>:<>
    {day?.status==='FULLY_BOOKED'&&<div className="ds-state"><CalendarDays/><h3>All {day.total_slots} slots on {bookingDayLabel(date)} are booked</h3><p>Choose the next available appointment or another doctor.</p><button disabled={!next} onClick={onNext}>Book next available</button><button onClick={onOtherDoctors}>See other doctors in {doctor.specialization||doctor.specialtyOrType||'this specialty'}</button></div>}
    {(day?.status==='OFF'||day?.status==='UNAVAILABLE'||day?.status==='PAUSED')&&<div className="ds-state"><CalendarDays/><h3>{day.status==='PAUSED'?'Appointments are paused':day.status==='OFF'?'Doctor is not available on this day':'No bookable times on this day'}</h3><p>{day.status==='PAUSED'?(availability?.paused?.reason||'Choose another doctor or check again later.'):`There are no available appointments on ${bookingDayLabel(date)}. Please choose another date.`}</p>{next&&<button onClick={onNext}>Book next available</button>}</div>}
    <div className="ds-groups">{[{name:'Morning',start:0,end:12,Icon:Sunrise},{name:'Afternoon',start:12,end:16,Icon:Sun},{name:'Evening',start:16,end:24,Icon:Moon}].map(({name,start,end,Icon})=>{const times=slots.filter(s=>Number(s.start_time.slice(0,2))>=start&&Number(s.start_time.slice(0,2))<end);return times.length>0&&<section key={name} className={`ds-group ${name.toLowerCase()}`}><h3><Icon/>{name} <span>({times.length} slots{times.some(s=>s.is_booked)?`, ${times.filter(s=>!s.is_booked).length} available`:''})</span></h3><div className="ds-slots">{times.map(s=><button key={s.time_slot_id} disabled={s.is_booked||((mode==='Video'?s.video_fee:s.fee)==null)} className={s.is_booked?'booked':''} aria-pressed={slot?.time_slot_id===s.time_slot_id} aria-label={`${formatSlotTime(s.start_time)}${s.is_booked?', Booked':''}`} onClick={()=>onSlot(s)}><span>{formatSlotTime(s.start_time)}</span>{s.is_booked&&<small>Booked</small>}</button>)}</div></section>;})}</div>
    {!day&&!slots.length&&<p>No availability published for this date. Choose another day.</p>}
   </>}
   <p className="ds-ist"><Info/>Times are in IST (India Standard Time).</p>
  </section>
 </div>;
}
