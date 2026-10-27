import {kindOf,type ProviderKind} from '../../components/ProviderCard';
import {getProvidersPageApi} from '../../../services/patientHelper';
import type {ProviderItem} from '../../../services/types';

/** Fetch the complete directory before applying any local filter or pagination. */
export async function loadExploreProviders():Promise<ProviderItem[]>{
 const first=await getProvidersPageApi(undefined,undefined,1,50);
 const records=new Map(first.items.map(p=>[p.id,p]));
 for(let page=2;page<=Math.ceil(first.total/first.limit);page++){
  const next=await getProvidersPageApi(undefined,undefined,page,first.limit);
  if(!next.items.length)throw new Error('The provider directory changed while loading. Please retry.');
  next.items.forEach(p=>records.set(p.id,p));
 }
 return [...records.values()];
}
export function startingFee(p:ProviderItem):number|null{
 const kind=kindOf(p);
 const fees=kind==='doctor'?[p.inClinicFee,p.videoFee]:kind==='hospital'?p.org?.departments.map(d=>d.from_fee)||[]:[];
 const values=fees.filter((v):v is number=>v!=null&&Number.isFinite(Number(v))&&Number(v)>=0).map(Number);
 return values.length?Math.min(...values):null;
}
export const offersOnline=(p:ProviderItem)=>kindOf(p)==='doctor'&&p.videoFee!=null&&Number.isFinite(Number(p.videoFee));
export function providerFeatures(p:ProviderItem):{label:string;tone:'green'|'blue'|'amber'}[]{
 const chips:{label:string;tone:'green'|'blue'|'amber'}[]=[];
 if(p.pause)chips.push({label:'Bookings paused',tone:'amber'});
 if(kindOf(p)==='doctor'){
  if(p.registrationVerified)chips.push({label:'Registration verified',tone:'green'});
  if(offersOnline(p))chips.push({label:'Online consultation',tone:'blue'});
  if(p.inClinicFee!=null)chips.push({label:'In-clinic consultation',tone:'green'});
 }
 if(p.org?.doctor_count)chips.push({label:`${p.org.doctor_count} ${p.org.doctor_count===1?'doctor':'doctors'}`,tone:'green'});
 if(p.org?.locations.length)chips.push({label:`${p.org.locations.length} ${p.org.locations.length===1?'location':'locations'}`,tone:'blue'});
 return chips.slice(0,2);
}
export const providerMeta:Record<ProviderKind,{label:string;action:string}>={
 doctor:{label:'Doctor',action:'Book appointment'},hospital:{label:'Hospital & clinic',action:'Book visit'},lab:{label:'Lab test',action:'Book tests'},homecare:{label:'Home care',action:'Request home care'},pharmacy:{label:'Pharmacy',action:'Order medicines'},equipment:{label:'Equipment rental',action:'Rent equipment'},ambulance:{label:'Ambulance',action:'Book ambulance'},bloodbank:{label:'Blood bank',action:'Request blood'},other:{label:'Provider',action:'View provider'},
};
