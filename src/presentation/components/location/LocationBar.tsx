import {useState} from 'react';
import {MapPin,ChevronDown} from 'lucide-react';
import {useSearchArea,setSearchArea} from '../../../services/location';
import ServiceLocationDialog from './ServiceLocationDialog';
export default function LocationBar({purpose='find providers near you',compact=false}:{purpose?:string;compact?:boolean}){const area=useSearchArea(),[open,setOpen]=useState(false);return <div className={`sl-bar ${compact?'sl-bar-compact':''}`} aria-label="Service location"><button type="button" className="sl-chip" aria-label="Change service location" onClick={()=>setOpen(true)}><MapPin/><span>{area?.label||'Set your location'}</span><ChevronDown/></button><small>{area?'Distances are approximate.':`Choose an area to ${purpose}.`}</small>{area&&<button type="button" className="sl-bar-clear" onClick={()=>setSearchArea(null)}>Clear location</button>}{open&&<ServiceLocationDialog onClose={()=>setOpen(false)}/>}</div>;}
