import {createSixBookingFixtures} from './helpers/sixBookingFixtures';
import { test, expect, type APIRequestContext } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createBookingsFixture, body, localDate } from './helpers/bookingScreenFixtures';
import { loginAsTestPatient } from './helpers/testAccount';
import { createTestDoctorWithAvailability } from './helpers/testDoctor';
import { registerProviderAccount, lettersFor } from './helpers/providerAccount';
import { standardCategoryResponse } from './helpers/catalog';
const API='http://localhost:3000', shots='artifacts/bookings-six-types';
test.setTimeout(420000);
test.use({actionTimeout:60000});
test('six real booking types, provider details, receipts, invoice, reorder and commerce cancellation',async({page,request})=>{
 await mkdir(shots,{recursive:true});
 const {fixture,doctor,hospital,hospitalBooking,pharmacy,medicine,pharmacyOrder,rental,P,F,createPharmacy,get,post,patient}=await createSixBookingFixtures(request);
 await loginAsTestPatient(page,patient);await page.setViewportSize({width:1440,height:1000});await page.goto('/my-consultations');
 const ready=async()=>{await expect(page.getByRole('region',{name:'Loading bookings',exact:true})).toHaveCount(0,{timeout:70000});await expect(page.getByRole('heading',{name:'Unable to load bookings'})).toHaveCount(0);};await ready();
 await expect(page.getByRole('article')).toHaveCount(6);
 const dashboard=(await get('/patients/dashboard')).data;
 const hospitalData=[...dashboard.active,...dashboard.upcoming,...dashboard.history].find((b:any)=>b.id===hospitalBooking.id);
 expect(hospitalData.provider.payment).toBeTruthy();
 for(const title of ['Doctor Appointment','Lab Tests (1)','Home Care Visit','Hospital Appointment','Pharmacy Order','Equipment Rental'])await expect(page.getByRole('article').getByRole('heading',{name:title,exact:true})).toBeVisible();
 for(const [label,count] of [['All',6],['Upcoming',4],['Completed',2],['Cancelled',0]] as const){const tab=page.getByRole('button',{name:`${label} (${count})`,exact:true});await tab.click();await expect(tab).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('article')).toHaveCount(label==='All'?6:count);}
 await page.getByRole('button',{name:'All (6)',exact:true}).click();
 await page.screenshot({path:`${shots}/desktop-1440.png`});
 await page.setViewportSize({width:1254,height:900});await page.screenshot({path:`${shots}/desktop-reference-width.png`});await page.setViewportSize({width:1440,height:1000});
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.locator('aside').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);await expect.poll(()=>page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:`${shots}/mobile-390.png`,fullPage:true});await expect(page.getByRole('button',{name:'Cancelled (0)',exact:true})).toBeVisible();
 await page.setViewportSize({width:1440,height:1000});
 const detail=page.getByRole('dialog',{name:'Booking details',exact:true});
 const cases=[['doctor',fixture.booking.id],['lab',(await get('/patients/dashboard')).data.active.concat((await get('/patients/dashboard')).data.upcoming).find((b:any)=>b.lab_order?.id===fixture.labOrder.id)?.id],['home-care',(await get('/patients/dashboard')).data.active.concat((await get('/patients/dashboard')).data.upcoming).find((b:any)=>b.home_care?.id===fixture.careOrder.id)?.id],['hospital',hospitalBooking.id],['pharmacy',`pharmacy:${pharmacyOrder.id}`],['equipment',`rental:${rental.id}`]];
 for(const [type,id] of cases){
   const row=page.locator(`[data-booking-id="${id}"]`);await row.getByRole('button',{name:/View details for/}).click();await expect(detail.locator('.bk-provider-block')).toBeVisible();
   await detail.screenshot({path:`${shots}/details-${type}.png`});
   await page.setViewportSize({width:390,height:844});await expect.poll(()=>detail.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await detail.screenshot({path:`${shots}/details-${type}-390.png`});await page.setViewportSize({width:1440,height:1000});
   if(type==='doctor'){await expect(detail.getByText('To be paid at clinic',{exact:true})).toBeVisible();await expect(detail.getByRole('button',{name:'View receipt',exact:true})).toHaveCount(0);await expect(detail.getByRole('link',{name:'Get directions',exact:true})).toHaveAttribute('href',/google.com/);}
   if(type==='lab'){const pendingDownload=page.waitForEvent('download');await detail.getByRole('button',{name:'Download booking slip',exact:true}).click();const slip=await pendingDownload;expect(slip.suggestedFilename()).toBe(`VIZITO-booking-slip-${fixture.labOrder.order_number}.pdf`);await slip.saveAs(`${shots}/lab-booking-slip.pdf`);await detail.getByRole('button',{name:'View preparation instructions',exact:true}).click();await expect(detail.locator('.bk-instructions')).toBeVisible();await expect(detail.getByRole('status')).toHaveCount(0,{timeout:20000});}
   if(type==='home-care'){await detail.getByRole('button',{name:'View service instructions',exact:true}).click();await expect(detail.locator('.bk-instructions')).toContainText('Booking screen verification');await expect(detail.getByText('Certified nurses and attendants')).toHaveCount(0);}
   if(type==='hospital'){
     await expect(detail.getByRole('button',{name:'Reschedule',exact:true})).toHaveCount(0);await expect(detail.getByRole('link',{name:'View visit summary',exact:true})).toBeVisible();
     const newPage=page.waitForEvent('popup');await detail.getByRole('button',{name:'View receipt',exact:true}).click();const receipt=await newPage;await expect(receipt.locator('body')).toContainText(hospitalData.provider.payment.transaction_number);await expect(receipt.locator('body')).toContainText(hospitalData.provider.payment.receipt_number);await expect(receipt.locator('body')).toContainText(String(hospitalData.provider.payment.amount));await expect(receipt.locator('body')).not.toContainText(/VZT-SIM|simulated|Transaction Ref/i);await receipt.screenshot({path:`${shots}/hospital-receipt.png`});await receipt.close();
     await expect(detail.getByRole('link',{name:'Book again',exact:true})).toHaveAttribute('href',new RegExp(`doctor=${doctor.partnerId}`));
     await detail.getByRole('link',{name:'Book again',exact:true}).click();await expect(page).toHaveURL(new RegExp(`provider=${hospital.current_account.partner_id}`));await expect(page.getByRole('radiogroup',{name:'Doctor',exact:true}).getByRole('radio',{name:new RegExp(doctor.fullName)})).toHaveAttribute('aria-checked','true',{timeout:60000});await page.screenshot({path:`${shots}/book-again.png`});await page.goto(`/my-consultations?open=${hospitalBooking.id}`);await ready();await expect(detail.locator('.bk-provider-block')).toBeVisible();
   }
   if(type==='pharmacy'){
     const newPage=page.waitForEvent('popup');await detail.getByRole('button',{name:'View invoice',exact:true}).click();const invoice=await newPage;await expect(invoice.locator('body')).toContainText(medicine.medicine_name);await expect(invoice.locator('body')).toContainText(pharmacyOrder.id);await invoice.screenshot({path:`${shots}/pharmacy-invoice.png`});await invoice.close();
     const saved=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().includes('/orders/baskets/'));await detail.getByRole('button',{name:'Order again',exact:true}).click();expect((await saved).ok()).toBe(true);await expect(page).toHaveURL(new RegExp(`/pharmacy-orders/new\\?pharmacy=${pharmacy.current_account.partner_id}`));
     const baskets=await get('/orders/baskets');expect(baskets.find((b:any)=>b.pharmacyId===pharmacy.current_account.partner_id).lines.find((l:any)=>l.medicine.id===medicine.id).quantity).toBe(2);await page.screenshot({path:`${shots}/order-again.png`});await page.goto('/my-consultations');await ready();continue;
   }
   await detail.getByRole('button',{name:'Back to bookings',exact:true}).click();
 }
 // Apply and clear every new type without changing the authoritative global counts.
 for(const type of ['Hospital','Pharmacy','Equipment']){await page.getByRole('button',{name:'Filter bookings',exact:true}).click();const panel=page.getByRole('dialog',{name:'Filter bookings',exact:true});await panel.getByRole('button',{name:type,exact:true}).click();await panel.screenshot({path:`${shots}/filter-${type.toLowerCase()}.png`});await panel.getByRole('button',{name:'Apply',exact:true}).click();await expect(page.getByRole('article')).toHaveCount(1);await expect(page.getByRole('button',{name:'All (6)',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Filter bookings',exact:true}).click();await panel.getByRole('button',{name:'Clear',exact:true}).click();await panel.getByRole('button',{name:'Apply',exact:true}).click();await expect(page.getByRole('article')).toHaveCount(6);}
 await page.getByRole('textbox',{name:'Search bookings',exact:true}).fill(pharmacyOrder.id);await expect(page.getByRole('article')).toHaveCount(1);await page.getByRole('button',{name:'Clear booking search'}).click();
 // Owner-approved commerce exception: no Reschedule; cancellation still confirms and persists.
 const pending=await createPharmacy();await page.reload();await ready();
 for(const id of [`pharmacy:${pending.id}`,`rental:${rental.id}`]){
   const row=page.locator(`[data-booking-id="${id}"]`);await expect(row.getByRole('button',{name:'Reschedule',exact:true})).toHaveCount(0);await expect(row.getByRole('button',{name:'View Details',exact:true})).toBeVisible();await row.getByRole('button',{name:'Cancel',exact:true}).click();await expect(detail.getByRole('group',{name:'Cancel this booking',exact:true})).toBeVisible();await detail.getByRole('radio',{name:'Booked by mistake',exact:true}).click();await detail.getByRole('button',{name:'Yes, cancel booking',exact:true}).click();await expect(detail).toHaveCount(0,{timeout:70000});await ready();await expect(row).toContainText('Cancelled');await page.getByRole('button',{name:/^All \(/}).click();
 }
 const pharmacyLatest=await get(`/orders/${pending.id}/mine`),rentalLatest=await get(`/rental/patient/orders/${rental.order_number}`);expect(pharmacyLatest.status).toBe('CANCELLED');expect(rentalLatest.status).toBe('CANCELLED');
 await writeFile(`${shots}/verification.json`,JSON.stringify({types:6,hospitalReceipt:!!hospitalData.provider.payment,pharmacyStatus:pharmacyLatest.status,rentalStatus:rentalLatest.status},null,2));
});
