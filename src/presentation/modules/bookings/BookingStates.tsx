import {Skeleton,StateIllustration} from '../../components/motion/Motion';
import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {RotateCcw} from 'lucide-react';
export function StateArt({kind}:{kind:'empty'|'lab'|'error'|'filtered'|'not-found'|'reports'|'doctor'|'doctor-not-found'|'homecare'|'hospital'|'pharmacy'|'equipment'|'ambulance'|'blood'|'pharmacy-error'}){
 return <span className={`booking-state-art art-${kind}`} aria-hidden="true"><StateIllustration kind={kind}/></span>;
}
export function StateLoading({layout='cards',compact=false}:{layout?:'cards'|'rows'|'detail';compact?:boolean}){
 return <section className={`booking-loading loading-${layout} ${compact?'is-compact':''}`} aria-label="Loading bookings" aria-busy="true"><span className="sr-only" role="status">Loading bookings…</span>{Array.from({length:compact?1:layout==='detail'?1:layout==='rows'?4:6},(_,i)=><Skeleton className="booking-skeleton" key={i}><div className="skeleton-heading"><i/><div><b/><span/></div></div><div className="skeleton-line"/><div className="skeleton-line"/><div className="skeleton-line short"/></Skeleton>)}</section>;
}
export function StateEmpty({title='No bookings yet',description='You don’t have any appointments, orders or service requests. Explore our healthcare services and book your first appointment.',lab=false,compact=false,art,children}:{title?:string;description?:string;lab?:boolean;compact?:boolean;art?:'doctor'|'homecare'|'hospital'|'pharmacy'|'equipment'|'ambulance'|'blood';children?:ReactNode}){
 return <section className={`booking-state ${compact?'is-compact':''}`} aria-label="Empty bookings"><StateArt kind={art||(lab?'lab':'empty')}/><h2>{title}</h2><p>{description}</p>{children||<Link className="booking-button primary" to="/healthcare-services">Explore Services</Link>}</section>;
}
export function StateError({title='Unable to load your bookings',description='Something went wrong while fetching your bookings. Please try again.',retry,compact=false,home=true,back='/dashboard',backLabel='Go to Home',art='error'}:{title?:string;description?:string;retry:()=>void;compact?:boolean;home?:boolean;back?:string;backLabel?:string;art?:'error'|'pharmacy-error'}){
 return <section className={`booking-state booking-error ${compact?'is-compact':''}`}><StateArt kind={art}/><h2 role="alert">{title}</h2><p>{description}</p><div className="booking-state-actions"><button className={`booking-button ${compact?'danger':'primary'}`} onClick={retry}><RotateCcw/>Retry</button>{home&&!compact&&<Link className="booking-button" to={back}>{backLabel}</Link>}</div></section>;
}
export function StateFilteredEmpty({clear,children,title='No bookings found',description='We couldn’t find any bookings matching your filters.'}:{clear:()=>void;children?:ReactNode;title?:string;description?:string}){
 return <section className="booking-state"><StateArt kind="filtered"/><h2>{title}</h2><p>{description}</p><div className="booking-state-actions"><button className="booking-button" onClick={clear}>Clear filters</button>{children}</div></section>;
}
export function StateNotFound({back='/bookings',title='Booking not found',description='This booking may have been cancelled or removed.',backLabel='Go to Bookings',art='not-found',children,inlineActions=false}:{back?:string;title?:string;description?:string;backLabel?:string;art?:'not-found'|'doctor-not-found'|'homecare'|'hospital';children?:ReactNode;inlineActions?:boolean}){return <section className="booking-state"><StateArt kind={art}/><h2>{title}</h2><p>{description}</p><>{inlineActions?<div className="booking-state-actions"><Link className="booking-button" to={back}>{backLabel}</Link>{children}</div>:<><Link className="booking-button" to={back}>{backLabel}</Link>{children}</>}</></section>;}
