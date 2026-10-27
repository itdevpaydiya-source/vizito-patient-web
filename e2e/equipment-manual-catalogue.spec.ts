import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {registerProviderAccount,lettersFor} from './helpers/providerAccount';
import {activatePartner} from './helpers/testDoctor';

// Explicit opt-in: these local fixtures remain visible for the user's manual testing.
test('prepare available equipment for manual testing',async({request})=>{
 test.skip(process.env.PREPARE_MANUAL_EQUIPMENT!=='1','Manual setup only');
 const api='http://localhost:3000',unique=Date.now();
 const account=await registerProviderAccount(request,api,{full_name:`Manual Rental Owner ${lettersFor(unique)}`,phone:`8${String(unique).slice(-9)}`,email:`manual-rental-${unique}@vizito.test`,date_of_birth:'1980-02-02',gender:'female',provider_type_id:10,provider_type:'equipment',password:'PlaywrightTest123!',organizationName:'Local Test Equipment — Manual Testing',authorizedPersonName:'Manual Rental Owner'});
 const partner=account.current_account.partner_id,headers={Authorization:`Bearer ${account.access_token}`};await activatePartner(partner);
 const authDb=await import('../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise.js');const authConn=await authDb.createConnection({host:'localhost',port:3306,user:'root',password:'root',database:'vizito_auth'});try{await authConn.execute("UPDATE partners SET verification_status='Auto-approved' WHERE id=?",[partner]);}finally{await authConn.end();}
 const products=[];
 for(const item of [{name:'TEST — Oxygen concentrator',category:'OXYGEN',daily_rental_price:150,deposit_amount:1000},{name:'TEST — Wheelchair',category:'MOBILITY',daily_rental_price:75,deposit_amount:500},{name:'TEST — Hospital bed',category:'BED',daily_rental_price:200,deposit_amount:1500},{name:'TEST — Patient monitor',category:'MONITOR',daily_rental_price:100,deposit_amount:750}]){
  const r=await request.post(`${api}/rental/partner/products`,{headers,data:{...item,min_rental_days:1,max_rental_days:30,stock_quantity:20,delivery_options:['doorstep'],submit_for_approval:true}});expect(r.ok(),await r.text()).toBe(true);const b=await r.json();products.push(b.data??b);
 }
 const mysql=await import('../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise.js');const db=await mysql.createConnection({host:'localhost',port:3306,user:'root',password:'root',database:'vizito_catalogue'});
 try{for(const p of products)await db.execute("UPDATE rental_products SET status='APPROVED' WHERE id=? AND provider_id=?",[p.id,partner]);}finally{await db.end();}
 for(const p of products){const r=await request.get(`${api}/rental/patient/products/${p.id}`);expect(r.ok(),await r.text()).toBe(true);const b=await r.json(),item=b.data??b;expect(Number(item.available_quantity)).toBeGreaterThan(0);}
 await mkdir('artifacts/equipment-manual-testing',{recursive:true});await writeFile('artifacts/equipment-manual-testing/catalogue.json',JSON.stringify({provider_id:partner,created_for:'User-requested local manual testing; leave visible',products:products.map(p=>({id:p.id,name:p.name,daily_rental_price:p.daily_rental_price,deposit_amount:p.deposit_amount}))},null,2));
});
