import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,MapPin,Star,CheckCircle2,Video,Clock,Building2,Stethoscope,FlaskConical,Home,Pill,Package,Ambulance,Droplet} from 'lucide-react';
import {exploreAssets} from '../../../assets/explore';
import {kindOf,providerRoute,providerDistance} from '../../components/ProviderCard';
import FavoriteButton from '../../components/FavoriteButton';
import MediaImage from '../../components/MediaImage';
import {formatDistance,type SearchArea} from '../../../services/location';
import type {ProviderItem} from '../../../services/types';
import {startingFee,providerFeatures,providerMeta} from './exploreProviders';

/** Missing provider uploads use clearly labelled representative imagery. */
function ExplorePhoto({provider:p}:{provider:ProviderItem}){
 const kind=kindOf(p),[failed,setFailed]=useState<string|null>(null);
 const src=p.logo?.trim(),real=src&&failed!==src;
 const objects={doctor:exploreAssets.fallbacks.doctor,hospital:exploreAssets.fallbacks.hospital,lab:exploreAssets.fallbacks.lab,homecare:exploreAssets.fallbacks.homecare,pharmacy:exploreAssets.fallbacks.pharmacy,equipment:exploreAssets.fallbacks.equipment,ambulance:exploreAssets.fallbacks.ambulance,bloodbank:exploreAssets.fallbacks.bloodbank};
 const fallback=objects[kind as keyof typeof objects];
 const absolute=src?(/^(https?:|blob:|data:|\/images\/)/i.test(src)?src:`${String(import.meta.env.VITE_API_URL||'http://localhost:3000').replace(/\/$/,'')}/${src.replace(/^\//,'')}`):'';
 return <div className="explore-photo">{real?<img src={absolute} alt={p.name} loading="lazy" onError={()=>setFailed(src)} onLoad={e=>{if(e.currentTarget.naturalWidth<48||e.currentTarget.naturalHeight<48)setFailed(src);}}/>:fallback?<><img src={fallback} alt={`${providerMeta[kind].label}: representative image`} loading="lazy"/><span className="explore-representative">Representative image</span></>:<MediaImage kind="business" name={p.name} className="explore-initials"/>}</div>;
}
const icons={doctor:Stethoscope,hospital:Building2,lab:FlaskConical,homecare:Home,pharmacy:Pill,equipment:Package,ambulance:Ambulance,bloodbank:Droplet,other:Building2};
export default function ExploreProviderCard({provider:p,area}:{provider:ProviderItem;area:SearchArea|null}){
 const kind=kindOf(p),meta=providerMeta[kind],Icon=icons[kind],fee=startingFee(p),distance=providerDistance(p,area),features=providerFeatures(p);
 const location=p.org?.locations[0];
 const where=location?[location.area,location.city].filter(Boolean).join(', '):p.city||p.address;
 const friendly:Record<string,string>={pharmacy:'Pharmacy',ambulance:'Ambulance service',equipment:'Medical equipment rental',rental:'Medical equipment rental',bloodbank:'Blood bank',homecare:'Home care agency',hospitaladmin:'Hospital',clinicowner:'Clinic',diagnostics:'Diagnostic laboratory',doctor:'Doctor'};
 const type=p.specialization||p.specialtyOrType||p.subtitle||p.partnerType;
 const friendlyType=type?(friendly[type.toLowerCase().replace(/[\s_-]+/g,'')]||type.replace(/[_-]+/g,' ').replace(/^\w/,c=>c.toUpperCase())):meta.label;
 const subtitle=kind==='doctor'?p.specialization||p.qualification||friendlyType:kind==='hospital'?p.org?.departments.map(d=>d.name).slice(0,2).join(', ')||friendlyType:friendlyType;
 return <article className={`explore-provider-card explore-type-${kind} motion-hover-card`} aria-label={`${p.name}, ${meta.label}`}>
  <div className="explore-card-top"><ExplorePhoto key={`${p.id}:${p.logo||''}`} provider={p}/><div className="explore-card-info"><span className="explore-type-chip"><Icon/>{meta.label}</span><h2>{p.name}</h2>{subtitle&&<p className="explore-subtitle">{subtitle}</p>}{p.rating&&p.rating.count>0&&<p className="explore-rating"><Star/><strong>{p.rating.average.toFixed(1)}</strong><span>({p.rating.count.toLocaleString('en-IN')} reviews)</span></p>}{where&&<p className="explore-place" title={where}><MapPin/><span>{where}</span></p>}{area&&distance&&<p className="explore-distance"><MapPin/>{formatDistance(distance.metres)}</p>}</div><FavoriteButton partnerId={p.id} name={p.name}/></div>
  {features.length>0&&<div className="explore-features">{features.map(f=><span className={`explore-feature feature-${f.tone}`} key={f.label}>{f.tone==='amber'?<Clock/>:f.label==='Online consultation'?<Video/>:<CheckCircle2/>}{f.label}</span>)}</div>}
  <footer>{fee!=null&&<div className="explore-price"><strong>₹{fee.toLocaleString('en-IN')}</strong><span>{kind==='doctor'?'Consultation fee from':'Consultation from'}</span></div>}{p.pause?<button className="explore-primary" disabled>Bookings paused</button>:<Link className="explore-primary" to={providerRoute(p)}>{meta.action}<ArrowRight/></Link>}</footer>
 </article>;
}
