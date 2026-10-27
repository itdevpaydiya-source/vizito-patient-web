import {expect,type APIRequestContext} from '@playwright/test';
import {createBookingsFixture,body,localDate} from './bookingScreenFixtures';
import {createTestDoctorWithAvailability} from './testDoctor';
import {registerProviderAccount,lettersFor} from './providerAccount';
import {standardCategoryResponse} from './catalog';
const API='http://localhost:3000';
export async function createSixBookingFixtures(request:APIRequestContext){
 const fixture=await createBookingsFixture(request),{patient,headers:P,post,get,centre}=fixture;
 const ops=await body(await request.post(`${API}/auth/ops/login`,{data:{email:'ops.support@vizito.test',password:'OpsSupport123!'}}));
 const approve=async(id:string)=>{await body(await request.post(`${API}/partners/ops/${id}/review`,{headers:{Authorization:`Bearer ${ops.access_token}`},data:{action:'Approve'}}));};
 const doctor=await createTestDoctorWithAvailability(request,approve);
 const n=Date.now();
 const hospital=await registerProviderAccount(request,API,{full_name:`PW Hospital Owner ${lettersFor(n)}`,phone:`8${String(n).slice(-9)}`,email:`pw-bookings-hospital-${n}@vizito.test`,date_of_birth:'1980-05-05',gender:'male',provider_type_id:3,password:'PlaywrightTest123!',hospitalName:`PW Bookings Hospital ${n}`});
 const H={Authorization:`Bearer ${hospital.access_token}`},D={Authorization:`Bearer ${doctor.token}`};
 const hpost=async(path:string,data:any)=>body(await request.post(`${API}${path}`,{headers:H,data}));
 const branch=await hpost('/facility/address-pricing',{name:`PW Bookings Branch ${n}`,facility_type:'Hospital',address_line_1:centre.address,city:centre.city,state:'Telangana',pincode:centre.pincode,phone:patient.mobile,provider_type:'Hospital'});
 const fid=branch.facility.id;
 const dept=await hpost('/departments',{name:'General Medicine'});
 const fd=await hpost(`/facility/${fid}/departments`,{departmentId:Number(dept.data.id),inPersonFee:800,onlineFee:800});
 await hpost(`/facility/${fid}/doctors/request`,{doctor_id:doctor.numericId,facility_department_id:Number(fd.data.id),designation:'Consultant'});
 await body(await request.patch(`${API}/facility/${fid}/doctors/${doctor.numericId}/accept`,{headers:D,data:{}}));
 const day=localDate(1);
 await body(await request.post(`${API}/doctor/availability`,{headers:D,data:{clinic_id:fid,consultation_types:['IN_PERSON'],availability_type:'SINGLE_DATE',start_date:day,end_date:day,start_time:'13:00:00',end_time:'15:00:00',slot_duration:20}}));
 await approve(hospital.current_account.partner_id);
 const slots=(await get(`/patients/providers/${doctor.partnerId}/slots?date=${day}&facility_id=${fid}&hospital_partner_id=${hospital.current_account.partner_id}`)).data;
 const slot=slots.find((s:any)=>!s.is_booked);expect(slot).toBeTruthy();
 const hospitalBooking=(await post('/patients/bookings',{partner_id:doctor.partnerId,hospital_partner_id:hospital.current_account.partner_id,service_type:'In Person',booking_date:day,time_slot_id:slot.time_slot_id,time_slot:String(slot.start_time).slice(0,5),payment_mode:'UPI',payment:{payment_method:'UPI',upi_id:'bookings-qa@upi'}})).data;
 const appointments=await body(await request.get(`${API}/appointments?date=${day}`,{headers:D}));
 const appt=(Array.isArray(appointments)?appointments:appointments.data).find((a:any)=>a.booking_id===hospitalBooking.id);
 expect(appt).toBeTruthy();const aid=appt.appointment_number||appt.booking_number||appt.id;
 for(const [path,data] of [['start-consultation',{}],['consultation',{chief_complaint:'Local UI verification only',diagnosis:'QA fixture — not clinical care'}],['prescription',{status:'Finalized',temperature:98.6,systolic_bp:120,diastolic_bp:80,spo2:99,no_known_allergies:true,medicines:[],general_advice:'Local UI verification only.'}],['complete-consultation',{}]] as const){await body(await request.post(`${API}/appointments/${aid}/${path}`,{headers:D,data}));}
 const pharmacy=await registerProviderAccount(request,API,{full_name:'PW Bookings Pharmacist',phone:`6${String(n).slice(-9)}`,email:`pw-bookings-pharmacy-${n}@vizito.test`,date_of_birth:'1980-05-05',gender:'male',provider_type_id:6,password:'PlaywrightTest123!',pharmacyName:`PW Bookings Pharmacy ${n}`});
 const F={Authorization:`Bearer ${pharmacy.access_token}`};await approve(pharmacy.current_account.partner_id);
 const category=await body(await standardCategoryResponse(request));
 const medicine=await body(await request.post(`${API}/medicines`,{headers:D,data:{medicine_name:`PW Bookings Medicine ${n}`,generic_name:'Paracetamol',strength:'500',dosage_form:'Tablet',category_id:category.id,mrp:30,requires_prescription:false}}));
 await body(await request.post(`${API}/medicine-stock`,{headers:F,data:{medicine_id:medicine.id,batch_number:`BK${n}`,expiry_date:`${new Date().getFullYear()+2}-12-31`,quantity_received:30}}));
 await post('/patients/address',{address_type:'HOME',address_line_1:centre.address,pincode:centre.pincode,city:centre.city,state:'Telangana'});
 const me=await get('/patients/me'),address=(me.data??me).addresses[0],addressId=address.addressId||address.id;
 const createPharmacy=()=>post('/orders',{pharmacy_partner_id:pharmacy.current_account.partner_id,fulfillment_type:'DELIVERY',delivery_address_id:addressId,payment_method:'CASH',items:[{medicine_id:medicine.id,quantity:2}]});
 const pharmacyOrder=await createPharmacy();
 for(const act of ['claim','checkout','complete']){await body(await request.post(`${API}/orders/${pharmacyOrder.id}/${act}`,{headers:F,data:{}}));}
 // Own API-created stock prevents repeated QA runs exhausting another provider's catalogue.
 const equipment=await registerProviderAccount(request,API,{full_name:`PW Equipment Owner ${lettersFor(n)}`,phone:`7${String(n).slice(-9)}`,email:`pw-bookings-equipment-${n}@vizito.test`,date_of_birth:'1980-05-05',gender:'male',provider_type_id:10,password:'PlaywrightTest123!',organizationName:`PW Equipment ${n}`});
 await approve(equipment.current_account.partner_id);
 const product=await body(await request.post(`${API}/rental/partner/products`,{headers:{Authorization:`Bearer ${equipment.access_token}`},data:{name:`PW QA Wheelchair ${n}`,daily_rental_price:100,stock_quantity:2,min_rental_days:1}}));
 const rental=await post('/rental/patient/orders',{product_id:Number(product.id),quantity:1,start_date:localDate(4),end_date:localDate(4+Number(product.min_rental_days||1)),delivery_address:{recipientName:patient.fullName,phone:patient.mobile,addressLine:centre.address,city:centre.city,pincode:centre.pincode}});
 return {fixture,doctor,hospital,hospitalBooking,pharmacy,medicine,pharmacyOrder,rental,P,F,createPharmacy,get,post,patient};
}
