import {useState} from 'react';
import {CalendarDays,X} from 'lucide-react';
import BookingDialog from './BookingDialog';
import type {BookingStatus,BookingType} from './bookingsPresentation';
export type BookingFiltersValue={type:'All'|BookingType;status:'all'|BookingStatus;from:string;to:string;department?:string};
export const emptyBookingFilters:BookingFiltersValue={type:'All',status:'all',from:'',to:''};
export default function BookingFilters({value,onApply,onClose,labOnly=false,departments}:{value:BookingFiltersValue;onApply:(v:BookingFiltersValue)=>void;onClose:()=>void;labOnly?:boolean;departments?:string[]}){
 const [draft,setDraft]=useState(value);
 return <BookingDialog label="Filter bookings" onClose={onClose} className="booking-filter"><header><h2>Filter bookings</h2><button aria-label="Close filters" onClick={onClose}><X/></button></header><div className="booking-filter-body">
 {!labOnly&&<fieldset><legend>Appointment type</legend><div className="booking-chips">{(['All','Doctor','Lab Test','Home Care','Hospital','Pharmacy','Equipment'] as const).map(type=><button key={type} aria-pressed={draft.type===type} onClick={()=>setDraft({...draft,type})}>{type}</button>)}</div></fieldset>}
 {departments&&<fieldset><legend>Department</legend><div className="booking-chips">{['All',...departments].map(department=><button key={department} aria-pressed={(draft.department||'All')===department} onClick={()=>setDraft({...draft,department})}>{department}</button>)}</div></fieldset>}
 <fieldset><legend>Status</legend><div className="booking-chips">{(['all','upcoming','completed','cancelled'] as const).map(status=><button key={status} aria-pressed={draft.status===status} onClick={()=>setDraft({...draft,status})}>{status[0].toUpperCase()+status.slice(1)}</button>)}</div></fieldset>
 <fieldset><legend>Date range</legend><div className="booking-date-inputs">{(['from','to'] as const).map(key=><label key={key}><span>{key==='from'?'From date':'To date'}</span><input aria-label={key==='from'?'From date':'To date'} type="date" value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/><CalendarDays/></label>)}</div></fieldset>
 {draft.from&&draft.to&&draft.from>draft.to&&<p role="alert">To date must be on or after From date.</p>}</div><footer><button className="booking-button" onClick={()=>setDraft(emptyBookingFilters)}>Clear</button><button className="booking-button primary" disabled={!!draft.from&&!!draft.to&&draft.from>draft.to} onClick={()=>onApply(draft)}>Apply</button></footer></BookingDialog>;
}
