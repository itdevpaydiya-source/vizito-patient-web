import MediaImage,{mediaInitials} from '../../components/MediaImage';
import {Ambulance,Droplets,Building2,FlaskConical,Home,Pill,Stethoscope} from 'lucide-react';
export type ProviderImageType='doctor'|'lab'|'homecare'|'hospital'|'clinic'|'pharmacy'|'equipment'|'ambulance'|'bloodbank';
export function WheelchairIcon(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13" cy="3" r="1.5" fill="currentColor"/><path d="M13 6v7h6l2 6M13 9h5M9 8a7 7 0 1 0 7 11"/></svg>;}
export const providerIcons={doctor:Stethoscope,lab:FlaskConical,homecare:Home,hospital:Building2,clinic:Building2,pharmacy:Pill,equipment:WheelchairIcon,ambulance:Ambulance,bloodbank:Droplets};
export const initialsOf=(name?:string|null)=>mediaInitials(name||'');
export default function ProviderImage({type,name,url,size='medium',className='',service=false,category}:{type:ProviderImageType;name?:string|null;url?:string|null;size?:'small'|'medium'|'large';className?:string;service?:boolean;category?:string|null}){
 return <MediaImage kind={category&&type==='equipment'?'equipment':type==='doctor'?'doctor':'business'} category={category} businessType={type} name={name||type} src={url} showInitials={!service} className={`provider-image provider-${type} provider-image-${size} ${className}`}/>;
}
