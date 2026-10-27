import {useEffect,useRef,useState,useCallback} from 'react';
import {getDashboardApi,type DashboardData} from '../../../services/dashboardHelper';
import {myLabOrdersApi,type MyLabOrder} from '../../../services/labHelper';
import {getMyOrdersApi} from '../../../services/pharmacyOrderHelper';
import {getProviderDetailApi} from '../../../services/bookingHelper';
import {getAddressesApi} from '../../../services/patientHelper';
import {equipmentService} from '../equipment/equipmentService';
import {statusOf,typeOf,commerceStatus,type Booking,type BookingType} from './bookingsPresentation';
export const bookingTypes:BookingType[]=['Doctor','Lab Test','Home Care','Hospital','Pharmacy','Equipment'];
export type BookingGroup={state:'loading'|'ready'|'error';bookings:Booking[]};
export type BookingGroups=Record<BookingType,BookingGroup>;
const initialGroups=()=>bookingTypes.reduce((groups,type)=>{groups[type]={state:'loading',bookings:[]};return groups;},{} as BookingGroups);
export function labBooking(o:MyLabOrder):Booking{return {id:o.id,status:o.status,section:o.status==='CANCELLED'?'cancelled':o.status==='REPORTED'?'completed':'upcoming',lab:o,labOrder:{...o,visit_type:o.visit_type||'LAB_VISIT',patient_name:o.patient_name||null,tests:o.items.filter(i=>i.status!=='CANCELLED').map(i=>i.test_name),package_name:o.items.find(i=>i.package_name)?.package_name||null}};}
export function dashboardBookings(data:DashboardData){return [...new Map([...data.active,...data.upcoming,...data.history].map(b=>[b.id,b])).values()].map(b=>({...b,dashboard:b,section:statusOf(b)}));}
export function useBookingGroups(){
 const [groups,setGroups]=useState<BookingGroups>(initialGroups);const epoch=useRef(0),versions=useRef<Record<string,number>>({});
 const load=useCallback((only?:BookingType)=>{
  const generation=only?epoch.current:++epoch.current;
  const clinical=(!only||['Doctor','Hospital','Home Care'].includes(only));
  const keys=only?(clinical?['Doctor','Hospital','Home Care'] as BookingType[]:[only]):bookingTypes;
  const attempts=Object.fromEntries(keys.map(type=>[type,versions.current[type]=(versions.current[type]||0)+1]));
  const dashboard=(clinical||!only||only==='Lab Test')?getDashboardApi():null;
  setGroups(old=>({...old,...Object.fromEntries(keys.map(t=>[t,{state:'loading',bookings:[]}]))}));
  const save=(type:BookingType,group:BookingGroup)=>{if(generation===epoch.current&&versions.current[type]===attempts[type])setGroups(old=>({...old,[type]:group}));};
  if(clinical)void dashboard!.then(data=>{const rows=dashboardBookings(data);for(const type of ['Doctor','Hospital','Home Care'] as const)save(type,{state:'ready',bookings:rows.filter(b=>typeOf(b)===type)});}).catch(()=>{for(const type of ['Doctor','Hospital','Home Care'] as const)save(type,{state:'error',bookings:[]});});
  if(!only||only==='Lab Test')void Promise.all([myLabOrdersApi(),dashboard!]).then(([orders,data])=>{const clinical=dashboardBookings(data);save('Lab Test',{state:'ready',bookings:orders.map(order=>{const booking=clinical.find(b=>b.labOrder?.id===order.id);return booking?{...booking,lab:order}:labBooking(order);})});}).catch(()=>save('Lab Test',{state:'error',bookings:[]}));
  if(!only||only==='Pharmacy')void Promise.all([getMyOrdersApi(),getAddressesApi()]).then(async([orders,addresses])=>{
    const providers=new Map(await Promise.all([...new Set(orders.map(o=>o.pharmacy_partner_id))].map(async id=>[id,await getProviderDetailApi(id)] as const)));
    save('Pharmacy',{state:'ready',bookings:orders.map(order=>{const a=addresses.find(a=>a.addressId===order.delivery_address_id);return {id:`pharmacy:${order.id}`,status:order.status,section:commerceStatus(order.status),pharmacy:order,pharmacyProvider:providers.get(order.pharmacy_partner_id),deliveryAddress:a?[a.addressLine1,a.addressLine2,a.landmark,a.city,a.pincode].filter(Boolean).join(', '):null};})});
  }).catch(()=>save('Pharmacy',{state:'error',bookings:[]}));
  if(!only||only==='Equipment')void equipmentService.getBookingOrders().then(orders=>save('Equipment',{state:'ready',bookings:orders.map(order=>({id:`rental:${order.id}`,status:order.status,section:commerceStatus(order.status),rental:order}))})).catch(()=>save('Equipment',{state:'error',bookings:[]}));
 },[]);
 useEffect(()=>{load();return()=>{epoch.current++;};},[load]);return {groups,reload:load};
}
