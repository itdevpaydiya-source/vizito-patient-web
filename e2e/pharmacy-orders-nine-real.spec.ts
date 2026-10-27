import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {loginAsTestPatient} from './helpers/testAccount';
// Read-only audit of all existing matching nine-order review datasets. No records are created or changed.
test('all existing nine-order review datasets retain counts, cash labels and mobile layout',async({page,request})=>{
 const env=Object.fromEntries(fs.readFileSync('../vizito-replica-backend/vizito-catalogue/.env','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
 const mysql=await import('../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise.js');
 const db=await mysql.createConnection({host:env.DATABASE_HOST,port:Number(env.DATABASE_PORT)||3306,user:env.DATABASE_USER,password:env.DATABASE_PASSWORD,database:env.DATABASE_NAME});
 const audits:any[]=[];
 try {
  const [candidates]:any=await db.query(`SELECT o.patient_id,COUNT(*) n FROM orders o JOIN vizito_auth.partners p ON p.id=o.pharmacy_partner_id GROUP BY o.patient_id HAVING n=9 AND COUNT(DISTINCT p.business_name)=2 AND SUM(p.business_name IN ('Sri Sai Medicals','Green Cross Pharmacy'))=9`);
  expect(candidates.length,'Existing nine-order review datasets').toBeGreaterThan(0);
  for(const candidate of candidates){
  const [identities]:any=await db.query(`SELECT u.email FROM vizito_auth.patient_profiles p JOIN vizito_auth.users u ON u.id=p.user_id WHERE p.id=?`,[candidate.patient_id]);
  expect(identities[0].email).toMatch(/^pw-patient-.*@vizito\.test$/);
  const response=await request.post('http://localhost:3000/patient/auth/login',{data:{email:identities[0].email,password:'PlaywrightTest123!'}});expect(response.ok()).toBe(true);const auth=await response.json();const token=auth.access_token||auth.token||auth.data?.access_token;expect(token).toBeTruthy();
  const api=await request.get('http://localhost:3000/orders/mine',{headers:{Authorization:`Bearer ${token}`}});expect(api.ok()).toBe(true);const body=await api.json();const rows=Array.isArray(body)?body:body.data;expect(rows).toHaveLength(9);
  audits.push({rows,patient:{fullName:'Playwright Fixture Patient',email:identities[0].email,mobile:'',password:'',patientId:candidate.patient_id,token}});
  }
 }finally{await db.end();}
 for(const [auditIndex,audit] of audits.entries()){
 await loginAsTestPatient(page,audit.patient);await page.waitForLoadState('networkidle');
 await page.emulateMedia({reducedMotion:'reduce'});const [listResponse]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/orders/mine'&&r.request().method()==='GET'),page.goto('/pharmacy-orders')]);expect(listResponse.ok()).toBe(true);const listBody=await listResponse.json();const rows=Array.isArray(listBody)?listBody:listBody.data;expect(rows).toHaveLength(9);
 const groups={active:rows.filter(o=>!['COMPLETED','CANCELLED','FULFILLMENT_FAILED'].includes(o.status)),completed:rows.filter(o=>o.status==='COMPLETED'),cancelled:rows.filter(o=>['CANCELLED','FULFILLMENT_FAILED'].includes(o.status))};
 for(const [group,orders] of Object.entries(groups)){
  await page.getByRole('button',{name:`${group[0].toUpperCase()+group.slice(1)} (${orders.length})`,exact:true}).click();
  for(const order of orders){const card=page.locator('[aria-label="Order cards"] > article').filter({hasText:`#${order.id.slice(0,8).toUpperCase()}`});await expect(card).toHaveCount(1);if(order.payment_method==='CASH'&&order.status!=='COMPLETED'&&!['CANCELLED','FULFILLMENT_FAILED'].includes(order.status)){await expect(card).toContainText(`Pay INR ${Number(order.total_amount).toFixed(2)} at ${order.fulfillment_type==='DELIVERY'?'delivery':'pickup'}`);await expect(card).not.toContainText('Paid via Cash');}if(order.payment_status==='REFUNDED')await expect(card).toContainText(`Refunded INR ${Number(order.total_amount).toFixed(2)}`);if(order.status==='CANCELLED'&&order.payment_status==='PENDING')await expect(card).not.toContainText('Refund');}
  for(const width of [1440,390]){await page.setViewportSize({width,height:900});if(width===1440)await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeGreaterThan(200);if(width===390)await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);expect(await page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:`artifacts/pharmacy-orders/nine-${auditIndex}-${group}-${width}.png`});}
 }
 await test.info().attach(`existing-review-order-ids-${auditIndex}`,{body:JSON.stringify(rows.map(o=>({id:o.id,status:o.status,payment_method:o.payment_method,payment_status:o.payment_status})),null,2),contentType:'application/json'});
 }
});
