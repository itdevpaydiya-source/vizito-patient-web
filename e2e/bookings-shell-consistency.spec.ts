import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createSixBookingFixtures} from './helpers/sixBookingFixtures';
import {loginAsTestPatient} from './helpers/testAccount';
import {initialsOf} from '../src/presentation/modules/bookings/ProviderImage';
const out='artifacts/bookings-shell-fix';
test.setTimeout(240000);
async function metrics(page:Page){return page.evaluate(()=>{
 const sidebar=document.querySelector('aside[aria-label="Main navigation"]')!,header=document.querySelector('header')!,main=document.querySelector('main')!;
 const style=(el:Element)=>{const s=getComputedStyle(el);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,padding:s.padding,gap:s.gap};};
 return {sidebarWidth:sidebar.getBoundingClientRect().width,headerHeight:header.getBoundingClientRect().height,header:style(header),main:style(main),links:[...sidebar.querySelectorAll('nav a')].map(a=>({href:a.getAttribute('href'),text:a.querySelector('span')?.textContent,style:style(a),height:a.getBoundingClientRect().height})),title:style(main.querySelector('h1')!)};
 });}
test('same live shell and typography across dashboard, home care, bookings, labs and details',async({page,request})=>{
 await mkdir(out,{recursive:true});const f=await createSixBookingFixtures(request);await loginAsTestPatient(page,f.patient);const rentals=await f.get('/rental/patient/orders/mine');const rentalName=rentals.find((o:any)=>o.id===f.rental.id).provider.name;expect(rentalName).toBeTruthy();const evidence:any[]=[];
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:1000});await page.goto('/dashboard');await expect(page.locator('main h1:visible').first()).toBeVisible();
  let baseline:any;let homeTitle:any;
  async function capture(name:string){await expect(page.locator('main h1:visible').first()).toBeVisible();await expect.poll(()=>page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);const current=await metrics(page);const {title,...shell}=current;if(!baseline)baseline=shell;else expect(shell).toEqual(baseline);if(name==='home-care')homeTitle=title;if(['bookings','lab-bookings','lab-details'].includes(name)){expect(title.size).toBe(homeTitle.size);expect(title.font).toBe(homeTitle.font);expect(title.weight).toBe(homeTitle.weight);expect(title.line).toBe(homeTitle.line);}evidence.push({width,name,...current});await page.locator('main').evaluate(el=>el.scrollTop=0);await page.screenshot({path:`${out}/${name}-${width}.png`});if(width===390&&name!=='doctor-details'){await page.getByRole('button',{name:'Open navigation',exact:true}).click();await expect.poll(()=>page.getByRole('complementary',{name:'Main navigation'}).evaluate(el=>el.getBoundingClientRect().left)).toBe(0);await page.screenshot({path:`${out}/${name}-navigation-${width}.png`});await page.getByRole('button',{name:'Close navigation',exact:true}).click();await expect.poll(()=>page.getByRole('complementary',{name:'Main navigation'}).evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);}}
  async function nav(href:string){if(width===390)await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('complementary',{name:'Main navigation'}).locator(`a[href="${href}"]`).click();await expect(page).toHaveURL(new RegExp(href+'$'));}
  await capture('dashboard');await nav('/home-care');await capture('home-care');await nav('/bookings');await expect(page.locator('[data-service="Equipment"] .service-next')).toBeVisible({timeout:70000});
  const equipment=page.locator('[data-service="Equipment"] .provider-image');await expect(equipment.locator('img')).toHaveCount(0);await expect(equipment.locator('.provider-generated svg')).toBeVisible();await expect(equipment.locator('b')).toHaveText(initialsOf(rentalName));await page.locator('[data-service="Equipment"]').screenshot({path:`${out}/equipment-card-${width}.png`});
  await expect(page.locator('.service-next p').first()).toHaveCSS('font-size','14px');await expect(page.locator('.booking-service-card h2').first()).toHaveCSS('font-size','16px');await capture('bookings');
  await nav('/bookings');await page.getByRole('link',{name:'Lab bookings',exact:true}).click();await expect(page.locator('.lab-order-card')).toBeVisible({timeout:70000});await capture('lab-bookings');await page.locator(`[data-lab-order-id="${f.fixture.labOrder.id}"]`).getByRole('button',{name:'View details',exact:true}).click();await expect(page.getByRole('heading',{name:'Payment details',exact:true})).toBeVisible();await capture('lab-details');
  await page.goto(`/my-consultations?open=${encodeURIComponent(f.fixture.booking.id)}`);const doctor=page.getByRole('dialog',{name:'Booking details',exact:true});await expect(doctor.locator('.bk-provider-block')).toBeVisible({timeout:70000});await expect(doctor.locator('.bk-panel-header h2')).toHaveCSS('font-size',width===390?'24px':'30px');await capture('doctor-details');
 }
 await writeFile(`${out}/metrics.json`,JSON.stringify(evidence,null,2));
});
