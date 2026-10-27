import type {DashboardBooking} from '../../../services/dashboardHelper';
import {bookingView} from '../../../utils/bookingView';
import {formatTime} from '../../../utils/dateFormat';
export function upcomingDashboardBookings(bookings:DashboardBooking[],name:string,now=Date.now()){
 return [...new Map(bookings.map(b=>[b.id,b])).values()].map(b=>{
  const view=bookingView({...b,doctorName:b.doctorName||b.provider?.doctor?.name||null},name),date=b.homeCare?.next_visit?.date||view.date,start=b.homeCare?.next_visit?.start_time||view.time;
  const end=b.homeCare?.next_visit?.end_time||b.endTime;
  // A date without a recorded time remains upcoming through that IST day; no time is displayed.
  const at=date?Date.parse(date.slice(0,10)+'T'+(start?start.slice(0,8).padEnd(8,':00'):'23:59:59')+'+05:30'):NaN;
  const href=b.labOrder?'/lab-bookings?open='+encodeURIComponent(b.labOrder.id):b.homeCare?'/home-care?tab=mine&open='+encodeURIComponent(b.homeCare.id):'/appointments?type='+(b.business?.type==='Hospital'?'Hospital':'Doctor')+'&open='+encodeURIComponent(b.id);
  return {booking:b,view:{...view,date,time:start,href},at,timeLabel:[start&&formatTime(start),end&&formatTime(end)].filter(Boolean).join(' – ')};
 }).filter(row=>Number.isFinite(row.at)&&row.at>=now&&!/cancel|reject|complete|report ready|reported|declin/i.test(row.view.status)).sort((a,b)=>a.at-b.at).slice(0,3);
}
export const dashboardDate=(date:string)=>new Date(date.slice(0,10)+'T00:00:00+05:30');
export const dashboardDatePart=(date:string,part:'weekday'|'month')=>dashboardDate(date).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',[part]:'short'});
export const friendlyStatus=(status:string)=>status.replace(/_/g,' ').toLowerCase().replace(/^\w/,c=>c.toUpperCase());
