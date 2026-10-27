import {paymentMethodLabel} from '../../../utils/paymentLabels';
import {dedupeAddressParts} from '../../../utils/address';
import type {HcOrder,HcVisit} from '../../../services/homecareHelper';

export type CareGroup='ongoing'|'upcoming'|'completed'|'cancelled';

export const careGroups:CareGroup[]=['ongoing','upcoming','completed','cancelled'];

export const careGroupLabels={ongoing:'Ongoing',upcoming:'Upcoming',completed:'Completed',cancelled:'Cancelled'};

export function nextCareVisit(o:HcOrder):HcVisit|undefined{return o.visits.find(v=>['ON_THE_WAY','ARRIVED','IN_PROGRESS'].includes(v.status))||o.visits.find(v=>v.id===o.next_visit?.id)||o.visits.find(v=>!['COMPLETED','CANCELLED','FAILED','NO_SHOW','PROVIDER_MISSED'].includes(v.status))||o.visits.at(-1);}

export function careGroup(o:HcOrder):CareGroup {if(o.status==='CANCELLED')return 'cancelled';if(o.status==='COMPLETED')return 'completed';return o.status==='IN_PROGRESS'||o.visits.some(v=>['ON_THE_WAY','ARRIVED','IN_PROGRESS'].includes(v.status))?'ongoing':'upcoming';}

export function carePlan(o:HcOrder){if(o.kind==='SHIFT')return `${o.shift_hours}-hour care`;if(o.sessions>1)return `Course visit ${nextCareVisit(o)?.seq||1} of ${o.sessions}`;return 'Single visit';}

export function carePayment(o:HcOrder){return o.payment_status==='REFUNDED'?'Refunded':o.payment_status==='PAID'?'Paid':o.kind==='SHIFT'?'Pay after shift':'Pay after visit';}

export function careStamp(value:string){return new Date(value).toLocaleString('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true});}

export function printCareDocument(o:HcOrder){

 const popup=window.open('','_blank');if(!popup)throw new Error('Allow pop-ups to open this document.');

 const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

 const title=['PAID','REFUNDED'].includes(o.payment_status||'')?'Receipt':'Booking slip';

 const rows=[['Booking ID',o.order_number],['Agency',o.agency_name],['Service',o.service_name],['Patient',o.patient_name],['Address',dedupeAddressParts(o.address,o.landmark,o.pincode)],['Booked on',careStamp(o.created_at)],['Amount',`Rs. ${o.total_amount.toFixed(2)}`],['Payment status',o.payment_status||'Unpaid'],['Method',paymentMethodLabel(o.payment_mode)]];

 const payments=o.payments.map(p=>`<section><h2>${esc(p.receipt_number||'Payment')}</h2><dl>${[['Amount',p.amount],['Method',paymentMethodLabel(p.method)],['Transaction ID',p.transaction_number],['Receipt number',p.receipt_number],['Payment date',p.paid_at?careStamp(p.paid_at):null],['Status',p.status]].filter(([,v])=>v!=null).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>`).join('');

 popup.document.write(`<!doctype html><html><head><title>VIZITO ${esc(title)} ${esc(o.order_number)}</title><style>body{font:16px system-ui;max-width:760px;margin:40px auto;padding:24px;color:#102653}dl{display:grid;grid-template-columns:180px 1fr;gap:12px}dd{margin:0;overflow-wrap:anywhere}button{padding:10px}@media print{button{display:none}}</style></head><body><h1>Vizito — ${esc(title)}</h1><dl>${rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${payments||'<p>Pay after the visit. No online payment recorded.</p>'}<button onclick="window.print()">Print / Save as PDF</button></body></html>`);popup.document.close();

}


/** The current visit drives both the list card and the detail header. Terminal order states win. */
export function careStatus(o:HcOrder):string {if(['CANCELLED','COMPLETED'].includes(o.status))return o.status;return nextCareVisit(o)?.status||o.status;}
