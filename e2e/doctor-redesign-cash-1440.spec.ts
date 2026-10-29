import {expect,test,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

const ART='../artifacts/doctor-redesign';
async function login(page:Page,request:any){
  const response=await request.post('http://localhost:3000/patient/auth/login',{data:{phone:'8866314762',password:'Vizito@2026'}});
  expect(response.ok()).toBeTruthy();
  const auth=await response.json();
  await page.goto('/auth/login');
  await page.evaluate(value=>{
    localStorage.setItem('vizito_token',value.access_token);
    localStorage.setItem('vizito_user',JSON.stringify({token:value.access_token,role:'patient',fullName:value.full_name}));
    sessionStorage.setItem('vizito_search_area',JSON.stringify({lat:17.4622,lng:78.3568,label:'Kondapur 500084',source:'manual',at:Date.now()}));
  },auth);
}
async function shot(page:Page,name:string){
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>scrollTo(0,0));
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:`${ART}/${name}-1440.png`,fullPage:true,animations:'disabled'});
}

test('doctor v2 1440 pay-at-clinic walk and cleanup',async({page,request})=>{
  await mkdir(ART,{recursive:true});
  await login(page,request);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/find-doctors');
  await expect(page.locator('.dj-card')).not.toHaveCount(0);
  const filtered=page.waitForResponse(r=>r.url().includes('/patients/providers')&&r.url().includes('mode=IN_CLINIC'));
  await page.getByRole('radio',{name:'In-clinic consultation'}).click();
  await filtered;
  await shot(page,'01-find-doctors');
  const card=page.locator('.dj-card').filter({hasText:'Meera Rao'}).first();
  await card.getByRole('button',{name:'View profile'}).click();
  await expect(page.getByText('Loading doctor information…')).toHaveCount(0);
  await shot(page,'02-profile');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  const clinics=page.getByRole('radiogroup',{name:'Choose clinic'});
  if(await clinics.count())await clinics.getByRole('radio',{name:/Rao Ortho/}).click();
  await page.getByRole('button',{name:/Continue/}).click();
  const day=page.locator('.ds-calendar button:not(:disabled)').last();
  if(await day.count())await day.click();
  const slot=page.locator('.ds-slots button:not(:disabled)').first();
  await expect(slot).toBeVisible();
  await slot.click();
  await shot(page,'03-slot-picker');
  await page.getByRole('button',{name:/Continue/}).last().click();
  const ramesh=page.getByRole('radio',{name:/Ramesh Reddy/});
  if(await ramesh.count())await ramesh.click();
  await page.getByRole('textbox',{name:'Reason for consultation'}).fill('DOC-QA doctor redesign pay at clinic 1440 walk');
  await shot(page,'04-patient-details');
  await page.getByRole('button',{name:/Continue/}).last().click();
  await page.getByRole('radio',{name:/Pay at clinic/}).check();
  await shot(page,'05-review-pay');
  const created=page.waitForResponse(r=>new URL(r.url()).pathname==='/patients/bookings'&&r.request().method()==='POST'&&r.ok());
  await page.getByRole('button',{name:'Confirm appointment'}).click();
  const raw=await (await created).json(),booking=raw.data||raw;
  await expect(page.getByRole('heading',{name:'Your appointment is confirmed!'})).toBeVisible();
  await shot(page,'06-confirmation');
  await page.getByRole('link',{name:'View booking details'}).click();
  await expect(page.getByText(booking.booking_number,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Cancel appointment',exact:true}).click();
  await page.getByLabel('Reason for cancelling').fill('DOC-QA doctor redesign cash walk cleanup');
  await page.getByRole('button',{name:'Yes, cancel appointment'}).click();
  await expect(page.getByRole('status')).toContainText('cancelled',{ignoreCase:true});
});
