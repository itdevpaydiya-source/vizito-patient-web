import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBookingsFixture} from './helpers/bookingScreenFixtures';
import {loginAsTestPatient} from './helpers/testAccount';
test.setTimeout(240000);
test('doctor and lab action dialogs fit desktop and mobile with real bookings',async({page,request})=>{
 const f=await createBookingsFixture(request);await loginAsTestPatient(page,f.patient);
 const out='artifacts/booking-dialogs';await mkdir(out,{recursive:true});
 const care=await f.get(`/home-care/orders/${f.careOrder.id}`);
 await writeFile(`${out}/homecare-api-audit.json`,JSON.stringify({keys:Object.keys(care),visitKeys:Object.keys(care.visits[0]||{}),professionalKeys:Object.keys(care.visits[0]?.professional||{}),events:care.events,payments:care.payments,timeline:care.timeline},null,2));
 for(const width of [1280,390])for(const type of ['doctor','lab']){
  await page.setViewportSize({width,height:900});
  await page.goto(type==='doctor'?`/my-consultations?type=Doctor&open=${f.booking.id}`:`/lab-bookings?open=${f.labOrder.id}`);
  for(const action of ['reschedule','cancel']){
   await page.getByRole('button',{name:action==='reschedule'?(type==='doctor'?'Reschedule appointment':'Reschedule'):type==='doctor'?'Cancel appointment':'Cancel booking',exact:true}).click();
   const dialog=page.getByRole('dialog',{name:`${action==='reschedule'?'Reschedule':'Cancel'} ${type==='doctor'?'doctor appointment':'lab booking'}`,exact:true});
   await expect(dialog).toBeVisible();
   await expect(dialog).toHaveCSS('padding-top','24px');await expect(dialog).toHaveCSS('padding-left','24px');
   await expect.poll(()=>dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   await dialog.evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>undefined))));
   const rect=await dialog.boundingBox();expect(rect!.width).toBe(width===390?390:480);
   if(width===390)expect(Math.round(rect!.y+rect!.height)).toBe(900);
   if(action==='cancel'){
    const input=dialog.getByRole('textbox',{name:'Reason for cancelling'});await input.fill('Checking retained input');
    const r=await input.boundingBox();expect(r!.x).toBeGreaterThanOrEqual(rect!.x+24);expect(r!.x+r!.width).toBeLessThanOrEqual(rect!.x+rect!.width-24);
   }else { await expect(dialog.getByText('Choose a new time',{exact:true})).toBeVisible(); if(type==='lab')await expect(dialog.getByRole('group',{name:'Visit time',exact:true})).toBeVisible({timeout:60000}); else {await dialog.getByRole('radio').filter({hasText:new Date(`${f.doctorDate}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}).first().click();await expect(dialog.getByRole('radiogroup',{name:'Time',exact:true})).toBeVisible({timeout:60000});}}
   await page.screenshot({path:`${out}/${type}-${action}-${width}.png`});
   await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  }
 }
});
