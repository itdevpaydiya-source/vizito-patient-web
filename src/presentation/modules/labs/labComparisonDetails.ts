import type {LabHit} from '../../../services/labHelper';
import {rupees} from '../../../services/labHelper';
import type {LatLng} from '../../../services/location';
export function centreLocality(labName:string,centre:{name?:string|null;city?:string|null}) {
 const name=centre.name?.trim()||'';
 const labWords=labName.trim().split(/\s+/),centreWords=name.split(/\s+/);
 let shared=0;
 while(shared<labWords.length&&shared<centreWords.length&&labWords[shared].toLocaleLowerCase()===centreWords[shared].toLocaleLowerCase())shared++;
 const area=(shared?centreWords.slice(shared).join(' '):name).replace(/^[\s,·–—-]+/,'');
 return [area,centre.city&&!area.toLocaleLowerCase().includes(centre.city.toLocaleLowerCase())?centre.city:null].filter(Boolean).join(', ');
}
export const validPin=(p:LatLng|null|undefined):p is LatLng=>!!p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
export const comparisonDistance=(m:number)=>!Number.isFinite(m)||m<0?'':m<1000?`${Math.max(50,Math.round(m/50)*50)} m`:`${(m/1000).toFixed(1)} km`;
export function nextAvailable(value:string|null|undefined, now=new Date()):string|null {
 if(!value)return null;
 const date=new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value)?value:`${value}+05:30`);
 if(!Number.isFinite(date.getTime()))return null;
 const day=(d:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
 const label=day(date)===day(now)?'Today':day(date)===day(new Date(now.getTime()+86400000))?'Tomorrow':new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',weekday:'short',day:'numeric',month:'short'}).format(date);
 const time=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',hour:'numeric',minute:'2-digit',hour12:true}).format(date);
 return `${label}, ${time}`;
}
export function homeCollection(lab:LabHit,pin?:string|null):string|null {
 const h=lab.settings?.home;if(!h)return null;
 if(!h.enabled)return 'Not offered';
 const fee=typeof h.fee==='number'&&Number.isFinite(h.fee)&&h.fee>=0?` (+${rupees(h.fee)})`:'';
 if(pin&&Array.isArray(h.pincodes)&&!h.pincodes.includes(pin))return `Not available at your PIN ${pin}`;
 if(!pin)return `Available in selected areas${fee}`;
 const slot=nextAvailable(lab.next_home_slot);
 return `Available${fee}${slot?` · from ${slot}`:''}`;
}
