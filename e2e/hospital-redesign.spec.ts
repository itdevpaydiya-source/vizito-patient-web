import {expect,test,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {payWithTestCard} from './audit/zz-rzp-helper';

const ART='../artifacts/hospital-redesign';
async function signIn(page:Page,request:any){
  const response=await request.post('http://localhost:3000/patient/auth/login',{data:{phone:'8866314762',password:'Vizito@2026'}});
  expect(response.ok()).toBeTruthy();const auth=await response.json();
  await page.goto('/auth/login');
  await page.evaluate(a=>{localStorage.setItem('vizito_token',a.access_token);localStorage.setItem('vizito_user',JSON.stringify({token:a.access_token,role:'patient',fullName:a.full_name}));sessionStorage.setItem('vizito_search_area',JSON.stringify({lat:17.4622,lng:78.3568,label:'Kondapur 500084',source:'manual',at:Date.now()}));},auth);
  return auth;
}
async function shot(page:Page,name:string,width:number){
  await page.setViewportSize({width,height:950});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:`${ART}/${name}-${width}.png`,fullPage:true,animations:'disabled'});
}

test('hospital list, Sunrise profile, calendar and Razorpay checkout',async({page,request})=>{
  await mkdir(ART,{recursive:true});await signIn(page,request);await page.goto('/find-hospitals');
  await expect(page.getByRole('heading',{name:'Find the right hospital or clinic, near you'})).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Distance'})).toBeVisible();
  await expect(page.locator('.hj-card')).not.toHaveCount(0);
  for(const width of [1440,1280,390])await shot(page,'01-list',width);
  await page.setViewportSize({width:1280,height:950});await page.getByRole('textbox',{name:'Search hospitals'}).fill('Sunrise');
  await expect(page.locator('.hj-card')).toHaveCount(1);await page.getByRole('button',{name:'View details'}).click();
  await expect(page.locator('.hj-profile-head h1')).toContainText('Sunrise');
  for(const tab of ['Overview','Departments & OPD','Doctors','Facilities','Photos','Reviews','Location'])await expect(page.getByRole('button',{name:new RegExp(`^${tab}`)})).toBeVisible();
  await page.getByRole('button',{name:'Departments & OPD'}).click();await expect(page.getByRole('button',{name:'View full calendar'})).toBeVisible();
  for(const width of [1440,1280,390])await shot(page,'02-profile-opd',width);
  await page.setViewportSize({width:1280,height:950});await page.getByRole('button',{name:'View full calendar'}).first().click();
  await expect(page).toHaveURL(/doctor=/);await expect(page.getByRole('dialog',{name:/Appointments with Meera Rao/})).toBeVisible();await expect(page.getByText('Available',{exact:true})).toBeVisible();
  for(const width of [1440,1280,390])await shot(page,'03-doctor-calendar',width);
  await page.setViewportSize({width:1280,height:950});const day=page.locator('.hj-calendar-grid button[data-status="AVAILABLE"]:not(:disabled)').first();await day.click();
  await page.locator('.hj-doctor-drawer .hj-slots button:not(:disabled)').first().click();await page.getByRole('button',{name:/Continue with this slot/}).click();
  await expect(page.getByRole('heading',{name:'Patient details'})).toBeVisible();await page.getByRole('textbox',{name:'Reason for visit'}).fill('BK-QA hospital redesign online payment walk');
  for(const width of [1440,1280,390])await shot(page,'04-patient-details',width);await page.setViewportSize({width:1280,height:950});await page.getByRole('button',{name:/Continue/}).click();
  await page.getByRole('radio',{name:/Pay online/}).click();await expect(page.getByText('Test mode',{exact:true})).toBeVisible();for(const width of [1440,1280,390])await shot(page,'05-review-pay',width);
  await page.setViewportSize({width:1280,height:950});await page.getByRole('button',{name:/^Pay ₹.*book$/}).click();
  await expect(page.locator('iframe').last()).toBeVisible({timeout:30000});const checkout=page.frameLocator('iframe').last();await expect(checkout.getByRole('textbox',{name:'Card Number'})).toBeVisible();
  await expect(checkout.getByRole('button',{name:'Close Checkout'})).toBeVisible();
  const created=page.waitForResponse(r=>new URL(r.url()).pathname==='/patients/bookings'&&r.request().method()==='POST'&&r.ok(),{timeout:120000});await payWithTestCard(page,'hospital');
  const payload=await (await created).json(),booking=payload.data||payload;await expect(page.getByRole('heading',{name:'Your OPD appointment is confirmed!'})).toBeVisible({timeout:30000});await shot(page,'06-confirmation',1280);
  await page.getByRole('link',{name:'View booking details'}).click();await expect(page).toHaveURL(/my-consultations\?type=Hospital/);await expect(page.getByText(booking.booking_number,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Cancel appointment',exact:true}).click();const cancel=page.getByRole('dialog');await page.getByLabel('Reason for cancelling',{exact:true}).fill('BK-QA hospital redesign refund verification');const cancelled=page.waitForResponse(r=>r.url().includes(`/bookings/patient/${booking.id}/cancel`)&&r.request().method()==='POST');await cancel.getByRole('button',{name:'Yes, cancel appointment',exact:true}).click();const refund=await (await cancelled).json();expect(refund.refund.amount).toBe(800);await expect(page.getByRole('status')).toContainText('Refund of ₹800 started');await shot(page,'07-cancelled-refund',1280);
});
