import {useCallback,useEffect,useRef,useState} from 'react';
import {getDashboardApi,type DashboardBooking} from '../../../services/dashboardHelper';
import {getPrescriptionsApi,type PatientPrescription} from '../../../services/patientHelper';
import {getMyReviewsApi,type PatientReview} from '../../../services/reviewHelper';
import {dashboardBookings} from './bookingOverviewData';
import {typeOf,type Booking} from './bookingsPresentation';
export type DoctorBooking=Booking & DashboardBooking;
export function useDoctorAppointments(type:'Doctor'|'Hospital'='Doctor'){
 const [rows,setRows]=useState<DoctorBooking[]>([]),[prescriptions,setPrescriptions]=useState<PatientPrescription[]>([]),[reviews,setReviews]=useState<Record<string,PatientReview>>({}),[state,setState]=useState<'loading'|'ready'|'error'>('loading');
 const version=useRef(0);
 const reload=useCallback(()=>{const current=++version.current;setState('loading');Promise.all([getDashboardApi(),getPrescriptionsApi(),getMyReviewsApi()]).then(([dashboard,rx,ratings])=>{if(current!==version.current)return;const bookings=dashboardBookings(dashboard).filter(b=>typeOf(b)===type) as DoctorBooking[];if(bookings.some(b=>!b.visit||typeof b.visit.can_cancel!=='boolean'||typeof b.visit.can_reschedule!=='boolean'||!Array.isArray(b.visit.timeline)))throw new Error('Appointment details unavailable');setRows(bookings);setPrescriptions(rx);setReviews(ratings);setState('ready');}).catch(()=>{if(current===version.current)setState('error');});},[type]);
 useEffect(()=>{reload();return()=>{version.current++;};},[reload]);return {rows,prescriptions,reviews,state,reload};
}
export const appointmentTimestamp=(value:string)=>new Date(value).toLocaleString('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true});
export const clinicName=(b:DoctorBooking)=>b.provider?.place?.name||b.branchName||b.business?.name;
export const doctorName=(b:DoctorBooking)=>b.provider?.doctor?.name||b.doctorName;
export const visitLabel=(b:DoctorBooking)=>b.visit?.video?'Video consultation':b.kind==='HOME_VISIT'?'Home visit':'In-clinic visit';
export const doctorPaymentLabel=(b:DoctorBooking)=>String(b.paymentStatus).toUpperCase()==='REFUNDED'?'Refunded':b.provider?.payment?'Paid':String(b.paymentStatus).toUpperCase()==='WAIVED'?'Fee waived':b.business?.type==='Hospital'?'Pay at hospital':'Pay at clinic';
export const followupRoute=(b:DoctorBooking)=>b.business?.type==='Hospital'?`/booking?service=hospital&provider=${encodeURIComponent(b.hospitalPartnerId||b.business.id||'')}&doctor=${encodeURIComponent(b.providerId||'')}${b.department?`&department=${encodeURIComponent(b.department)}`:''}${b.facilityId?`&facility=${b.facilityId}`:''}`:`/booking?service=doctor&provider=${encodeURIComponent(b.providerId||'')}${b.facilityId?`&facility=${b.facilityId}`:''}`;
export function clinicPin(b:DoctorBooking){const p=b.provider?.place;return p?.pin_confirmed&&p.latitude!=null&&p.longitude!=null?`${p.latitude},${p.longitude}`:null;}
export const directionsFor=(b:DoctorBooking)=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(clinicPin(b)||'')}`;

export function issuedToken(b:DoctorBooking){const token=b.visit?.token_number?.trim();return token&&!/^(?:n\/?a|not issued)$/i.test(token)?token:null;}
