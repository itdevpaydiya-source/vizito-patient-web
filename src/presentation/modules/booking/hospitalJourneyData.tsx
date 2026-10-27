import type {AvailableSlot,Branch} from '../../../services/bookingHelper';
import {formatSlotTime,getBranchesApi,getBranchDoctorsApi,getProviderSlotsWithPauseApi} from '../../../services/bookingHelper';
import type {HospitalFacts,ProviderItem} from '../../../services/types';
import {directionsUrl,addressSearchUrl} from '../../../services/location';
import {ShieldCheck,HeartPulse,Star} from 'lucide-react';
import MediaImage from '../../components/MediaImage';
export const hospitalToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const addDay=(date:string,n:number)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export const niceDay=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
export const money=(value:number|string)=>`₹${Number(value).toLocaleString('en-IN')}`;
export const errorText=(e:unknown)=>{const x=e as {response?:{data?:{message?:string|string[]}}};const m=x.response?.data?.message;return Array.isArray(m)?m.join(' '):m||'Unable to load hospital information. Please retry.';};
export const verifiedNabh=(h?:HospitalFacts|null)=>!!h?.accreditations.some(a=>a.name.toUpperCase()==='NABH'&&a.verification_status==='VERIFIED');
export const bookableSlots=(slots:AvailableSlot[],date:string)=>slots.filter(s=>!s.is_booked&&Date.parse(`${(s.slot_date||date).slice(0,10)}T${s.start_time.slice(0,5)}:00+05:30`)>Date.now());
export const address=(b?:Branch)=>[b?.address_line_1,b?.area,b?.city,b?.state,b?.pincode].filter(Boolean).join(', ');
export const mapLink=(b?:Branch)=>b?.pin?directionsUrl(b.pin):address(b)?addressSearchUrl(address(b)):null;
export function Hours({facts}:{facts?:HospitalFacts|null}){return facts?.opd_hours.length?<div className="hj-hours"><h3>OPD Timings</h3>{facts.opd_hours.map(h=><div key={h.day}><span>{h.day.slice(0,3)}</span><span>{h.is_closed?'Closed':h.open&&h.close?`${formatSlotTime(h.open)} – ${formatSlotTime(h.close)}`:''}</span></div>)}</div>:null;}
export function Badges({facts}:{facts?:HospitalFacts|null}){return <div className="hj-chips">{verifiedNabh(facts)&&<span className="hj-verified"><ShieldCheck/>NABH Accredited</span>}{facts?.emergency_24x7===true&&<span><HeartPulse/>24x7 Emergency</span>}{facts?.cashless_available===true&&<span><ShieldCheck/>Cashless insurance</span>}</div>;}
export function Rating({rating}:{rating?:ProviderItem['rating']}){return rating&&rating.count>0?<p className="hj-rating"><Star/>{rating.average.toFixed(1)} <span>({rating.count} reviews)</span></p>:null;}
export function HospitalImage({provider}:{provider:ProviderItem}){return <div className="hj-image"><MediaImage src={provider.logo} name={provider.name} kind="business" businessType="hospital"/>{!provider.logo&&<small>Hospital illustration</small>}</div>;}
export async function todayAvailable(p:ProviderItem){if(p.pause)return false;for(const b of await getBranchesApi(p.id)){for(const d of await getBranchDoctorsApi(b.facility_id)){const r=await getProviderSlotsWithPauseApi(d.doctor_partner_id,hospitalToday(),b.facility_id,p.id);if(!r.paused&&bookableSlots(r.slots,hospitalToday()).length)return true;}}return false;}



