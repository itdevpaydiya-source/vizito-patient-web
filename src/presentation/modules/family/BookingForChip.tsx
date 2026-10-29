import ThemedSelect from '../../components/forms/ThemedSelect';
import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Users} from 'lucide-react';
import {getFamilyMembersApi,getMyUserId,type PatientFamilyMember} from '../../../services/familyHelper';
import {familyRequest,familyError} from '../../../services/familyJourneyHelper';
import './FamilyJourney.css';
export function useFamilyBookingSelection(family:PatientFamilyMember[],onChange:(value:string)=>void,self=''){
 const [params]=useSearchParams(),requested=params.get('family_member_id'),applied=useRef<string|null>(null);
 useEffect(()=>{if(requested===null||applied.current===requested)return;if(requested==='self'){applied.current=requested;onChange(self);}else if(family.some(f=>String(f.memberUserId)===requested)){applied.current=requested;onChange(requested);}},[requested,family,onChange,self]);
}
export default function BookingForChip({family,value,onChange,self=''}:{family:PatientFamilyMember[];value:string;onChange:(value:string)=>void;self?:string}){
 const [open,setOpen]=useState(false),[params,setParams]=useSearchParams();const member=family.find(f=>String(f.memberUserId)===value);
 const requested=params.get('family_member_id');
 if(!member&&!open&&value===self&&!requested)return null;
 const change=(value:string)=>{onChange(value);setOpen(false);setParams(p=>{const n=new URLSearchParams(p);n.set('family_member_id',value===self?'self':value);return n;},{replace:true});};
 return <div className="fm-booking-chip"><Users size={17}/><strong>{member?`Booking for ${member.name} (${member.relationship})`:value===self?'Booking for yourself':'Loading selected family member…'}</strong><button type="button" onClick={()=>setOpen(!open)}>Change</button>{open&&<label>Booking for<ThemedSelect aria-label="Change booking member" value={value} onChange={e=>change(e.target.value)}><option value={self}>Myself</option>{family.map(f=><option key={f.memberUserId} value={String(f.memberUserId)}>{f.name} ({f.relationship})</option>)}</ThemedSelect></label>}</div>;
}
// Discovery screens share the URL selection with the patient field in the booking form.
export function FamilyBookingEntry(){
 const [family,setFamily]=useState<PatientFamilyMember[]>([]),[value,setValue]=useState(''),[error,setError]=useState(''),[retry,setRetry]=useState(0),[params]=useSearchParams();
 useFamilyBookingSelection(family,setValue);
 useEffect(()=>{let alive=true;familyRequest(async()=>{const id=await getMyUserId();return id?getFamilyMembersApi(id):[];}).then(f=>{if(alive)setFamily(f);}).catch(e=>{if(alive)setError(familyError(e));});return()=>{alive=false;};},[retry]);
 if(!params.has('family_member_id'))return null;
 return error?<div role="alert">{error}<button onClick={()=>{setError('');setRetry(n=>n+1);}}>Retry family</button></div>:<BookingForChip family={family} value={value} onChange={setValue}/>;
}

export function useBookingFamily(onChange:(value:string)=>void){
 const [family,setFamily]=useState<PatientFamilyMember[]>([]),[error,setError]=useState('');
 useFamilyBookingSelection(family,onChange);
 useEffect(()=>{let alive=true;familyRequest(async()=>{const id=await getMyUserId();if(!id)throw new Error('Your patient profile could not be loaded.');return getFamilyMembersApi(id);}).then(f=>{if(alive)setFamily(f);}).catch(e=>{if(alive)setError(familyError(e));});return()=>{alive=false;};},[]);
 return {family,error};
}
