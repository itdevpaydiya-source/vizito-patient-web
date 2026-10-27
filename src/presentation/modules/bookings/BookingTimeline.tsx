import type {ReactNode} from 'react';
import {CheckCircle2} from 'lucide-react';
export interface BookingTimelineEntry {code:string;label:ReactNode;state:'completed'|'current'|'pending';occurred_at:string|null;scheduled_for?:string|null}
/** Shared vertical booking timeline; timestamps are supplied by the owned record. */
export default function BookingTimeline({entries,formatTimestamp,className=''}:{entries:BookingTimelineEntry[];formatTimestamp:(value:string)=>string;className?:string}) {
 return <ol className={`lab-status-timeline ${className}`} aria-label="Status timeline">{entries.map((step,i)=><li key={`${step.code}-${i}`} className={`step-${step.state}`} aria-current={step.state==='current'?'step':undefined}><span className="timeline-dot">{step.state==='completed'?<CheckCircle2/>:<i/>}</span><div><strong>{step.label}</strong><p>{step.occurred_at?formatTimestamp(step.occurred_at):step.scheduled_for?`Scheduled · ${formatTimestamp(step.scheduled_for)}`:'Pending'}</p></div></li>)}</ol>;
}
