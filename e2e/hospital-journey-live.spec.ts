import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
async function loginWithOtp(page:import('@playwright/test').Page,phone:string){
 await page.goto('/auth/login');const toggle=page.getByText('Login with OTP instead');if(await toggle.isVisible())await toggle.click();
 await page.getByPlaceholder('Enter mobile number or email').fill(phone);
 const sent=page.waitForResponse(r=>r.url().includes('/auth/send-otp')&&r.request().method()==='POST');await page.getByRole('button',{name:'Send OTP',exact:true}).click();const body=await(await sent).json();await page.getByPlaceholder('Enter code').fill(body.dev_otp||body.otp);await page.getByRole('button',{name:'Verify & Enter Dashboard'}).click();const cont=page.getByRole('button',{name:'Continue to Dashboard'});await Promise.race([cont.waitFor({state:'visible'}),page.waitForURL(/dashboard/)]);if(await cont.isVisible())await cont.click();await expect(page).toHaveURL(/dashboard/);
}
test.describe.configure({mode:'serial'});
test.use({actionTimeout:15000,trace:'retain-on-failure'});
const out='artifacts/hospital-journey';
const reason='Orthopaedic consultation for knee pain; hospital journey verification';
async function capture(page:import('@playwright/test').Page,name:string,width:number){
 await page.setViewportSize({width,height:950});
 if(width===390)await expect.poll(()=>page.locator('.patient-sidebar').evaluate(e=>e.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 const style=await page.addStyleTag({content:'.patient-app-layout,.patient-content{height:auto!important;min-height:100vh!important;overflow:visible!important}.patient-content>main{overflow:visible!important;flex:none!important}'});
 await page.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true,animations:'disabled'});await style.evaluate(e=>e.remove());
}
test('Sunrise real Orthopaedics family report booking reaches hospital',async({page,request,browser})=>{
 test.setTimeout(300000);mkdirSync(out,{recursive:true});
 const login=await request.post('http://localhost:3000/patient/auth/login',{data:{phone:'8866314762',password:'Vizito@2026'}});expect(login.ok()).toBeTruthy();const auth=await login.json();
 await page.goto('/auth/login');await page.evaluate(a=>{localStorage.setItem('vizito_token',a.access_token);localStorage.setItem('vizito_user',JSON.stringify({token:a.access_token,fullName:a.full_name,patient_id:a.patient_id,role:'patient'}));sessionStorage.setItem('vizito_search_area',JSON.stringify({lat:17.4622,lng:78.3568,label:'Kondapur, Hyderabad',source:'manual',at:Date.now()}));},auth);
 const snap=async(name:string)=>{for(const width of [1280,390])await capture(page,name,width);await page.setViewportSize({width:1280,height:950});};
 await page.goto('/find-hospitals');await page.getByRole('textbox',{name:'Search hospitals'}).fill('Sunrise');await expect(page.locator('.hj-card')).toHaveCount(1);await snap('01-find');
 await page.getByRole('button',{name:'View details',exact:true}).click();await expect(page.locator('.hj-profile-head h1')).toContainText('Sunrise');await expect(page.locator('.hj-verified')).toHaveCount(0);await expect(page.getByText(/NABH certificate H-/)).toBeVisible();
 for(const [i,tab] of ['Overview','Departments & Doctors','Facilities','Location & Timings','Reviews'].entries()){await page.getByRole('button',{name:tab,exact:true}).click();await snap(`02-profile-${i}`);}
 await page.locator('.hj-profile-actions').getByRole('button',{name:'Book OPD',exact:true}).click();await page.getByRole('radio',{name:'Orthopaedics',exact:true}).click();await expect(page.getByRole('radio',{name:'Select doctor',exact:true})).toBeVisible();await expect(page.getByText('Checking doctors’ next available slots…')).toHaveCount(0,{timeout:120000});await page.getByRole('radio',{name:'Select doctor',exact:true}).click();await snap('03-department-doctor');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.locator('.hj-slots button').first()).toBeVisible({timeout:30000});await page.locator('.hj-slots button').first().click();await snap('04-date-time');await page.getByRole('button',{name:'Continue',exact:true}).click();
 const patient=page.getByRole('combobox',{name:'Appointment patient'});const options=await patient.locator('option').allTextContents();const ramesh=options.find(o=>/Ramesh/i.test(o));expect(ramesh).toBeTruthy();await patient.selectOption({label:ramesh!});await page.getByRole('textbox',{name:'Reason for visit'}).fill(reason);
 const pdf=Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
 await page.getByLabel('Upload appointment report').setInputFiles({name:'hospital-journey-report.pdf',mimeType:'application/pdf',buffer:pdf});await expect(page.getByText('Attached: hospital-journey-report.pdf')).toBeVisible();await snap('05-patient-report');await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByRole('radio',{name:'Pay at hospital',exact:true})).toBeChecked();await snap('06-review');
 const createdPromise=page.waitForResponse(r=>r.url().endsWith('/patients/bookings')&&r.request().method()==='POST');await page.getByRole('button',{name:'Confirm appointment',exact:true}).click();const created=await createdPromise;const raw=await created.json();expect(created.ok(),JSON.stringify(raw)).toBeTruthy();const booking=raw.data||raw;await expect(page.getByRole('heading',{name:'Appointment booked!'})).toBeVisible();await snap('07-confirmation');
 await page.getByRole('link',{name:'View in my bookings'}).click();await expect(page.getByText(booking.booking_number,{exact:false}).first()).toBeVisible({timeout:30000});for(const width of [1280,390]){await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`${out}/08-bookings-${width}.png`,fullPage:true,animations:'disabled'});}
 const context=await browser.newContext({baseURL:'http://localhost:5173',viewport:{width:1280,height:950}});const hospital=await context.newPage();await loginWithOtp(hospital,'9100000103');
 writeFileSync(`${out}/booking.json`,JSON.stringify({id:booking.id,number:booking.booking_number,date:booking.booking_date,reason},null,2));
 await hospital.goto('http://localhost:5173/appointments');await hospital.screenshot({path:`${out}/09-hospital-initial.png`,fullPage:true,animations:'disabled'});
 console.log('BOOKING',booking.booking_number,booking.id);console.log('HOSPITAL_URL',hospital.url());
 await context.close();
});


test('hospital opens existing family appointment reason and uploaded report',async({browser})=>{
 const {readFileSync}=await import('node:fs');const booking=JSON.parse(readFileSync(`${out}/booking.json`,'utf8'));
 const context=await browser.newContext({baseURL:'http://localhost:5173',viewport:{width:1280,height:950}});const hospital=await context.newPage();await loginWithOtp(hospital,'9100000103');await hospital.goto('/appointments');await hospital.getByRole('button',{name:'Date: Today',exact:true}).click();await hospital.getByRole('listbox',{name:'Filter by date'}).getByRole('button',{name:'All',exact:true}).click();
 await hospital.getByPlaceholder('Search by patient name, mobile, booking ID or token number...').fill(booking.number);
 await expect(hospital.getByRole('button',{name:'More actions for Ramesh Reddy',exact:true})).toHaveCount(1);await hospital.getByRole('button',{name:'More actions for Ramesh Reddy',exact:true}).click();await hospital.getByText('Visit details',{exact:true}).click();
 await expect(hospital.getByRole('heading',{name:'Appointment Details',exact:true})).toBeVisible();await expect(hospital.getByText(booking.reason,{exact:false}).first()).toBeVisible();
 await hospital.screenshot({path:`${out}/09-hospital-reason-1280.png`,fullPage:true,animations:'disabled'});await hospital.getByRole('button',{name:'Documents',exact:true}).click();
 await expect(hospital.getByText('hospital-journey-report.pdf',{exact:true})).toBeVisible();await hospital.screenshot({path:`${out}/10-hospital-report-1280.png`,fullPage:true,animations:'disabled'});
 const download=hospital.waitForEvent('download');await hospital.getByRole('button',{name:'Download hospital-journey-report.pdf',exact:true}).click();const file=await download;expect(await file.failure()).toBeNull();
 await hospital.setViewportSize({width:390,height:950});await hospital.screenshot({path:`${out}/10-hospital-report-390.png`,fullPage:true,animations:'disabled'});await context.close();
});

test('hospital states and real no-slot day at desktop and mobile',async({page,request})=>{
 const login=await(await request.post('http://localhost:3000/patient/auth/login',{data:{phone:'8866314762',password:'Vizito@2026'}})).json();await page.goto('/auth/login');await page.evaluate(a=>{localStorage.setItem('vizito_token',a.access_token);localStorage.setItem('vizito_user',JSON.stringify({token:a.access_token,role:'patient',fullName:a.full_name}));},login);
 const snap=async(name:string)=>{for(const width of [1280,390])await capture(page,name,width);await page.setViewportSize({width:1280,height:950});};
 let mode='loading';let release:()=>void=()=>{};const gate=new Promise<void>(r=>release=r);
 await page.route('**/patients/providers?*',async route=>{if(mode==='loading')await gate;if(mode==='error')await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Hospital service temporarily unavailable'})});else if(mode==='empty')await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[]})});else await route.continue();});
 await page.goto('/find-hospitals');await expect(page.getByText('Loading hospitals…',{exact:true})).toBeVisible();await snap('11-loading');mode='error';release();await expect(page.getByRole('heading',{name:'Something went wrong'})).toBeVisible();await snap('12-error');mode='empty';await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByRole('heading',{name:'No hospitals found in this area'})).toBeVisible();await snap('13-empty');
 await page.unroute('**/patients/providers?*');await page.goto('/find-hospitals?provider=41cca3c8-05c8-47e9-8166-26200dd02f62&book=1');await page.getByRole('radio',{name:'Orthopaedics',exact:true}).click();await expect(page.getByText('Checking doctors’ next available slots…')).toHaveCount(0,{timeout:120000});await page.getByRole('radio',{name:'Select doctor',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Appointment date',{exact:true}).fill('2026-12-31');await expect(page.getByRole('heading',{name:'No slots available on selected day'})).toBeVisible();await snap('14-no-slots');
});
