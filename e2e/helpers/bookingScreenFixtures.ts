import {createTestDoctorWithAvailability} from './testDoctor';
import {expect, type APIRequestContext} from '@playwright/test';
import {createTestPatient} from './testAccount';
const API='http://localhost:3000';
export const localDate=(offset:number)=>new Date(Date.now()+offset*86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
export async function body(response:any){expect(response.ok(),`${response.status()} ${await response.text()}`).toBe(true);return response.json();}
export async function createBookingsFixture(request:APIRequestContext){
  const patient = await createTestPatient(request),
    headers = { Authorization: `Bearer ${patient.token}` };
  const get = async (path: string) => {
    let response = await request.get(`${API}${path}`, { headers });
    for (let i = 0; i < 2 && response.status() === 503; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      response = await request.get(`${API}${path}`, { headers });
    }
    return body(response);
  };
  const post = async (path: string, data: any) => {
    const key = crypto.randomUUID();
    let response = await request.post(`${API}${path}`, {
      headers: { ...headers, 'Idempotency-Key': key },
      data,
    });
    if (response.status() === 503 && path === '/lab-orders') {
      const mine = await get('/lab-orders/mine');
      const existing = mine.find(
        (o: any) =>
          o.visit_date === data.visit_date &&
          o.visit_time === data.visit_time &&
          o.status !== 'CANCELLED',
      );
      if (existing) return existing;
      await get('/lab-tests/labs?tests=FBS');
      response = await request.post(`${API}${path}`, {
        headers: { ...headers, 'Idempotency-Key': key },
        data,
      });
    }
    return body(response);
  };
  const providers = await get('/patients/providers?service=DOCTOR');
  let doctor: any,
    doctorSlots: any[],
    doctorDate = '';
  for (const provider of providers.data.slice(0, 12)) {
    const date = localDate(2),
      r = await request.get(
        `${API}/patients/providers/${provider.id}/slots?date=${date}`,
        { headers },
      );
    if (!r.ok()) continue;
    const slots = (await r.json()).data;
    if (
      Array.isArray(slots) &&
      slots.filter((s: any) => !s.is_booked).length > 2
    ) {
      doctor = provider;
      doctorSlots = slots.filter((s: any) => !s.is_booked);
      doctorDate = date;
      break;
    }
  }
  if(!doctor){
    const ops=await body(await request.post(`${API}/auth/ops/login`,{data:{email:'ops.support@vizito.test',password:'OpsSupport123!'}}));
    const fresh=await createTestDoctorWithAvailability(request,async id=>{await body(await request.post(`${API}/partners/ops/${id}/review`,{headers:{Authorization:`Bearer ${ops.access_token}`},data:{action:'Approve'}}));});
    doctor={id:fresh.partnerId};doctorDate=localDate(1);
    doctorSlots=(await get(`/patients/providers/${fresh.partnerId}/slots?date=${doctorDate}`)).data.filter((s:any)=>!s.is_booked);
  }
  expect(
    doctor,
    'A live doctor with at least three free slots is required',
  ).toBeTruthy();
  const booking = (
    await post('/patients/bookings', {
      partner_id: doctor.id,
      service_type: 'In Person',
      booking_date: doctorDate,
      time_slot_id: doctorSlots![0].time_slot_id,
      time_slot: String(doctorSlots![0].start_time).slice(0, 5),
      payment_mode: 'Pay at Clinic (Cash)',
    })
  ).data;
  const labs = await get('/lab-tests/labs?tests=FBS');
  let lab: any, centre: any, availability: any;
  for (const l of labs) {
    for (const c of l.locations || []) {
      if (!c.address || !c.city) continue;
      const r = await request.get(
        `${API}/lab-orders/availability?lab_partner_id=${l.id}&location_id=${c.id}&visit_type=LAB_VISIT`,
        { headers },
      );
      if (!r.ok()) {
        console.log('AVAILABILITY_FAILURE', l.name, c.id, r.status());
        continue;
      }
      const a = await r.json();
      if (
        a.bookable &&
        a.days.some((d: any) => d.date !== doctorDate && d.slots.some((s: any) => s.available))
      ) {
        lab = l;
        centre = c;
        availability = a;
        break;
      }
    }
    if (lab) break;
  }
  expect(
    lab,
    'A live lab with an availability-backed slot is required',
  ).toBeTruthy();
  const day = availability.days.find((d: any) =>
      d.date !== doctorDate && d.slots.some((s: any) => s.available),
    ),
    slot = day.slots.find((s: any) => s.available);
  const labOrder = await post('/lab-orders', {
    lab_partner_id: lab.id,
    location_id: centre.id,
    test_codes: ['FBS'],
    visit_date: day.date,
    visit_time: slot.time,
    payment_mode: 'CASH',
  });
  const agencies = await get('/patients/providers?service=HOME_CARE');
  let service: any,
    carePin = '';
  for (const agency of agencies.data) {
    const cover = await request.get(
      `${API}/home-care/agencies/${agency.id}/coverage`,
      { headers },
    );
    if (!cover.ok()) continue;
    const coverage = await cover.json();
    for (const pin of coverage.pincodes) {
      const catalogue = await get(`/home-care/catalogue?pincode=${pin}`);
      const hit = catalogue.services.find((svc: any) => svc.kind === 'VISIT');
      if (hit) {
        service = hit;
        carePin = pin;
        break;
      }
    }
    if (service) break;
  }
  expect(service, 'A live home-care visit service is required').toBeTruthy();
  const careOrder = await post('/home-care/orders', {
    service_id: service.id,
    sessions: 1,
    start_date: localDate(3),
    start_time: service.agency.day_open,
    address: { line: centre.address, city: centre.city, pincode: carePin },
    care_needs: 'Booking screen verification',
    payment_mode: 'CASH',
  });
  const carePermissions = await get(`/home-care/orders/${careOrder.id}`);
  expect(carePermissions.can_reschedule).toBe(true);
  expect(carePermissions.reschedule_visit_id).toBeTruthy();
  return {patient,headers,get,post,booking,labOrder,careOrder,carePermissions,doctorSlots:doctorSlots!,doctorDate,centre,carePin};
}
