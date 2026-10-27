import LabTimeSlotOptions from './LabTimeSlotOptions';
import {useEffect,useState,type ReactNode} from 'react';
import {FlaskConical, ChevronLeft, ChevronRight, MapPin} from 'lucide-react';
import {rupees,type LabHit,type LabAvailability,type LabTestDef} from '../../../services/labHelper';
import {nearest,useSearchArea,type LatLng} from '../../../services/location';
import {comparisonDistance,centreLocality,validPin} from './labComparisonDetails';
import {appointmentLabel,calendarCells,dayAvailable,groupSlots,istToday,preparationText,slotLabel,slotRemaining,validHomePin} from './labScheduleDetails';
import './LabSchedule.css';

type Props={
 lab:LabHit;centreId:number|null;onCentre:(id:number)=>void;mode:'LAB_VISIT'|'HOME';onMode:(mode:'LAB_VISIT'|'HOME')=>void;
 tests:Pick<LabTestDef,'code'|'name'|'patient_instructions'|'fasting_hours'>[];date:string;time:string;
 onDate:(date:string)=>void;onTime:(time:string)=>void;onChangeLab:()=>void;onContinue:()=>void;
 availability:LabAvailability|null;loading:boolean;error:string|null;onRetry:()=>void;notice?:string|null;
 address:string;pincode:string;addressReady:boolean;addressFields:ReactNode;savedLocation?:LatLng|null;
 testsTotal?:number;total?:number;busy:boolean;
};
const money=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
export default function LabSchedule(p:Props){
 const {lab,date,time,availability,loading,error,mode}=p;
 const days=availability?.days||[];
 const months=Array.from(new Set(days.map(d=>d.date.slice(0,7))));
 const [month,setMonth]=useState(date.slice(0,7)||istToday().slice(0,7));
 useEffect(()=>{if(date)setMonth(date.slice(0,7));},[date]);
 useEffect(()=>{if(months.length&&!months.includes(month))setMonth(months[0]);},[months.join(','),month]);
 const index=months.indexOf(month),day=days.find(d=>d.date===date);
 const valid=!!availability?.bookable&&!!day?.slots.some(s=>s.time===time&&s.available)&&p.addressReady&&!loading&&!error&&!p.busy;
 const why=loading?'Checking available times…':error?'Retry availability before continuing.':mode==='HOME'&&!validHomePin(p.pincode)?'Enter a 6-digit PIN to check home collection.':!availability?.bookable?'Choose a supported collection option.':!time?'Choose an available time to continue.':!p.addressReady?'Complete your collection address to continue.':p.busy?'Please wait while your booking is being processed.':null;
 const centre=lab.locations.find(c=>c.id===p.centreId);
 const area=useSearchArea();const origin=area||p.savedLocation;
 const distance=centre&&nearest(validPin(origin)?origin:null,[centre].filter(c=>validPin(c.pin)));
 const preparation=p.tests.filter(t=>preparationText(t));
 const next=<button type="button" className="lab-schedule-continue" disabled={!valid} onClick={p.onContinue}>Continue to review &amp; confirm <ChevronRight size={16} aria-hidden="true"/></button>;
 return <section className="lab-schedule" aria-label="Centre and time">
  <div className="lab-schedule-main">
   <header className="lab-schedule-card lab-schedule-lab"><span className="lab-schedule-logo">{lab.logo_url?<img src={lab.logo_url} alt=""/>:<FlaskConical aria-hidden="true"/>}</span><div><h3>{lab.name}</h3>{centre&&<p>{centreLocality(lab.name,centre)}{distance&&` · ${comparisonDistance(distance.metres)} away (approx.)`}</p>}{validPin(centre?.pin)&&<a href={`https://www.google.com/maps/search/?api=1&query=${centre.pin.lat},${centre.pin.lng}`} target="_blank" rel="noreferrer">View on map</a>}</div><button type="button" onClick={p.onChangeLab}>Change lab</button></header>
   <div className="lab-schedule-card">
    <div role="tablist" aria-label="Sample collection" className="lab-schedule-tabs" onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]'));const current=tabs.indexOf(document.activeElement as HTMLButtonElement);const index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length;tabs[index]?.focus();tabs[index]?.click();}}><button type="button" role="tab" tabIndex={mode==='LAB_VISIT'?0:-1} aria-selected={mode==='LAB_VISIT'} onClick={()=>p.onMode('LAB_VISIT')}>Visit centre</button>{lab.settings?.home?.enabled&&<button type="button" role="tab" tabIndex={mode==='HOME'?0:-1} aria-selected={mode==='HOME'} onClick={()=>p.onMode('HOME')}>Home collection{money(lab.settings.home.fee)?` (+${rupees(lab.settings.home.fee)})`:''}</button>}</div>
    <p className="lab-schedule-muted">{mode==='HOME'?'Times are for sample collection at your address':'Times are for visiting the centre'}</p>
    {mode==='LAB_VISIT'&&lab.locations.length>1&&<label className="lab-schedule-centre">Collection centre<select value={p.centreId||''} onChange={e=>p.onCentre(Number(e.target.value))}>{lab.locations.map(c=><option key={c.id} value={c.id}>{[c.name,c.city].filter(Boolean).join(', ')}</option>)}</select></label>}
    {mode==='HOME'&&p.addressFields}
   </div>
   {p.notice&&<p role="alert" className="lab-schedule-alert">{p.notice} Please pick another time.</p>}
   {loading?<div role="status" aria-label="Loading availability" className="lab-schedule-card lab-schedule-skeleton">Loading available dates and times…</div>:error?<div role="alert" className="lab-schedule-card"><p>{error}</p><button type="button" onClick={p.onRetry}>Retry</button></div>:mode==='HOME'&&!validHomePin(p.pincode)?<p role="status" className="lab-schedule-card">Enter a 6-digit PIN to check home collection.</p>:availability&&!availability.bookable?<div className="lab-schedule-card" role="status">{availability.reason&&<p>{availability.reason}</p>}<div className="lab-schedule-recovery">{mode==='HOME'&&<button type="button" onClick={()=>p.onMode('LAB_VISIT')}>Visit centre instead</button>}<button type="button" onClick={p.onChangeLab}>Choose another lab</button></div></div>:availability&&!days.some(dayAvailable)?<div className="lab-schedule-card" role="status"><p>No times in the next {availability.max_days} days</p><button type="button" onClick={p.onChangeLab}>Choose another lab</button></div>:availability&&<div className="lab-schedule-picker">
    <div className="lab-schedule-card lab-schedule-calendar"><header><button type="button" aria-label="Previous month" disabled={index<=0} onClick={()=>setMonth(months[index-1])}><ChevronLeft size={19}/></button><h3>{new Date(`${month}-01T12:00:00+05:30`).toLocaleDateString('en-GB',{timeZone:'Asia/Kolkata',month:'long',year:'numeric'})}</h3><button type="button" aria-label="Next month" disabled={index<0||index>=months.length-1} onClick={()=>setMonth(months[index+1])}><ChevronRight size={19}/></button></header>
     <div className="lab-schedule-weekdays" aria-hidden="true">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d}>{d}</span>)}</div>
     <div className="lab-schedule-dates" role="group" aria-label="Visit date">{calendarCells(month,days).map((cell,i)=>cell?<button key={cell.date} type="button" disabled={!cell.available} title={!cell.available?cell.reason||undefined:undefined} aria-label={`${appointmentLabel(cell.date)}${!cell.available&&cell.reason?`, ${cell.reason}`:''}`} aria-current={cell.date===istToday()?'date':undefined} aria-pressed={date===cell.date} onClick={()=>p.onDate(cell.date)}><span>{Number(cell.date.slice(-2))}</span>{cell.available&&<i aria-label="Available"/>}</button>:<span key={`blank-${i}`}/>)}</div>
     <div className="lab-schedule-legend"><span><i/>Available</span><span><i/>No slots</span><span>◯ Today</span><span>● Selected</span></div>
    </div>
    <div className="lab-schedule-card lab-schedule-slots"><header><h3>Available time slots</h3><span>All times in IST</span></header>{day&&<p className="lab-schedule-muted">{appointmentLabel(day.date)}</p>}<LabTimeSlotOptions slots={day?.slots||[]} time={time} onTime={p.onTime}/>{day&&!day.slots.some(s=>s.available)&&<p>No available times on this day. Choose another date.</p>}</div>
   </div>}
   {preparation.length>0&&<section className="lab-schedule-card lab-schedule-preparation" aria-label="Test preparation instructions"><h3>Test preparation instructions</h3>{preparation.map(t=><div key={t.code}><strong>{t.name}</strong><p>{preparationText(t)}</p></div>)}</section>}
  </div>
  <aside className="lab-schedule-card lab-schedule-summary" aria-label="Appointment summary"><h2>Your selection</h2><h3>Selected tests ({p.tests.length})</h3><ul>{p.tests.map(t=>{const price=lab.selected.find(s=>s.code===t.code)?.price;return <li key={t.code}><span>{t.name}</span>{!lab.prices_vary&&money(price)&&<strong>{rupees(price)}</strong>}</li>;})}</ul><h3>Chosen lab</h3><p>{lab.name}</p>{centre&&mode==='LAB_VISIT'&&<p className="lab-schedule-muted">{centreLocality(lab.name,centre)}</p>}<h3>Appointment details</h3>{date&&<p>{appointmentLabel(date)}</p>}{time&&<p>{slotLabel(time)}</p>}<p>{mode==='HOME'?'Home collection':'Visit centre'}</p>{mode==='HOME'&&p.address&&<p className="lab-schedule-muted"><MapPin size={14} aria-hidden="true"/>{p.address}</p>}<h3>Price details</h3>{money(p.testsTotal)&&<div className="lab-schedule-price"><span>Tests total</span><strong>{rupees(p.testsTotal)}</strong></div>}{mode==='HOME'&&money(lab.settings?.home.fee)&&<div className="lab-schedule-price"><span>Home collection fee</span><strong>{rupees(lab.settings!.home.fee)}</strong></div>}{money(p.total)&&<div className="lab-schedule-price lab-schedule-total"><strong>Total</strong><strong>{rupees(p.total)}</strong></div>}<div className="lab-schedule-desktop-next">{next}</div>{!valid&&why&&<p role="status" className="lab-schedule-muted">{why}</p>}</aside>
  <div className="lab-schedule-mobile-bar" role="region" aria-label="Appointment actions"><span>{date&&appointmentLabel(date)}{time&&`, ${slotLabel(time)}`}{money(p.total)&&` · ${rupees(p.total)}`}{!valid&&<small>{why}</small>}</span>{next}</div>
 </section>;
}
