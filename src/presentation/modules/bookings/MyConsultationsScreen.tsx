import {useEffect,useState} from 'react';
import {Link,Navigate,useNavigate,useSearchParams} from 'react-router-dom';
import {ArrowLeft,ArrowRight,CalendarDays,ChevronRight,Filter,Search,X,Stethoscope,FlaskConical,HeartPulse,Building2,Pill,Package,FileText,Ambulance,Droplet,RotateCcw} from 'lucide-react';
import {useBookingActivity} from '../../../services/BookingActivityContext';
import {StateLoading,StateError,StateNotFound} from './BookingStates';
import BookingFilters,{emptyBookingFilters,type BookingFiltersValue} from './BookingFilters';
import {bookingTypes} from './bookingOverviewData';
import {addressOf,dateLabel,dateOf,placeOf,refOf,subtitleOf,timeRange,timeOf,type Booking,type BookingStatus,type BookingType} from './bookingsPresentation';
import './BookingsReference.css';
import './BookingsOverview.css';

const services={
 Doctor:{label:'Doctors',title:'Doctor appointment',icon:Stethoscope,book:'/find-doctors'},
 'Lab Test':{label:'Lab tests',title:'Lab test',icon:FlaskConical,book:'/lab-tests'},
 'Home Care':{label:'Home care',title:'Home care visit',icon:HeartPulse,book:'/home-care'},
 Hospital:{label:'Hospitals',title:'Hospital appointment',icon:Building2,book:'/find-hospitals'},
 Pharmacy:{label:'Pharmacy',title:'Pharmacy order',icon:Pill,book:'/pharmacy-orders/new'},
 Equipment:{label:'Equipment',title:'Equipment rental',icon:Package,book:'/equipment-rental'},
};
const labels={all:'All',upcoming:'Upcoming',completed:'Completed',cancelled:'Cancelled'};
export function bookingDisplayStatus(b:Booking){
 if(b.pharmacy)return ({CREATED:'Order placed',AWAITING_PAYMENT:'Payment pending',PAID:'Paid',PROCESSING:'Processing',READY_FOR_PICKUP:'Ready for pickup',OUT_FOR_DELIVERY:'Out for delivery',COMPLETED:'Completed',CANCELLED:'Cancelled',FULFILLMENT_FAILED:'Unable to fulfil'})[b.pharmacy.status];
 if(b.rental)return ({NEW:'Requested',ACCEPTED:'Confirmed',OUT_FOR_DELIVERY:'Out for delivery',ACTIVE:'Active',COMPLETED:'Completed',CANCELLED:'Cancelled',REJECTED:'Declined'} as Record<string,string>)[b.rental.status]||b.rental.status.replaceAll('_',' ');
 return b.section==='upcoming'?'Upcoming':b.section==='completed'?'Completed':'Cancelled';
}
function bookingLink(b:Booking,type:BookingType){
 return b.labOrder?`/lab-bookings?open=${encodeURIComponent(b.labOrder.id)}`:b.pharmacy?`/pharmacy-orders/${encodeURIComponent(b.pharmacy.id)}`:b.rental?`/equipment-rental/orders/${encodeURIComponent(b.rental.order_number)}`:`/my-consultations?type=${encodeURIComponent(type)}&open=${encodeURIComponent(b.id)}`;
}
export default function MyConsultationsScreen(){
 const {groups,reload}=useBookingActivity(),navigate=useNavigate(),[params]=useSearchParams();
 const [tab,setTab]=useState<'all'|BookingStatus>('upcoming'),[query,setQuery]=useState(''),[filters,setFilters]=useState<BookingFiltersValue>(emptyBookingFilters),[filterOpen,setFilterOpen]=useState(false),[limit,setLimit]=useState(8);
 useEffect(()=>setLimit(8),[tab,query,filters]);
 const all=bookingTypes.flatMap(type=>groups[type].bookings),initial=bookingTypes.every(t=>groups[t].state==='loading'),failed=bookingTypes.every(t=>groups[t].state==='error'),unsettled=bookingTypes.some(t=>groups[t].state!=='ready');
 const counts={all:all.length,upcoming:all.filter(b=>b.section==='upcoming').length,completed:all.filter(b=>b.section==='completed').length,cancelled:all.filter(b=>b.section==='cancelled').length};
 const matching=(type:BookingType,ignoreType=false)=>groups[type].bookings.filter(b=>{const date=dateOf(b);return (tab==='all'||b.section===tab)&&(ignoreType||filters.type==='All'||filters.type===type)&&(filters.status==='all'||b.section===filters.status)&&(!filters.from||!!date&&date>=filters.from)&&(!filters.to||!!date&&date<=filters.to)&&(!query.trim()||[...subtitleOf(b),refOf(b),placeOf(b),addressOf(b),services[type].title,...(b.labOrder?.tests||[])].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()));});
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const rows=bookingTypes.flatMap(type=>matching(type).map(b=>({b,type}))).sort((a,b)=>{
  if(a.b.section==='upcoming'&&b.b.section!=='upcoming')return -1;if(b.b.section==='upcoming'&&a.b.section!=='upcoming')return 1;
  if(a.b.section==='upcoming'&&b.b.section==='upcoming'){const aFuture=(dateOf(a.b)||'9999')>=today,bFuture=(dateOf(b.b)||'9999')>=today;if(aFuture!==bFuture)return aFuture?-1:1;}
  const cmp=`${dateOf(a.b)||'9999'} ${timeOf(a.b)||''}`.localeCompare(`${dateOf(b.b)||'9999'} ${timeOf(b.b)||''}`);
  return a.b.section==='upcoming'?cmp:-cmp;
 });
 const visible=rows.slice(0,limit),dates=new Map<string,typeof visible>();
 for(const row of visible){const key=`${row.b.section}:${dateOf(row.b)||'unscheduled'}`;dates.set(key,[...(dates.get(key)||[]),row]);}
 const clear=()=>{setQuery('');setTab('all');setFilters(emptyBookingFilters);};
 const linked=params.get('open');
 if(linked){if(bookingTypes.some(t=>groups[t].state==='loading'))return <div className="booking-reference-page"><StateLoading layout="detail"/></div>;const found=all.find(b=>b.id===linked||b.labOrder?.id===linked);if(found){const type=bookingTypes.find(t=>groups[t].bookings.includes(found))!;return <Navigate replace to={bookingLink(found,type)}/>;}return <div className="booking-reference-page">{unsettled?<StateError title="Unable to load booking details" retry={()=>reload()}/>:<StateNotFound/>}</div>;}
 return <div className="booking-reference-page bookings-clean">
  <header className="bko-heading"><div><nav aria-label="Breadcrumb"><Link to="/dashboard">Dashboard</Link><ChevronRight/><span>Bookings</span></nav><h1>My Bookings</h1><p>Appointments and orders, organised by date.</p></div><Link className="bko-new" to="/healthcare-services">Book a service <ArrowRight/></Link></header>
  <div className="bko-workspace">
   <div className="bko-status" role="group" aria-label="Booking status">{(['upcoming','all','completed','cancelled'] as const).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>{setTab(t);setFilters(f=>({...f,status:'all'}));}}>{labels[t]}{!unsettled&&<span>{counts[t]}</span>}</button>)}</div>
   <div className="bko-search-row"><label className="bko-search"><Search/><input aria-label="Search bookings" placeholder="Search by provider, booking ID or service" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear booking search" onClick={()=>setQuery('')}><X/></button>}</label><button className="bko-filter" onClick={()=>setFilterOpen(true)} aria-label="Filter bookings" aria-expanded={filterOpen}><Filter/>Filters{(filters.from||filters.to||filters.status!=='all')&&<span className="bko-filter-dot"/>}</button></div>
   <div className="bko-services" role="group" aria-label="Booking service"><button aria-pressed={filters.type==='All'} onClick={()=>setFilters(f=>({...f,type:'All'}))}>All services</button>{bookingTypes.map(type=>{const Icon=services[type].icon;return <button key={type} aria-pressed={filters.type===type} onClick={()=>setFilters(f=>({...f,type}))}><Icon/>{services[type].label}{groups[type].state==='ready'&&<span>{matching(type,true).length}</span>}</button>;})}</div>
   {(filters.from||filters.to||filters.status!=='all')&&<div className="bko-active-filters"><span>{filters.from||'Any date'} – {filters.to||'Any date'}{filters.status!=='all'?` · ${labels[filters.status]}`:''}</span><button onClick={()=>setFilters(f=>({...f,from:'',to:'',status:'all'}))}>Clear date & status filters <X/></button></div>}
  </div>
  {!initial&&!failed&&bookingTypes.filter(t=>groups[t].state==='error').map(type=><div role="alert" className="bko-inline-state" key={type}><span>{services[type].label} could not be loaded. Other bookings are still available.</span><button onClick={()=>reload(type)}><RotateCcw/>Retry</button></div>)}
  {initial?<StateLoading layout="rows"/>:failed?<div className="bko-empty" role="alert"><CalendarDays/><h2>We couldn’t load your bookings</h2><p>Please try again in a moment.</p><button className="bko-new" onClick={()=>reload()}>Retry</button></div>:rows.length?<>
   <div className="bko-list-heading"><h2>{tab==='all'?'All bookings':`${labels[tab]} bookings`}</h2><span>{rows.length} {rows.length===1?'booking':'bookings'}{unsettled?' · Updating…':''}</span></div>
   <section className="bko-timeline" aria-label="Booking timeline">{[...dates].map(([key,items])=><section className="bko-day" key={key}><h3><CalendarDays/>{dateLabel(dateOf(items[0].b))||'Date not yet scheduled'}</h3><div className="bko-day-rows">{items.map(({b,type})=>{const Icon=services[type].icon;const title=type==='Doctor'?b.provider?.doctor?.name||b.doctorName||services[type].title:subtitleOf(b)[0]||services[type].title;const secondary=type==='Hospital'?b.provider?.doctor?.name||b.doctorName:type==='Lab Test'?b.labOrder?.tests.join(', '):type==='Equipment'?b.rental?.product?.name:null;return <article className="bko-row" key={`${type}:${b.id}`} data-service={type}>
    <span className="bko-service-icon" aria-label={services[type].title}><Icon/></span><div className="bko-row-main"><span className="bko-kind">{services[type].title}</span><h4><Link to={bookingLink(b,type)}>{title}</Link></h4>{secondary&&secondary!==title&&<p>{secondary}</p>}{placeOf(b)&&placeOf(b)!==title&&<p className="bko-place">{placeOf(b)}</p>}{refOf(b)&&<span className="bko-reference">{refOf(b)}</span>}</div><div className="bko-row-time">{timeRange(b)?<strong>{timeRange(b)}</strong>:<span>{type==='Pharmacy'?'Order placed':type==='Equipment'?'Rental starts':'Time not yet scheduled'}</span>}<span>{b.patientName||b.labOrder?.patient_name||''}</span></div><span className={`bko-status-label status-${b.section}`}><i/>{bookingDisplayStatus(b)}</span><Link className="bko-details" to={bookingLink(b,type)} aria-label={`View details for ${title}${refOf(b)?`, ${refOf(b)}`:''}`}>View details <ChevronRight/></Link>
   </article>;})}</div></section>)}</section>
   {rows.length>limit&&<div className="bko-more"><span>Showing {visible.length} of {rows.length} bookings</span><button onClick={()=>setLimit(limit+8)}>Show more bookings <ChevronRight/></button></div>}
  </>:unsettled?<div className="bko-inline-state" role="status">Loading your other bookings…</div>:<div className="bko-empty"><CalendarDays/><h2>{all.length?'No bookings found':'No bookings yet'}</h2><p>{all.length?'Try another service, status or search term.':'Your appointments and orders will appear here once you book.'}</p>{all.length?<button className="bko-new" onClick={clear}>Clear filters</button>:<Link className="bko-new" to="/healthcare-services">Explore services <ArrowRight/></Link>}</div>}
  {!initial&&bookingTypes.some(t=>groups[t].state==='loading')&&<div className="bko-inline-state" role="status">Loading more services…</div>}
  <footer className="bko-footer"><Link to="/my-records"><FileText/><span>Medical records<small>Reports & prescriptions</small></span><ChevronRight/></Link><Link to="/ambulance-trips"><Ambulance/><span>Ambulance trips</span><ChevronRight/></Link><Link to="/blood-requests"><Droplet/><span>Blood requests</span><ChevronRight/></Link></footer>
  {filterOpen&&<BookingFilters value={{...filters,status:filters.status==='all'?tab:filters.status}} onClose={()=>setFilterOpen(false)} onApply={value=>{setFilters({...value,status:'all'});setTab(value.status);setFilterOpen(false);}}/>}
 </div>;
}
