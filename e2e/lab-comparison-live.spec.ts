import {test,expect} from '@playwright/test';
import {createTestPatient,loginAsTestPatient} from './helpers/testAccount';
test('live Step 2 desktop and phone evidence',async({page,request})=>{
 const patient=await createTestPatient(request);
 const response=await request.get('http://localhost:3000/lab-tests/labs?tests=FBS',{headers:{Authorization:`Bearer ${patient.token}`}});
 expect(response.ok()).toBe(true);const labs=await response.json();expect(labs.length).toBeGreaterThan(0);
 await loginAsTestPatient(page,patient);await page.goto('/lab-tests?step=2&tests=FBS');
 await expect(page.getByRole('radio',{name:`Select ${labs[0].name}`,exact:true})).toBeVisible();await page.getByRole('radio',{name:`Select ${labs[0].name}`,exact:true}).check();
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'artifacts/lab-booking/step2-live-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
 expect(await page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await expect(page.getByRole('region',{name:'Chosen lab actions'}).getByRole('button')).toBeInViewport();
 await page.locator('main').evaluate(el=>{el.style.scrollBehavior='auto';el.scrollTop=600;});await page.waitForTimeout(400);await page.screenshot({path:'artifacts/lab-booking/step2-live-390.png'});
});
