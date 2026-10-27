import {test,expect} from '@playwright/test';
// Isolated contract-shaped fixtures; these are not production catalogue or confirmation data.
const testDef={id:1,code:'CBC',name:'API test',department:'Blood',specimen_type:'Blood',fasting_hours:0,tat_hours:12};
const lab={id:'lab1',name:'API lab',locations:[{id:1,name:'API centre',address:'API street',city:'Hyderabad',pincode:'500081'}],tests_offered:1,selected:[{code:'CBC',name:'API test',price:250}],total:250,settings:{centre_hours:{'1':Array.from({length:7},()=>({open:'09:00',close:'17:00'}))},home:{enabled:false}}};
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+86400000));
const availability={timezone:'Asia/Kolkata',visit_type:'LAB_VISIT',location_id:1,capacity:3,bookable:true,slot_minutes:30,lead_minutes:15,max_days:60,days:[{date:day,weekday:1,open:true,slots:[{time:'09:00',available:true,left:2},{time:'09:30',available:false,left:0},{time:'13:00',available:true,left:null},{time:'17:00',available:true,left:3}]}]};
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('vizito_token','ui-session');localStorage.setItem('vizito_user',JSON.stringify({fullName:'UI patient',role:'patient',token:'ui-session'}));});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.port!=='3000')return r.continue();return r.fulfill({json:u.pathname==='/lab-tests'?[testDef]:u.pathname==='/lab-tests/labs'?[lab]:u.pathname==='/lab-orders/availability'?availability:[]});});
 await page.goto('/lab-tests');
});
async function chooseLab(page:import('@playwright/test').Page){
 await page.getByRole('region',{name:'Choose tests'}).getByRole('checkbox').check();
 await page.getByRole('button',{name:'Continue to select centre'}).click();
 await page.getByRole('region',{name:'Choose a lab',exact:true}).getByRole('radio',{name:'Select API lab',exact:true}).check();
 await page.getByRole('button',{name:'Continue to date and time'}).click();
}
test('four steps preserve selections and submit the existing booking contract once',async({page})=>{
 await chooseLab(page);
 await expect(page.getByRole('region',{name:'Choose tests'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Continue to review & confirm'})).toBeDisabled();
 await page.getByRole('group',{name:'Visit time',exact:true}).getByRole('button').first().click();
 await page.getByRole('button',{name:'Continue to review & confirm'}).click();
 await expect(page.getByLabel('Booking review')).toContainText('API test');
 await expect(page.getByLabel('Booking review')).toContainText('250');
 await expect(page.getByRole('region',{name:'Centre and time'})).toHaveCount(0);
 await page.getByRole('button',{name:'Back to previous step'}).click();
 await expect(page.getByRole('group',{name:'Visit time',exact:true}).getByRole('button').first()).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Back to previous step'}).click();
 await expect(page.getByRole('region',{name:'Choose a lab',exact:true}).getByRole('radio',{name:'Select API lab',exact:true})).toBeChecked();
 await page.getByRole('button',{name:'Back to previous step'}).click();
 await expect(page.getByRole('region',{name:'Choose tests'}).getByRole('checkbox')).toBeChecked();
 await page.getByRole('button',{name:'Continue to select centre'}).click();
 await page.getByRole('button',{name:'Continue to date and time'}).click();
 await page.getByRole('button',{name:'Continue to review & confirm'}).click();
 await page.getByRole('radio',{name:'Pay at the centre',exact:true}).click();
 let submissions=0;
 await page.route('**/lab-orders',async r=>{
  submissions++;const body=r.request().postDataJSON();expect(body.lab_partner_id).toBe('lab1');expect(body.test_codes).toEqual(['CBC']);expect(body.payment_mode).toBe('CASH');expect(body.location_id).toBe(1);
  await r.fulfill({status:400,json:{message:'Appointment no longer available'}});
 });
 await page.getByRole('button',{name:'Book visit',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Appointment no longer available');expect(submissions).toBe(1);
 let createdOrder:any;await page.route('**/lab-orders/created-order',r=>r.fulfill({json:createdOrder}));
 await page.route('**/lab-orders',async r=>{submissions++;const b=r.request().postDataJSON();createdOrder={id:'created-order',order_number:'API-confirmation',lab_name:'API lab',location_name:'API centre',visit_date:b.visit_date,visit_time:b.visit_time,total_amount:250,payment_status:'PENDING',payment_mode:'CASH',status:'BOOKED',items:[{test_code:'CBC',test_name:'API test',price:250}],fasting_hours:0,visit_type:'LAB_VISIT',specimens:[]};await r.fulfill({json:createdOrder});});
 await page.getByRole('button',{name:'Book visit',exact:true}).click();
 await expect(page).toHaveURL(/lab-tests\/booked\/created-order/);await expect(page.getByRole('link',{name:'View booking details',exact:true})).toBeVisible();
 await expect(page.getByText('API-confirmation',{exact:false})).toBeVisible();expect(submissions).toBe(2);
});
test('empty API availability cannot create invented appointment slots',async({page})=>{
 await page.route('**/lab-orders/availability?**',r=>r.fulfill({json:{...availability,days:[]}}));
 await chooseLab(page);
 await expect(page.getByRole('group',{name:'Visit time',exact:true})).toHaveCount(0);
 await expect(page.getByText('No times in the next 60 days')).toBeVisible();
 await expect(page.getByRole('button',{name:'Continue to review & confirm'})).toBeDisabled();
});

test('mobile step layouts render only the current main section',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await chooseLab(page);
 await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
 expect(await page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.locator('main').evaluate(el=>{el.style.scrollBehavior='auto';el.scrollTop=0;});
 await page.screenshot({path:'artifacts/lab-booking/step3-mobile.png'});
 await page.getByRole('group',{name:'Visit time',exact:true}).getByRole('button').first().click();
 await page.getByRole('button',{name:'Continue to review & confirm'}).click();
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('main').evaluate(el=>{el.style.scrollBehavior='auto';el.scrollTop=0;});
 await page.screenshot({path:'artifacts/lab-booking/step4-desktop.png'});
});

test('UPI validation and in-flight submission guard retain review context',async({page})=>{
 await chooseLab(page);await page.getByRole('group',{name:'Visit time',exact:true}).getByRole('button').first().click();await page.getByRole('button',{name:'Continue to review & confirm'}).click();
 await expect(page.getByRole('button',{name:/Pay .* and confirm booking/})).toBeDisabled();await expect(page.getByRole('status')).toContainText('Enter a valid UPI ID');
 await page.getByRole('textbox',{name:'UPI ID'}).fill('patient@upi');
 let calls=0;let release!:()=>void;const hold=new Promise<void>(resolve=>release=resolve);
 await page.route('**/lab-orders',async r=>{calls++;await hold;await r.fulfill({status:400,json:{message:'Payment unavailable'}});});
 await page.getByRole('button',{name:/Pay .* and confirm booking/}).click();await expect(page.getByRole('button',{name:/Booking/})).toBeDisabled();expect(calls).toBe(1);
 release();await expect(page.getByRole('alert')).toContainText('Payment unavailable');await expect(page.getByLabel('Booking review')).toBeVisible();
});

test('restores URL slot, drops full slots and refreshes availability after a booking conflict',async({page})=>{
 await page.goto(`/lab-tests?step=3&tests=CBC&lab=lab1&date=${day}&time=09:00&visit=LAB_VISIT`);
 const times=page.getByRole('group',{name:'Visit time',exact:true});await expect(times).toBeVisible({timeout:20000});await expect(times.getByRole('button',{name:'9:00 AM 2 left'})).toHaveAttribute('aria-pressed','true');
 await page.reload();await expect(times.getByRole('button',{name:'9:00 AM 2 left'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Continue to review & confirm'}).click();await page.getByRole('radio',{name:'Pay at the centre',exact:true}).click();
 let refreshed=0;
 await page.route('**/lab-orders/availability?**',r=>{refreshed++;return r.fulfill({json:{...availability,days:[{...availability.days[0],slots:availability.days[0].slots.map(s=>s.time==='09:00'?{...s,available:false,left:0}:s)}]}});});
 await page.route('**/lab-orders',r=>r.fulfill({status:409,json:{message:'This time is now full. Choose another time.'}}));
 await page.getByRole('button',{name:'Book visit',exact:true}).click();await expect(page).toHaveURL(/step=3/);await expect(page).not.toHaveURL(/time=/);await expect(page).toHaveURL(new RegExp(`date=${day}`));
 await expect(page.getByRole('alert')).toContainText('This time is now full');await expect(times.getByRole('button',{name:'9:00 AM Full'})).toBeDisabled();expect(refreshed).toBeGreaterThan(0);
 await times.getByRole('button',{name:'1:00 PM'}).click();await expect(page.getByRole('alert')).toHaveCount(0);
});
test('availability errors retry and home PIN uses the real endpoint parameters',async({page})=>{
 await page.route('**/lab-tests/labs?**',r=>r.fulfill({json:[{...lab,settings:{...lab.settings,home:{enabled:true,fee:100,pincodes:['500081']}}}]}));
 await page.route('**/lab-orders/availability?**',r=>r.fulfill({status:500,json:{message:'Availability unavailable'}}));await chooseLab(page);
 await expect(page.getByRole('alert')).toContainText('Availability unavailable');
 await page.route('**/lab-orders/availability?**',r=>{const url=new URL(r.request().url());return r.fulfill({json:url.searchParams.get('visit_type')==='HOME'?{...availability,visit_type:'HOME',bookable:false,reason:'This PIN is not served',days:[]}:availability});});
 await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByRole('group',{name:'Visit time'})).toBeVisible();
 await page.getByRole('tab',{name:/Home collection/}).click();await expect(page.getByText('Enter a 6-digit PIN to check home collection.').first()).toBeVisible();
 const response=page.waitForRequest(r=>r.url().includes('/lab-orders/availability')&&r.url().includes('pincode=500072'));await page.getByRole('textbox',{name:'Pincode',exact:true}).fill('500072');await response;
 await expect(page.getByText('This PIN is not served')).toBeVisible();await page.getByRole('button',{name:'Visit centre instead'}).click();await expect(page.getByRole('tab',{name:'Visit centre',exact:true})).toHaveAttribute('aria-selected','true');
});

test('home collection uses saved addresses and restores the chosen address and time on refresh',async({page})=>{
 const saved=[{addressId:'one',addressLine1:'First saved street',city:'Hyderabad',pincode:'500081',isDefault:true},{addressId:'two',addressLine1:'Second saved street',city:'Hyderabad',pincode:'500072',isDefault:false}];
 await page.route('**/patients/me',r=>r.fulfill({json:{data:{addresses:saved}}}));
 await page.route('**/lab-tests/labs?**',r=>r.fulfill({json:[{...lab,settings:{...lab.settings,home:{enabled:true,fee:100,pincodes:['500081','500072']}}}]}));
 await page.route('**/lab-orders/availability?**',r=>r.fulfill({json:{...availability,visit_type:new URL(r.request().url()).searchParams.get('visit_type')}}));
 await chooseLab(page);await page.getByRole('tab',{name:/Home collection/}).click();await expect(page.getByRole('textbox',{name:'Pincode',exact:true})).toHaveValue('500081');
 await page.getByRole('combobox',{name:'Saved collection address'}).selectOption('two');await expect(page.getByRole('textbox',{name:'House / flat and street'})).toHaveValue('Second saved street');await expect(page).toHaveURL(/address=two/);
 await page.getByRole('group',{name:'Visit time',exact:true}).getByRole('button',{name:'9:00 AM 2 left'}).click();await expect(page).toHaveURL(/address=two/);await page.reload();
 await expect(page.getByRole('textbox',{name:'Pincode',exact:true})).toHaveValue('500072');await expect(page.getByRole('textbox',{name:'House / flat and street'})).toHaveValue('Second saved street');await expect(page.getByRole('group',{name:'Visit time',exact:true}).getByRole('button',{name:'9:00 AM 2 left'})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Continue to review & confirm'})).toBeEnabled();
 await page.getByRole('tab',{name:/Home collection/}).focus();await page.keyboard.press('ArrowLeft');await expect(page.getByRole('tab',{name:'Visit centre',exact:true})).toHaveAttribute('aria-selected','true');
});

test('review keeps doctor-ordered tests and submits the chosen family member',async({page})=>{
 await page.route('**/patients/me',r=>r.fulfill({json:{data:{userId:11,fullName:'API account patient',phone:'9876500001',email:'patient@example.test'}}}));
 await page.route('**/users/11/family-members',r=>r.fulfill({json:[{id:'association-22',relationship:'Father',family_member:{id:22,full_name:'API family patient',gender:'Male',date_of_birth:'1980-01-01',phone:'9876500002'}}]}));
 await page.route('**/lab-orders/rx/rx1',r=>r.fulfill({json:{prescription_id:'rx1',doctor_name:'API doctor',prescribed_on:'2026-10-01',tests:[{code:'CBC',name:'API test'}],family_member_id:'22',patient_name:'API family patient'}}));
 await page.goto('/lab-tests?tests=CBC&step=3&lab=lab1&rx=rx1');
 await page.getByRole('group',{name:'Visit time',exact:true}).getByRole('button',{name:'9:00 AM 2 left'}).click();await page.getByRole('button',{name:'Continue to review & confirm'}).click();
 const patient=page.getByRole('region',{name:'Patient details'});await expect(patient).toContainText('API family patient');await expect(patient.getByRole('combobox')).toHaveValue('22');await page.getByRole('button',{name:'Edit patient',exact:true}).click();await expect(patient.getByRole('combobox')).toBeFocused();
 await page.getByRole('radio',{name:'Pay at the centre',exact:true}).check();let body:any;
 await page.route('**/lab-orders',r=>{body=r.request().postDataJSON();return r.fulfill({status:400,json:{message:'Submission rejected by API'}});});await page.getByRole('button',{name:'Book visit',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Submission rejected by API');expect(body).toMatchObject({prescription_id:'rx1',family_member_id:'22',test_codes:['CBC']});
 await page.getByRole('button',{name:'Edit appointment',exact:true}).click();await expect(page.getByRole('group',{name:'Visit time',exact:true}).getByRole('button',{name:'9:00 AM 2 left'})).toHaveAttribute('aria-pressed','true');
});

test('review preserves home-care lab request context and patient',async({page})=>{
 await page.route('**/patients/me',r=>r.fulfill({json:{data:{userId:11,patientProfileId:'owner-profile',fullName:'API account patient'}}}));
 await page.route('**/lab-tests/labs?**',r=>r.fulfill({json:[{...lab,settings:{...lab.settings,home:{enabled:true,fee:100,pincodes:['500081']}}}]}));
 await page.route('**/home-care/orders/care1',r=>r.fulfill({json:{id:'care1',patient_profile_id:'care-profile',patient_name:'API care patient',address:'API care street',pincode:'500081',agency_name:'API agency',care:{lab_requests:[{id:'hc1',status:'OPEN',tests:[{code:'CBC',name:'API test'}],reason:'API care reason',requested_by:'API nurse'}]}}}));
 await page.goto('/lab-tests?tests=CBC&step=3&lab=lab1&hc=hc1&order=care1');
 await expect(page.getByRole('tab',{name:/Home collection/})).toBeVisible({timeout:20000});await expect(page.getByRole('tab',{name:/Home collection/})).toHaveAttribute('aria-selected','true');await page.getByRole('textbox',{name:'City',exact:true}).fill('Hyderabad');await page.getByRole('group',{name:'Visit time',exact:true}).getByRole('button',{name:'9:00 AM 2 left'}).click();await page.getByRole('button',{name:'Continue to review & confirm'}).click();await expect(page.getByRole('region',{name:'Patient details'})).toContainText('API care patient');await page.getByRole('radio',{name:'Pay the collector',exact:true}).check();
 let body:any;await page.route('**/lab-orders',r=>{body=r.request().postDataJSON();return r.fulfill({status:400,json:{message:'Home care API error'}});});await page.getByRole('button',{name:'Book home collection',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Home care API error');expect(body).toMatchObject({hc_lab_request_id:'hc1',visit_type:'HOME',home_address:{line:'API care street',pincode:'500081'}});
});
