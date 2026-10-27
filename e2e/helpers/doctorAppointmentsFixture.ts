import {expect,type APIRequestContext} from '@playwright/test';
import {createTestDoctorWithAvailability} from './testDoctor';
import {createTestPatient} from './testAccount';
import {body,localDate} from './bookingScreenFixtures';
const API='http://localhost:3000';
export async function doctorAppointmentsFixture(request:APIRequestContext){
 const ops=await body(await request.post(`${API}/auth/ops/login`,{data:{email:'ops.support@vizito.test',password:'OpsSupport123!'}}));
 const doctor=await createTestDoctorWithAvailability(request,async id=>{await body(await request.post(`${API}/partners/ops/${id}/review`,{headers:{Authorization:`Bearer ${ops.access_token}`},data:{action:'Approve'}}));});
 const patient=await createTestPatient(request),P={Authorization:`Bearer ${patient.token}`},D={Authorization:`Bearer ${doctor.token}`},day=localDate(1);
 const get=(path:string,headers=P)=>request.get(`${API}${path}`,{headers}).then(body);
 const post=(path:string,data:any={},headers=P)=>request.post(`${API}${path}`,{headers,data}).then(body);
 const slots=(await get(`/patients/providers/${doctor.partnerId}/slots?date=${day}&facility_id=${doctor.facilityId}`)).data.filter((s:any)=>!s.is_booked);expect(slots.length).toBeGreaterThan(4);
 async function book(slot:any,paid=false,service='In Person'){return (await post('/patients/bookings',{partner_id:doctor.partnerId,service_type:service,booking_date:day,time_slot_id:slot.time_slot_id,time_slot:String(slot.start_time).slice(0,5),payment_mode:paid?'UPI':'Pay at Clinic (Cash)',...(paid?{payment:{payment_method:'UPI',upi_id:'qa-doctor@upi'}}:{})})).data;}
 const unpaid=await book(slots[0]),paid=await book(slots[1],true),completed=await book(slots[2]),cancelled=await book(slots[3]);await post(`/bookings/patient/${cancelled.id}/cancel`,{reason:'Local QA state verification'});
 await post('/doctor/availability',{clinic_id:doctor.facilityId,consultation_types:['VIDEO'],availability_type:'SINGLE_DATE',start_date:day,end_date:day,start_time:'13:00:00',end_time:'14:00:00',slot_duration:15},D);
 const videoSlots=(await get(`/patients/providers/${doctor.partnerId}/slots?date=${day}&facility_id=${doctor.facilityId}`)).data.filter((s:any)=>!s.is_booked&&String(s.start_time).startsWith('13:'));expect(videoSlots.length).toBeGreaterThan(0);const video=await book(videoSlots[0],false,'Video');
 const appointments=await get(`/appointments?date=${day}`,D);const appointment=(Array.isArray(appointments)?appointments:appointments.data).find((a:any)=>a.booking_id===completed.id);expect(appointment).toBeTruthy();const aid=appointment.appointment_number||appointment.booking_number||appointment.id;
 await post(`/appointments/${aid}/start-consultation`,{},D);await post(`/appointments/${aid}/consultation`,{chief_complaint:'Local doctor UI verification only',diagnosis:'QA record — not clinical care'},D);await post(`/appointments/${aid}/prescription`,{status:'Finalized',temperature:98.6,systolic_bp:120,diastolic_bp:80,spo2:99,no_known_allergies:true,medicines:[],followup_date:localDate(8),general_advice:'Local UI verification only.'},D);await post(`/appointments/${aid}/complete-consultation`,{},D);
 return {doctor,patient,day,P,D,get,post,unpaid,paid,completed,cancelled,video};
}
