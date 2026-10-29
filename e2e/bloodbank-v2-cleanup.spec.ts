import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { loginAsTestPatient } from './helpers/testAccount';
const API='http://localhost:3000',OUT='artifacts/bloodbank-v2-live';
async function json(r:any){expect(r.ok(),await r.text()).toBeTruthy();return r.json()}
test('BB-QA cancellation and donor book-cancel cleanup',async({page,request})=>{
 await mkdir(OUT,{recursive:true});
 const auth=await json(await request.post(API+'/patient/auth/login',{data:{phone:'8866314762',password:'Vizito@2026'}}));
 const token=auth.access_token||auth.token||auth.data?.access_token,headers={Authorization:`Bearer ${token}`};
 await loginAsTestPatient(page,{fullName:'Kavya Reddy',mobile:'8866314762',email:'',password:'',patientId:'',token});
 const feed=await json(await request.get(API+'/bloodbank/requests/mine',{headers}));
 const items=Array.isArray(feed)?feed:feed.items;
 const row=items.find((r:any)=>r.status==='SUBMITTED'&&String(r.treating_doctor||'').startsWith('BB-QA'));
 if(row){await page.goto(`/blood-requests?open=${row.id}`);await page.getByRole('button',{name:'Cancel request',exact:true}).click();await page.getByLabel('Reason for cancelling').fill('BB-QA no longer required');await page.getByRole('button',{name:'Yes, cancel'}).click();await expect(page.getByText('Request cancelled',{exact:true})).toBeVisible();await page.screenshot({path:`${OUT}/04-cancelled-desktop.png`,fullPage:true})}
 const sent=await json(await request.post(API+'/auth/send-otp',{data:{phone:'9872078255'}}));
 const pa=await json(await request.post(API+'/auth/verify-otp',{data:{phone:'9872078255',otp:sent.dev_otp||sent.otp}}));
 const selected=pa.requires_account_selection?await json(await request.post(API+'/auth/select-account',{data:{login_token:pa.login_token,partner_id:'6e23ed6a-5539-424c-8ccb-1ddee99bd5d8'}})):pa;
 const session=await json(await request.post(API+'/bloodbank/centre/donors/sessions',{headers:{Authorization:`Bearer ${selected.access_token}`},data:{kind:'CAMP',title:`BB-QA donor camp ${Date.now()}`,organizer:'BB-QA Lifeline team',venue:'BB-QA Lifeline collection desk',starts_at:new Date(Date.now()+2*86400000).toISOString(),ends_at:new Date(Date.now()+2*86400000+3*3600000).toISOString(),capacity:10}}));
 await page.goto('/donate-blood');
 const booking=page.getByRole('region',{name:'Your booking',exact:true});
 if(await booking.isVisible())await booking.getByRole('button',{name:'Cancel booking'}).click();
 const register=page.getByRole('button',{name:'Register now',exact:true});
 if(await register.isVisible()){for(const box of await page.locator('.bb-checklist input').all())await box.check();await page.getByLabel(/I agree to register/).check();await register.click()}
 const donor=await json(await request.get(API+'/bloodbank/donor/me',{headers}));const prior=donor.appointments?.find((a:any)=>a.can_cancel);if(prior)await json(await request.post(`${API}/bloodbank/donor/appointments/${prior.id}/cancel`,{headers}));
 const appointment=await json(await request.post(API+'/bloodbank/donor/appointments',{headers,data:{session_id:session.id}}));await page.reload();
 await expect(booking).toBeVisible();await page.screenshot({path:`${OUT}/05-donor-booked-desktop.png`,fullPage:true});
 await json(await request.post(`${API}/bloodbank/donor/appointments/${appointment.id}/cancel`,{headers}));await page.reload();await expect(booking).toHaveCount(0);
 await page.screenshot({path:`${OUT}/06-donor-cancelled-desktop.png`,fullPage:true});
});
