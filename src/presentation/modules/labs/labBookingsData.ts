import {getDashboardApi,type BookingProvider} from '../../../services/dashboardHelper';
import {myLabOrdersApi,myLabOrderApi,labPublicApi,type MyLabOrder,type LabPublic,type LabCentre} from '../../../services/labHelper';
import {dashboardBookings} from '../bookings/bookingOverviewData';
export type LabBookingEntry={order:MyLabOrder;provider:BookingProvider|null;lab:LabPublic|null;centre:LabCentre|null};
export function labSection(o:MyLabOrder){return o.status==='CANCELLED'?'cancelled':o.status==='REPORTED'?'completed':'upcoming';}
export const labStatus=(o:MyLabOrder)=>o.status==='IN_PROGRESS'?'In progress':o.status==='PARTIALLY_REPORTED'?'Partial report ready':labSection(o)==='upcoming'?'Upcoming':labSection(o)==='completed'?'Completed':'Cancelled';
export function labAddress(entry:LabBookingEntry){return entry.order.visit_type==='HOME'?[entry.order.home_address,('home_pincode' in entry.order?entry.order.home_pincode:null)].filter(Boolean).join(', '):entry.order.location_address||entry.centre?.address||entry.provider?.place?.address;}
export function labPreparations(entry:LabBookingEntry){return Array.from(new Set(entry.order.items.filter(i=>i.status!=='CANCELLED').flatMap(i=>{const t=entry.lab?.tests?.find(t=>t.code===i.test_code);return t?.instructions?[t.instructions]:[t&&t.fasting_hours>0?`Fast for ${t.fasting_hours} hours before the test.`:null];}).filter((s):s is string=>!!s)));}
export const labNabl=(entry:LabBookingEntry)=>entry.provider?.nabl?.current===true||entry.lab?.nabl?.current===true;
export async function loadLabEntries():Promise<LabBookingEntry[]>{
 const [orders,dashboard]=await Promise.all([myLabOrdersApi(),getDashboardApi()]);
 const bookings=dashboardBookings(dashboard);
 const ids=[...new Set(orders.map(o=>o.lab_partner_id||bookings.find(b=>b.labOrder?.id===o.id)?.providerId).filter((id):id is string=>!!id))];
 const labs=new Map(await Promise.all(ids.map(async id=>[id,await labPublicApi(id)] as const)));
 return orders.map(order=>{const b=bookings.find(b=>b.labOrder?.id===order.id);const id=order.lab_partner_id||b?.providerId;const lab=id?labs.get(id)||null:null;return {order,provider:b?.provider||null,lab,centre:lab?.locations.find(c=>Number(c.id)===Number(order.location_id))||null};});
}
export async function loadLabEntry(id:string){
 const [order,dashboard]=await Promise.all([myLabOrderApi(id),getDashboardApi()]);
 if(!Array.isArray(order.payments)||!Array.isArray(order.timeline))throw new Error('Booking details could not be loaded. Please try again.');
 const b=dashboardBookings(dashboard).find(b=>b.labOrder?.id===order.id),partner=order.lab_partner_id||b?.providerId;
 const lab=partner?await labPublicApi(partner):null;
 return {order,provider:b?.provider||null,lab,centre:lab?.locations.find(c=>Number(c.id)===Number(order.location_id))||null};
}
