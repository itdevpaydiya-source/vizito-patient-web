import {ChevronDown,ChevronRight} from 'lucide-react';
export default function BookingGroupHeading({label,count,expanded,onClick}:{label:string;count:number;expanded:boolean;onClick:()=>void}){return <button className={`lab-group-heading ${expanded?'is-expanded':''}`} aria-expanded={expanded} onClick={onClick}>{expanded?<ChevronDown/>:<ChevronRight/>}{label} ({count})</button>;}
