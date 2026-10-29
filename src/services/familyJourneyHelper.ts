import api from './index';
import type {HealthProfile, HealthProfileInput} from './healthProfileHelper';
import type {FamilyRelationship} from './familyHelper';

export interface FamilyBooking {id:string;reference:string|null;service_type:string;service_label:string;starts_at:string;status:string;upcoming:boolean;created_at:string}
export interface FamilyBookings {items:FamilyBooking[];upcoming:FamilyBooking[];total:number;recent_count:number;recent_window_days:number}
export interface FamilyCard {
 association_id:string;member_user_id:number;relationship:string;account_kind:'MANAGED'|'LINKED';can_edit_details:boolean;
 full_name:string;first_name:string|null;last_name:string|null;date_of_birth:string|null;age:number|null;gender:string|null;phone:string|null;email:string|null;profile_picture:string|null;
 blood_group:string|null;recent_bookings_count:number;upcoming_bookings_count:number;recent_window_days:number;
}
export interface FamilyDetail extends FamilyCard {health:HealthProfile|null;bookings:FamilyBookings}
export interface FamilyInput {relationship:FamilyRelationship;full_name?:string;first_name?:string;last_name?:string;date_of_birth?:string;gender?:string;phone?:string;health?:HealthProfileInput}
export interface RemovePreview {can_remove:boolean;reason:string|null;upcoming_bookings:FamilyBooking[]}
const base=(id:number)=>`/users/${id}/family-members`;
// A watch-mode reload is temporary. Retry unavailable services five times, a minute apart.
export async function familyRequest<T>(request:()=>Promise<T>):Promise<T>{
 for(let attempt=0;;attempt++)try{return await request();}catch(error){
  const e=error as {response?:{status:number};code?:string};
  if(attempt>=5||!(e.response?.status===503||(!e.response&&['ERR_NETWORK','ECONNREFUSED'].includes(e.code||''))))throw error;
  await new Promise(resolve=>setTimeout(resolve,60000));
 }
}
export const familyJourneyApi={
 self:()=>familyRequest(async()=>(await api.get<FamilyBookings>('/bookings/family-members/self/summary')).data),
 overview:(id:number)=>familyRequest(async()=>(await api.get<FamilyCard[]>(`${base(id)}/overview`)).data),
 detail:(id:number,key:string)=>familyRequest(async()=>(await api.get<FamilyDetail>(`${base(id)}/association/${encodeURIComponent(key)}/details`)).data),
 add:(id:number,input:FamilyInput)=>familyRequest(async()=>(await api.post(base(id),input)).data),
 update:(id:number,key:string,input:FamilyInput)=>familyRequest(async()=>(await api.put<FamilyDetail>(`${base(id)}/association/${encodeURIComponent(key)}/details`,input)).data),
 preview:(id:number,key:string)=>familyRequest(async()=>(await api.get<RemovePreview>(`${base(id)}/association/${encodeURIComponent(key)}/remove-preview`)).data),
 remove:(id:number,key:string)=>familyRequest(async()=>{await api.delete(`${base(id)}/association/${encodeURIComponent(key)}`);}),
};
export function familyError(error:unknown){const e=error as {response?:{data?:{message?:string|string[]}};message?:string};const m=e.response?.data?.message||e.message||'Unable to continue. Please try again.';return Array.isArray(m)?m.join(' '):m;}
export const familyDate=(date:string|null)=>date?new Date(date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}):'Not specified';
export const familyFlow=(path:string,member?:number)=>`${path}?family_member_id=${member||'self'}`;
