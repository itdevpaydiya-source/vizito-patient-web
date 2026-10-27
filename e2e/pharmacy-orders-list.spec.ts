import {test,expect} from '@playwright/test';
// Isolated UI fixtures only. Live ordering/refund specs verify the real APIs separately.
const base={pharmacy_partner_id:'p1',fulfillment_type:'PICKUP',payment_method:'CASH',payment_status:'PENDING',total_amount:'25.00',items:[{id:'line',quantity:2,unit_price:'12.50',subtotal:'25',medicine:{medicine_name:'Catalogue medicine'}}]};
const orders=[...Array.from({length:10},(_,i)=>({...base,id:`active-${i}`,status:i===0?'CREATED':'PROCESSING',payment_method:i===0?'UPI':'CASH',created_at:new Date(Date.now()-i*86400000).toISOString()})),{...base,id:'completed',status:'COMPLETED',payment_status:'PAID',created_at:'2024-01-12T10:00:00Z'},{...base,id:'cancelled',status:'CANCELLED',payment_status:'REFUNDED',payment_method:'CARD',created_at:'2024-01-13T10:00:00Z'},{...base,id:'failed',status:'FULFILLMENT_FAILED',payment_status:'REFUND_PENDING',created_at:'2024-01-14T10:00:00Z'}];
test.beforeEach(async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>{localStorage.setItem('vizito_token','ui-session');localStorage.setItem('vizito_user',JSON.stringify({fullName:'UI patient',role:'patient',token:'ui-session'}));});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/orders/mine')return r.fulfill({json:orders});if(u.pathname.includes('/patients/providers'))return r.fulfill({json:{data:[{id:'p1',display_name:'Catalogue pharmacy',partner_type:'PHARMACY'}]}});if(u.port==='3000')return r.fulfill({json:{data:[]}});return r.continue();});
 await page.goto('/pharmacy-orders');await expect(page.getByRole('button',{name:'Active (10)',exact:true})).toBeVisible();
});
const cards=(page:any)=>page.locator('[aria-label="Order cards"] > article');
test('tabs have live counts, load more and status-specific actions',async({page})=>{
 await expect(cards(page)).toHaveCount(8);await expect(page.getByRole('button',{name:'Place an order',exact:true})).toHaveCount(1);
 await expect(cards(page).first()).toContainText('Payment pending');await expect(cards(page).first().getByRole('button',{name:'Pay now'})).toBeVisible();
 await expect(cards(page).nth(1).getByRole('button',{name:'Track order'})).toBeVisible();
 await page.getByRole('button',{name:'Load more orders'}).click();await expect(cards(page)).toHaveCount(10);
 await page.getByRole('button',{name:'Completed (1)',exact:true}).click();await expect(cards(page)).toHaveCount(1);await expect(cards(page).first()).toContainText('Paid via Cash');
 await page.getByRole('button',{name:'Cancelled (2)',exact:true}).click();await expect(cards(page)).toHaveCount(2);await expect(page.getByText('Refunded INR 25.00 to your Card',{exact:true})).toBeVisible();await expect(page.getByText('Refund pending: INR 25.00',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Pay now'})).toHaveCount(0);
});
test('search, date ranges, sorting, empty results and navigation',async({page})=>{
 const search=page.getByRole('searchbox',{name:'Search pharmacy orders'});await search.fill('Catalogue pharmacy');await expect(cards(page)).toHaveCount(8);await search.fill('active-3');await expect(cards(page)).toHaveCount(1);await search.fill('no such medicine');await expect(page.getByText('No matching orders',{exact:true})).toBeVisible();await search.fill('');
 await page.getByRole('button',{name:'Filters',exact:true}).click();await page.getByLabel('Sort orders',{exact:true}).selectOption('oldest');await page.getByRole('button',{name:'Show results'}).click();await expect(cards(page).first()).toContainText('ACTIVE-9');
 await page.getByRole('button',{name:'Completed (1)',exact:true}).click();await page.getByRole('button',{name:/^Filters/}).click();await page.getByLabel('Filter by date range',{exact:true}).selectOption('90');await page.getByRole('button',{name:'Show results'}).click();await expect(cards(page)).toHaveCount(0);await page.getByRole('button',{name:/^Filters/}).click();await page.getByLabel('Filter by date range',{exact:true}).selectOption('custom');await page.getByLabel('From date',{exact:true}).fill('2024-01-01');await page.getByLabel('To date',{exact:true}).fill('2024-01-31');await page.getByRole('button',{name:'Show results'}).click();await expect(cards(page)).toHaveCount(1);
 await page.getByRole('button',{name:/^Filters/}).click();await page.getByLabel('From date',{exact:true}).fill('2024-02-01');await expect(page.getByRole('alert')).toContainText('end date');await page.getByLabel('Filter by date range',{exact:true}).selectOption('all');await page.getByRole('button',{name:'Show results'}).click();await cards(page).getByRole('button',{name:'View details'}).click();await expect(page).toHaveURL(/pharmacy-orders\/completed$/);
});
test('aligned desktop grid and single-column mobile without overflow',async({page})=>{
 await page.setViewportSize({width:1536,height:1024});await page.screenshot({path:'artifacts/pharmacy-orders/list-desktop.png'});const first=await cards(page).nth(0).boundingBox(),second=await cards(page).nth(1).boundingBox();expect(first!.y).toBe(second!.y);expect(Math.abs(first!.width-second!.width)).toBeLessThan(1);
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);await page.screenshot({path:'artifacts/pharmacy-orders/list-mobile.png'});const a=await cards(page).nth(0).boundingBox(),b=await cards(page).nth(1).boundingBox();expect(a!.x).toBe(b!.x);expect(b!.y).toBeGreaterThan(a!.y);expect(await page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
});

test('mobile filters keep context, focus, clear action and rating submission',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Filters',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Filter pharmacy orders'});await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Filter by order status').locator('option[value="COMPLETED"]')).toHaveCount(0);await dialog.getByLabel('Filter by order status').selectOption('PROCESSING');await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.getByRole('button',{name:/^Filters/})).toBeFocused();await page.getByRole('button',{name:'Completed (1)',exact:true}).click();await expect(cards(page)).toHaveCount(1);
 await page.getByRole('button',{name:/^Filters/}).click();await expect(dialog.getByLabel('Filter by order status').locator('option')).toHaveCount(2);await dialog.getByRole('button',{name:'Clear filters',exact:true}).click();await dialog.getByRole('button',{name:'Show results'}).click();await page.getByRole('button',{name:'Rate order',exact:true}).click();await page.getByRole('radio',{name:'5 stars'}).click();await page.route('**/orders/completed/rate',r=>r.fulfill({json:{success:true}}));await page.getByRole('button',{name:'Submit rating'}).click();await page.getByRole('dialog',{name:'Rate order',exact:true}).getByRole('button',{name:'Close'}).click();await expect(page.getByRole('button',{name:'Rate order',exact:true})).toHaveCount(0);await expect(page.getByText('Rated',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Reorder',exact:true}).click();await expect(page).toHaveURL(/new\?pharmacy=p1$/);
});
test('unknown rating state never becomes an unrated claim',async({page})=>{await page.route('**/patients/reviews',r=>r.fulfill({status:500,json:{message:'Unavailable'}}));await page.reload();await page.getByRole('button',{name:'Completed (1)',exact:true}).click();await expect(page.getByRole('button',{name:'Rate order',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Retry rating check'})).toBeVisible();});

test('existing ratings and failed submissions never offer a false success',async({page})=>{
 await page.route('**/patients/reviews',r=>r.fulfill({json:{data:[{booking_id:'completed',rating:4}]}}));await page.reload();await page.getByRole('button',{name:'Completed (1)',exact:true}).click();await expect(page.getByText('Rated',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Rate order',exact:true})).toHaveCount(0);
 await page.route('**/patients/reviews',r=>r.fulfill({json:{data:[]}}));await page.reload();await page.getByRole('button',{name:'Rate order',exact:true}).click();await page.getByRole('radio',{name:'4 stars'}).click();await page.route('**/orders/completed/rate',r=>r.fulfill({status:500,json:{message:'Rating could not be saved'}}));await page.getByRole('button',{name:'Submit rating'}).click();await expect(page.getByRole('alert')).toContainText('Rating could not be saved');await expect(page.getByText('Rated',{exact:true})).toHaveCount(0);
});
test('unconfirmed pharmacy availability disables reorder with an explanation',async({page})=>{await page.route('**/patients/providers?**',r=>r.fulfill({json:{data:[]}}));await page.reload();await page.getByRole('button',{name:'Completed (1)',exact:true}).click();await expect(page.getByRole('button',{name:'Reorder',exact:true})).toBeDisabled();await expect(page.getByText('Pharmacy availability not confirmed',{exact:true})).toBeVisible();});
test('empty categories have a pharmacy action while filtered empties can clear filters',async({page})=>{await page.route('**/orders/mine',r=>r.fulfill({json:orders.filter(o=>o.status!=='COMPLETED')}));await page.reload();await page.getByRole('button',{name:'Completed (0)',exact:true}).click();await expect(page.getByText('No completed orders yet',{exact:true})).toBeVisible();await page.screenshot({path:'artifacts/pharmacy-orders/empty-orders.png'});await expect(page.getByRole('button',{name:'Browse pharmacies',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Place an order',exact:true})).toHaveCount(1);await page.getByRole('button',{name:'Active (10)',exact:true}).click();await page.getByRole('searchbox',{name:'Search pharmacy orders'}).fill('nonexistent medicine');await expect(page.getByText('No matching orders',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Clear filters',exact:true}).last().click();await expect(cards(page)).toHaveCount(8);});


test('workflow hierarchy preserves direct links, query parameters, history and keyboard navigation', async ({page}) => {
 await page.goto('/pharmacy-orders?tab=completed&source=records');
 await expect(page.getByRole('tab', {name:/^Orders/})).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('button',{name:'Completed (1)',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('tab',{name:/Prescription requests/}).click();
 await expect(page).toHaveURL(/tab=requests&source=records/);
 await expect(page.getByRole('group',{name:'Pharmacy order category'})).toHaveCount(0);
 await expect(page.getByRole('searchbox',{name:'Search prescription requests'})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('tab',{name:/Prescription requests/})).toHaveAttribute('aria-selected','true');
 await page.goBack();
 await expect(page.getByRole('button',{name:'Completed (1)',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.goForward();
 await page.getByRole('tab',{name:/Prescription requests/}).focus();
 await page.keyboard.press('ArrowLeft');
 await expect(page.getByRole('tab',{name:/^Orders/})).toBeFocused();
 await expect(page.getByRole('button',{name:'Active (10)',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page).toHaveURL(/source=records/);
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('tab',{name:/Prescription requests/}).click();
 await expect(page.getByRole('tab',{name:/Prescription requests/})).toBeInViewport();
 await page.screenshot({path:'artifacts/pharmacy-orders/workflow-requests-mobile.png'});
 expect(await page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.setViewportSize({width:1536,height:1024});
 await page.getByRole('tab',{name:/^Orders/}).click();
 await page.screenshot({path:'artifacts/pharmacy-orders/workflow-orders-desktop.png'});
});

 test('payment status is presented once and workflow counts cover all records',async({page})=>{
 await expect(page.getByRole('tab',{name:'Orders 13',exact:true})).toBeVisible();
 await expect(page.getByRole('tab',{name:'Prescription requests 0',exact:true})).toBeVisible();
 await expect(cards(page).first().getByText('Payment pending',{exact:true})).toHaveCount(1);
 });
