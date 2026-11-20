import type {PharmacyRequestItem,PharmacyQuoteLine} from '../../../services/types';
export const quoteLines = (r:PharmacyRequestItem):PharmacyQuoteLine[]|null => {if(!r.quote_items)return [];try{const rows=JSON.parse(r.quote_items);if(!Array.isArray(rows)||rows.some(l=>!l||typeof l.prescribed_name!=='string'||typeof l.available!=='boolean'))return null;return rows;}catch{return null;}};
// Owner 18 Nov: a Vizito e-prescription is never quoted. Once sent it simply sits at that pharmacy: the
// patient shows the Rx number at the counter, or orders it in the app at the pharmacy's own prices.
export const atPharmacy=(r:PharmacyRequestItem)=>r.status==='Accepted'&&!r.order_id&&!!r.prescription_id&&!r.document_id&&!(r.quote_items||'').trim();
// rxStatus: the prescription's own pharmacy status ("Dispensed" once filled at a counter).
export const requestGroup=(r:PharmacyRequestItem,rxStatus?:string|null)=>r.order_id?'closed':atPharmacy(r)&&rxStatus==='Dispensed'?'closed':r.status==='Accepted'?'attention':r.status==='Requested'?'waiting':'closed';
export const quoteExpired=(r:PharmacyRequestItem,now=Date.now())=>!!r.quote_valid_until&&Number.isFinite(Date.parse(r.quote_valid_until))&&Date.parse(r.quote_valid_until)<now;
// A closed request shows its own state first: a cancelled order's request reads "Cancelled", never "Ordered".
export const requestLabel=(r:PharmacyRequestItem,rxStatus?:string|null)=>['Cancelled','Rejected','Expired'].includes(r.status)?({Rejected:'Declined by pharmacy',Cancelled:'Cancelled',Expired:'Expired'} as Record<string,string>)[r.status]:r.order_id?'Ordered':atPharmacy(r)?(rxStatus==='Dispensed'?'Dispensed':'At pharmacy'):r.status==='Accepted'&&(r.quote_items||'').trim()&&quoteLines(r)?.length?'Quote ready':({Requested:'Waiting for pharmacy',Accepted:'Accepted',Rejected:'Declined by pharmacy',Cancelled:'Cancelled',Expired:'Expired'}[r.status]||r.status);
export const requestDate=(value:string|null|undefined)=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}):null;
// Dosage-form words ("Tab Paracetamol 650" vs "Paracetamol 650 mg Tablet") don't make a substitute (same rule as the pharmacy).
const FORM_WORDS=/\b(tab|tabs|tablet|tablets|cap|caps|capsule|capsules|syp|syrup|inj|injection|susp|suspension|oint|ointment|drops?|cream|gel)\b\.?/g;
const baseName=(name:string)=>name.toLowerCase().replace(FORM_WORDS,' ').replace(/\s+/g,' ').trim().replace(/\s*\d+(\.\d+)?\s*(mg|mcg|g|gm|ml|iu|%)\b.*$/,'').replace(/\s+/g,' ').trim();
export const differentProduct=(line:PharmacyQuoteLine)=>!!line.item_name&&baseName(line.item_name)!==baseName(line.prescribed_name);
export const canResendRequest=(r:PharmacyRequestItem,all:PharmacyRequestItem[])=>['Rejected','Cancelled','Expired'].includes(r.status)&&!all.some(other=>other.id!==r.id&&(other.prescription_id?other.prescription_id===r.prescription_id:!!r.document_id&&other.document_id===r.document_id)&&['Requested','Accepted'].includes(other.status));
