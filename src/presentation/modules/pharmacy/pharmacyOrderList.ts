import { orderEndedBy, type PatientOrder } from '../../../services/types';
export type OrderGroup = 'active' | 'completed' | 'cancelled';
export const orderGroup = (o: PatientOrder): OrderGroup => o.status === 'COMPLETED' ? 'completed' : ['CANCELLED','FULFILLMENT_FAILED'].includes(o.status) ? 'cancelled' : 'active';
export const canPayOrder = (o: PatientOrder) => o.payment_method !== 'CASH' && ['CREATED','AWAITING_PAYMENT'].includes(o.status) && ['PENDING','FAILED'].includes(o.payment_status);
export const orderAction = (o: PatientOrder) => canPayOrder(o) ? 'Pay now' : ['PROCESSING','READY_FOR_PICKUP','OUT_FOR_DELIVERY'].includes(o.status) ? 'Track order' : 'View details';
export const orderAmount = (value: unknown) => value != null && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? `INR ${Number(value).toFixed(2)}` : 'Price not provided';
export const methodLabel = (value: string | null) => value ? ({UPI:'UPI',CARD:'Card',NET_BANKING:'Net banking',WALLET:'Wallet',CASH:'Cash'}[value] || value) : null;
export function paymentSummary(o:PatientOrder) {
 const method=methodLabel(o.payment_method);
 if(o.payment_status==='REFUNDED')return `Refunded ${orderAmount(o.total_amount)}${method ? ` to your ${method}` : ''}`;
 if(o.payment_status==='REFUND_PENDING')return `Refund pending: ${orderAmount(o.total_amount)}`;
 if(o.payment_method==='CASH' && o.status!=='COMPLETED')return ['CANCELLED','FULFILLMENT_FAILED'].includes(o.status) ? null : `${orderAmount(o.total_amount)==='Price not provided' ? 'Price not provided' : `Pay ${orderAmount(o.total_amount)}`} at ${o.fulfillment_type==='DELIVERY'?'delivery':'pickup'}`;
 if(o.payment_status==='PAID')return `Paid${method ? ` via ${method}` : ''}`;
 if(o.payment_status==='FAILED')return 'Payment unsuccessful';
 if(o.payment_method==='CASH')return 'Payment confirmation not provided';
 if(canPayOrder(o))return 'Payment pending';
 return null;
}
export function orderListStatus(o:PatientOrder) {
 const ended=orderEndedBy(o);
 if(ended==='pharmacy')return 'Declined by pharmacy';
 if(ended==='no-answer')return "Pharmacy didn't respond";
 if(o.status==='CANCELLED')return 'Cancelled';
 if(o.status==='FULFILLMENT_FAILED')return 'Could not be fulfilled';
 if(canPayOrder(o))return o.payment_status==='FAILED' ? 'Payment unsuccessful' : 'Payment pending';
 return ({CREATED:'Awaiting pharmacy confirmation',AWAITING_PAYMENT:o.payment_status==='PAID'?'Awaiting pharmacy confirmation':'Payment pending',PAID:o.payment_status==='PAID'?'Awaiting pharmacy confirmation':'Payment pending',PROCESSING:'Being packed',READY_FOR_PICKUP:'Ready for pickup',OUT_FOR_DELIVERY:'Out for delivery',COMPLETED:'Completed'}[o.status] || o.status);
}
export function inDateRange(value:string,range:string,from='',to='',now=new Date()) {
 const date=new Date(value);if(range==='all')return true;
 if(!Number.isFinite(date.getTime()))return false;
 if(range==='custom')return (!from||date>=new Date(`${from}T00:00:00`))&&(!to||date<=new Date(`${to}T23:59:59.999`))&&(!from||!to||from<=to);
 if(range==='year')return date.getFullYear()===now.getFullYear()&&date<=now;
 return date.getTime()>=now.getTime()-Number(range)*86400000&&date<=now;
}

export const statusesForGroup = (group:OrderGroup) => ({active:['CREATED','AWAITING_PAYMENT','PAID','PROCESSING','READY_FOR_PICKUP','OUT_FOR_DELIVERY'],completed:['COMPLETED'],cancelled:['CANCELLED','FULFILLMENT_FAILED']} as const)[group];
export const canRateOrder = (o:PatientOrder, reviews:Record<string,unknown>|null) => o.status==='COMPLETED' && reviews!==null && !Object.prototype.hasOwnProperty.call(reviews,o.id);
export const reorderRoute = (o:PatientOrder) => `/pharmacy-orders/new?pharmacy=${encodeURIComponent(o.pharmacy_partner_id)}`;
export function orderEmptyState(group:OrderGroup, categoryCount:number) {
 return categoryCount ? {title:'No matching orders',body:'Try changing your search or filters.',action:'Clear filters'} : {title:`No ${group} orders yet`,body:group==='active'?'Your active pharmacy orders will appear here.':`Your ${group} pharmacy orders will appear here.`,action:'Browse pharmacies'};
}
