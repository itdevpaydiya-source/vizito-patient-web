import MediaImage from './MediaImage';
import type { ProviderItem } from '../../services/types';

/** All provider cards share the same load validation and inline fallback. */
export default function BusinessImage({p,className=''}:{p:ProviderItem;className?:string}){
 const type=String(p.partnerType||p.serviceId||'');
 return <MediaImage src={p.logo} name={p.name} businessType={type} kind={/doctor/i.test(type)?'doctor':'business'} className={`object-contain ${className}`}/>;
}
