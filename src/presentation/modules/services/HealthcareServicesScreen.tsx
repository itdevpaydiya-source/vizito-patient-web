import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowRight,ChevronLeft,ChevronRight,Grid2X2,List,Search,SlidersHorizontal,Star,X} from 'lucide-react';
import {exploreAssets} from '../../../assets/explore';
import {kindOf,providerDistance,type ProviderKind} from '../../components/ProviderCard';
import LocationBar from '../../components/location/LocationBar';
import {Skeleton} from '../../components/motion/Motion';
import {useSearchArea} from '../../../services/location';
import type {ProviderItem} from '../../../services/types';
import BookingDialog from '../bookings/BookingDialog';
import {StateEmpty,StateFilteredEmpty,StateError} from '../bookings/BookingStates';
import {loadExploreProviders,offersOnline,startingFee} from './exploreProviders';
import ExploreProviderCard from './ExploreProviderCard';
import '../bookings/BookingsReference.css';
import './HealthcareServicesScreen.css';

const tiles=[
 {id:'all',name:'All providers',description:'View all services',image:exploreAssets.tiles.allProviders},
 {id:'doctor',name:'Doctor consultation',description:'In-clinic & online',image:exploreAssets.tiles.doctorConsultation},
 {id:'hospital',name:'Hospitals & clinics',description:'OPD & specialist care',image:exploreAssets.tiles.hospitalsClinics},
 {id:'lab',name:'Lab tests',description:'Blood, urine, imaging',image:exploreAssets.tiles.labTests},
 {id:'homecare',name:'Home care services',description:'Nursing, physio & more',image:exploreAssets.tiles.homeCare},
 {id:'pharmacy',name:'Pharmacy',description:'Medicines & refills',image:exploreAssets.tiles.pharmacy},
 {id:'equipment',name:'Medical equipment',description:'Rent equipment',image:exploreAssets.tiles.medicalEquipment},
 {id:'ambulance',name:'Ambulance',description:'Patient transport',image:exploreAssets.tiles.ambulance},
 {id:'bloodbank',name:'Blood services',description:'Find or donate blood',image:exploreAssets.tiles.bloodServices},
] as const;
type Category=ProviderKind|'all';
const prices=[{label:'₹0 – ₹500',min:0,max:500},{label:'₹500 – ₹1,000',min:500,max:1000},{label:'₹1,000 – ₹2,500',min:1000,max:2500},{label:'₹2,500+',min:2500,max:Infinity}];
type Sort='recommended'|'nearest'|'rating'|'price';
export default function HealthcareServicesScreen(){
 const [params,setParams]=useSearchParams(),urlQuery=params.get('q')||params.get('search')||'';
 const [query,setQuery]=useState(urlQuery),[category,setCategory]=useState<Category>('all'),[providers,setProviders]=useState<ProviderItem[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[sort,setSort]=useState<Sort>('recommended'),[view,setView]=useState<'grid'|'list'>('grid'),[page,setPage]=useState(1),[filtersOpen,setFiltersOpen]=useState(false),[online,setOnline]=useState(false),[ratings,setRatings]=useState<number[]>([]),[priceRanges,setPriceRanges]=useState<number[]>([]),[radius,setRadius]=useState<number|null>(null);
 const area=useSearchArea(),requestId=useRef(0);
 useEffect(()=>{setSort(area?'nearest':'recommended');setPage(1);},[area]);
 const load=useCallback(async()=>{const id=++requestId.current;setLoading(true);setError(false);try{const all=await loadExploreProviders();if(id===requestId.current)setProviders(all);}catch{if(id===requestId.current)setError(true);}finally{if(id===requestId.current)setLoading(false);}},[]);
 useEffect(()=>{void load();return()=>{requestId.current++;};},[load]);
 useEffect(()=>{setQuery(urlQuery);setPage(1);},[urlQuery]);
 useEffect(()=>{setPage(1);if(!area)setSort(s=>s==='nearest'?'recommended':s);},[area]);
 const changeCategory=(value:Category)=>{setCategory(value);setPage(1);};
 const clear=()=>{setCategory('all');setQuery('');setParams({});setOnline(false);setRatings([]);setPriceRanges([]);setRadius(null);setSort('recommended');setPage(1);};
 const filtered=useMemo(()=>{
  const search=query.trim().toLowerCase();
  const rows=providers.filter(p=>{
   if(category!=='all'&&kindOf(p)!==category)return false;
   const haystack=[p.name,p.specialization,p.qualification,p.subtitle,p.specialtyOrType,p.partnerType,p.address,p.city,tiles.find(t=>t.id===kindOf(p))?.name,...(p.org?.locations.flatMap(l=>[l.name,l.area,l.city])||[]),...(p.org?.departments.map(d=>d.name)||[])].filter(Boolean).join(' ').toLowerCase();
   if(search&&!haystack.includes(search))return false;
   if(online&&!offersOnline(p))return false;
   if(ratings.length&&(!p.rating||p.rating.count<=0||p.rating.average<Math.min(...ratings)))return false;
   const fee=startingFee(p);if(priceRanges.length&&(fee==null||!priceRanges.some(i=>fee>=prices[i].min&&(prices[i].max===Infinity||fee<=prices[i].max))))return false;
   if(area&&radius!=null){const distance=providerDistance(p,area);if(!distance||distance.metres>radius*1000)return false;}
   return true;
  });
  if(sort==='rating')rows.sort((a,b)=>(b.rating?.count?b.rating.average:-1)-(a.rating?.count?a.rating.average:-1));
  if(sort==='price')rows.sort((a,b)=>(startingFee(a)??Infinity)-(startingFee(b)??Infinity));
  if(sort==='nearest'&&area)rows.sort((a,b)=>(providerDistance(a,area)?.metres??Infinity)-(providerDistance(b,area)?.metres??Infinity));
  return rows;
 },[providers,category,query,online,ratings,priceRanges,area,radius,sort]);
 const pages=Math.max(1,Math.ceil(filtered.length/9)),currentPage=Math.min(page,pages),visible=filtered.slice((currentPage-1)*9,currentPage*9);
 const toggle=(values:number[],value:number)=>values.includes(value)?values.filter(v=>v!==value):[...values,value];
 const filters=(scope:string)=><><header className="explore-filter-heading"><h2>Filters</h2><button onClick={clear}>Clear all</button></header><fieldset><legend>Service type</legend>{tiles.map(t=><label key={t.id}><input type="radio" name={'explore-service-'+scope} checked={category===t.id} onChange={()=>changeCategory(t.id)}/>{t.name}</label>)}</fieldset>
 <fieldset className="explore-location"><legend>Location</legend><div className="explore-radius" role="group" aria-label="Search radius">{[5,10,25].map(km=><button key={km} disabled={!area} aria-pressed={radius===km&&!!area} onClick={()=>{setRadius(radius===km?null:km);setPage(1);}}>{km} km</button>)}</div></fieldset>
 <fieldset><legend>Availability</legend><label className="explore-unavailable" title="Same-day appointment availability is not supplied by this directory"><input type="checkbox" disabled/>Available today</label><label><input type="checkbox" checked={online} onChange={e=>{setOnline(e.target.checked);setPage(1);}}/>Online consultation</label></fieldset>
 <fieldset><legend>Rating</legend>{[4,3,2].map(r=><label key={r}><input type="checkbox" checked={ratings.includes(r)} onChange={()=>{setRatings(toggle(ratings,r));setPage(1);}}/><Star className="explore-star"/>{r.toFixed(1)} and above</label>)}</fieldset>
 <fieldset><legend>Price range</legend>{prices.map((range,i)=><label key={range.label}><input type="checkbox" checked={priceRanges.includes(i)} onChange={()=>{setPriceRanges(toggle(priceRanges,i));setPage(1);}}/>{range.label}</label>)}</fieldset></>;
 return <div className="explore-page"><section className="explore-heading-row"><div className="explore-heading"><nav aria-label="Breadcrumb"><Link to="/dashboard">Dashboard</Link><ChevronRight/><span>Explore services</span></nav><h1>Explore healthcare services</h1><p>Find and book trusted healthcare services near you.</p><div className="explore-trust"><span><img src={exploreAssets.icons.verified} alt=""/>Verified providers</span><span><img src={exploreAssets.icons.nearby} alt=""/>Nearby options</span><span><img src={exploreAssets.icons.easyBooking} alt=""/>Easy online booking</span></div></div><div className="explore-hero"><img src={exploreAssets.hero} alt="Doctor consulting a patient — illustrative scene"/><div><h2>Quality care<br/>for you and your family</h2><p>Consult, test, treat or get care at home.</p><Link className="explore-primary" to="/find-doctors">Book an appointment<ArrowRight/></Link></div></div></section>
 <section className="explore-tiles" aria-label="Browse by service">{tiles.map(t=><button key={t.id} type="button" data-motion-service-card aria-pressed={category===t.id} onClick={()=>changeCategory(t.id)}><img src={t.image} alt=""/><strong>{t.name}</strong><span>{t.description}</span></button>)}</section>
 <LocationBar purpose="find providers near you"/><div className="explore-content"><aside className="explore-filter-panel" aria-label="Provider filters">{filters('desktop')}</aside><section className="explore-results" aria-label="Find providers"><div className="explore-toolbar"><label className="explore-search"><Search/><input type="search" aria-label="Search providers" placeholder="Search providers by name, speciality, service or location..." value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/>{query&&<button aria-label="Clear provider search" onClick={()=>{setQuery('');setParams({});setPage(1);}}><X/></button>}</label><label className="explore-sort">Sort by<select aria-label="Sort providers" value={sort} onChange={e=>{setSort(e.target.value as Sort);setPage(1);}}><option value="recommended">Recommended</option><option value="nearest" disabled={!area}>Nearest</option><option value="rating">Rating</option><option value="price">Price</option></select></label><div className="explore-view" role="group" aria-label="Provider layout"><button aria-label="Grid view" aria-pressed={view==='grid'} onClick={()=>setView('grid')}><Grid2X2/></button><button aria-label="List view" aria-pressed={view==='list'} onClick={()=>setView('list')}><List/></button></div><button className="explore-mobile-filters" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(true)}><SlidersHorizontal/>Filters</button></div>
 {!loading&&!error&&<div className="explore-result-count" aria-live="polite"><strong>{filtered.length.toLocaleString('en-IN')} {filtered.length===1?'provider':'providers'} found</strong><span>{filtered.length?'Showing '+((currentPage-1)*9+1)+'–'+Math.min(currentPage*9,filtered.length)+' of '+filtered.length:'Showing 0 of 0'}</span></div>}
 {loading?<div className="explore-provider-grid" aria-label="Loading providers" aria-busy="true">{Array.from({length:9},(_,i)=><Skeleton key={i} className="explore-provider-skeleton"><div/><span/><span/><span/></Skeleton>)}</div>:error?<StateError title="Unable to load providers" description="Something went wrong. Please try again." retry={()=>void load()} home={false}/>:!providers.length?<StateEmpty title="No providers available yet" description="Healthcare providers will appear here when they are available."><button className="booking-button" onClick={()=>void load()}>Refresh providers</button></StateEmpty>:!filtered.length?<StateFilteredEmpty title="No providers match these filters" description="Try another service, location or search term." clear={clear}/>:<><div className={'explore-provider-grid '+(view==='list'?'explore-list-view':'')} data-motion-list>{visible.map(p=><ExploreProviderCard key={p.id} provider={p} area={area}/>)}</div>{pages>1&&<nav className="explore-pagination" aria-label="Provider pages"><button disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}><ChevronLeft/>Previous</button><span>Page {currentPage} of {pages}</span><button disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>Next<ChevronRight/></button></nav>}</>}
 </section></div>{filtersOpen&&<BookingDialog label="Provider filters" className="lab-action-dialog explore-page explore-filter-sheet" onClose={()=>setFiltersOpen(false)}><button className="explore-filter-close" aria-label="Close filters" onClick={()=>setFiltersOpen(false)}><X/></button>{filters('mobile')}<button className="explore-primary explore-apply" onClick={()=>setFiltersOpen(false)}>Show results</button></BookingDialog>}</div>;
}

