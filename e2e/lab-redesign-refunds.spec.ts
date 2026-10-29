import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {loginAsTestPatient} from './helpers/testAccount';
const API='http://localhost:3000',out='artifacts/lab-redesign',numbers=['LAB-20261029-134267','LAB-20261029-309318','LAB-20261029-203569'];
test('cancel the two captured paid LAB-QA bookings and show refunds',async({page,request})=>{
 test.setTimeout(180000);await mkdir(out,{recursive:true});
 const auth=await(await request.post(API+'/patient/auth/login',{data:{phone:'8866314762',password:'Vizito@2026'}})).json(),token=auth.access_token||auth.token||auth.data?.access_token,headers={Authorization:`Bearer ${token}`};
 await loginAsTestPatient(page,{fullName:'Kavya Reddy',mobile:'8866314762',email:'',password:'',patientId:'',token});
 const raw=await(await request.get(API+'/lab-orders/mine',{headers})).json(),orders=Array.isArray(raw)?raw:raw.data,results=[];
 for(const number of numbers){const order=orders.find((o:any)=>o.order_number===number);expect(order,`${number} should exist`).toBeTruthy();await page.goto(`/lab-bookings?open=${order.id}${order.can_cancel?'&action=cancel':''}`);if(order.can_cancel){await expect(page.getByRole('dialog',{name:'Cancel this booking?'})).toBeVisible();await page.getByLabel('Reason for cancelling').fill('LAB-QA captured payment cleanup and refund');await page.getByRole('button',{name:'Yes, cancel booking'}).click();await expect(page.getByText('Refund of ₹150 started',{exact:false})).toBeVisible({timeout:30000});}await page.screenshot({path:`${out}/refund-${number}.png`,fullPage:true});const detailRaw=await(await request.get(`${API}/lab-orders/${order.id}`,{headers})).json(),detail=detailRaw.data||detailRaw;expect(detail.status).toBe('CANCELLED');results.push({number,id:order.id,status:detail.status,payment_status:detail.payment_status,payments:detail.payments});}
 await writeFile(`${out}/captured-booking-refunds.json`,JSON.stringify(results,null,2));
});
