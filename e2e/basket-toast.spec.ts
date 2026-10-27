import {test,expect} from '@playwright/test';

// Test-only API fixtures exercise the actual App/router/StrictMode/layout, never production inventory.
const pharmacyId='00000000-0000-4000-8000-000000000001';
test.beforeEach(async({page})=>{
 const appOrigin=new URL(test.info().project.use.baseURL as string).origin;
 const medicines=[{id:'m1',medicine_name:'Catalogue verification tablet',strength:'500',strength_unit:'mg',dosage_form:'Tablet',packaging_type:'Strip',units_per_pack:10,mrp:12.5,requires_prescription:false,in_stock:true,available_quantity:20},{id:'m2',medicine_name:'Second verification tablet',mrp:8,requires_prescription:false,in_stock:true,available_quantity:20}];
 const saved:Record<string,any>={};
 await page.addInitScript(()=>{localStorage.setItem('vizito_token','ui-test-session');localStorage.setItem('vizito_user',JSON.stringify({fullName:'UI verification patient',role:'patient',token:'ui-test-session'}));});
 await page.route('**/*',async route=>{const u=new URL(route.request().url());
  if(u.pathname.includes('/patients/providers'))return route.fulfill({json:{data:[{id:pharmacyId,display_name:'UI verification pharmacy',partner_type:'PHARMACY'}]}});
  if(u.pathname.includes('/orders/baskets')){
   if(route.request().method()==='GET')return route.fulfill({json:Object.values(saved)});
   const body=route.request().postDataJSON();const id=u.pathname.split('/').pop()!;
   const basket={pharmacyId:id,version:(saved[id]?.version||0)+1,lines:body.items.map((item:any)=>({quantity:item.quantity,medicine:medicines.find(m=>m.id===item.medicine_id)||{id:item.medicine_id,medicine_name:'Scroll verification medicine',mrp:10,in_stock:true}}))};saved[id]=basket;return route.fulfill({json:basket});
  }
  if(u.pathname.includes('/patients/me'))return route.fulfill({json:{data:{addresses:[]}}});
  if(u.pathname.includes('/medicines/pharmacy-catalogue/'))return route.fulfill({json:{items:medicines,total:2}});
  if(u.origin!==appOrigin)return route.fulfill({json:{data:[]}});
  return route.continue();
 });
 await page.goto(`/pharmacy-orders/new?pharmacy=${pharmacyId}`);
 await expect(page.getByRole('heading',{name:'Add medicines',exact:true})).toBeVisible();
 await expect(page.locator('section[aria-label="Medicine results"] li')).toHaveCount(2);
});
const row=(page:any)=>page.locator('section[aria-label="Medicine results"] li').filter({hasText:'Catalogue verification tablet'});
const toast=(page:any)=>page.getByRole('complementary',{name:'Added to basket notification'});

test('Add leaves catalogue usable, shows one toast, and View basket opens the only drawer',async({page})=>{
 const add=row(page).getByRole('button',{name:'Add',exact:true});
 await add.click();
 await expect(page.locator('dialog[open]')).toHaveCount(0);
 await expect(toast(page)).toHaveCount(1);
 await expect(toast(page)).toContainText('1 unit added to basket.');
 await expect(add).toBeFocused();
 await add.click();
 await page.locator('section[aria-label="Medicine results"] li').filter({hasText:'Second verification tablet'}).getByRole('button',{name:'Add',exact:true}).click();
 await expect(toast(page)).toHaveCount(1);
 await expect(page.getByRole('region',{name:'Basket launcher'})).toContainText('3 units added');
 await page.screenshot({path:'artifacts/basket-rendering/catalogue-toast.png'});
 await toast(page).getByRole('button',{name:'Dismiss added confirmation'}).click();
 await expect(toast(page)).toHaveCount(0);
 await page.getByRole('searchbox',{name:'Search medicines at selected pharmacy'}).fill('test');
 await expect(toast(page)).toHaveCount(0);
 await add.click();
 await toast(page).getByRole('button',{name:'View basket',exact:true}).click();
 await expect(page.locator('dialog[open]')).toHaveCount(1);await expect(toast(page)).toHaveCount(0);
 const drawer=page.getByRole('dialog');await expect(drawer.locator('#basket-items > li')).toHaveCount(2);
 for(const selector of ['footer','[aria-label="Selected pharmacy"]','[aria-label="Basket subtotal"]','[aria-label="Basket fulfillment"]'])await expect(drawer.locator(selector)).toHaveCount(1);
 await drawer.getByRole('button',{name:'Close basket'}).click();
 await page.getByRole('region',{name:'Basket launcher'}).getByRole('button',{name:'View basket'}).click();
 await expect(toast(page)).toHaveCount(0);
 await drawer.getByRole('button',{name:'Remove Catalogue verification tablet from basket'}).click();
 await drawer.getByRole('button',{name:'Remove Second verification tablet from basket'}).click();
 await expect(drawer.getByText('Your basket is empty',{exact:true})).toBeVisible();
 await expect(drawer.getByRole('button',{name:'Review & place order'})).toBeDisabled();
});

test('toast dismisses automatically, pauses for keyboard interaction, and fits mobile',async({page})=>{
 await page.clock.install();
 const add=row(page).getByRole('button',{name:'Add',exact:true});
 await add.click();await expect(toast(page)).toBeVisible();await page.mouse.move(5,5);
 await page.clock.fastForward(6100);await expect(toast(page)).toHaveCount(0);
 await add.click();await page.mouse.move(5,5);await toast(page).getByRole('button',{name:'View basket',exact:true}).focus();
 await page.clock.fastForward(7000);await expect(toast(page)).toBeVisible();
 await page.getByRole('searchbox',{name:'Search medicines at selected pharmacy'}).focus();
 await page.clock.fastForward(6100);await expect(toast(page)).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});await add.click();
 const rect=await toast(page).boundingBox();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(390);
 await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
 await page.screenshot({path:'artifacts/basket-rendering/catalogue-toast-mobile.png'});
 await toast(page).getByRole('button',{name:'Continue shopping',exact:true}).click();
 await expect(toast(page)).toHaveCount(0);await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('drawer counts, live totals, one footer and responsive independent scrolling',async({page})=>{
 await page.setViewportSize({width:1586,height:992});
 await row(page).getByRole('button',{name:'Add',exact:true}).click();
 await toast(page).getByRole('button',{name:'View basket',exact:true}).click();
 const drawer=page.getByRole('dialog');
 await expect(drawer.getByRole('heading',{name:'Your basket (1)',exact:true})).toBeVisible();
 await expect(drawer.getByText('1 medicine · 1 unit',{exact:true})).toBeVisible();
 await drawer.getByRole('button',{name:'Increase basket quantity of Catalogue verification tablet'}).click();
 await expect(drawer.getByText('1 medicine · 2 units',{exact:true})).toBeVisible();
 await expect(drawer.locator('[aria-label="Basket subtotal"]')).toContainText('INR 25.00');
 await page.screenshot({path:'artifacts/basket-rendering/drawer-desktop.png'});
 await drawer.getByRole('button',{name:'Close basket'}).click();
 await page.locator('section[aria-label="Medicine results"] li').filter({hasText:'Second verification tablet'}).getByRole('button',{name:'Add',exact:true}).click();
 await toast(page).getByRole('button',{name:'View basket',exact:true}).click();
 await expect(drawer.getByText('2 medicines · 3 units',{exact:true})).toBeVisible();
 await expect(drawer.locator('[aria-label="Basket subtotal"]')).toContainText('INR 33.00');
 await drawer.getByRole('button',{name:'Remove Second verification tablet from basket'}).click();
 await expect(drawer.getByText('1 medicine · 2 units',{exact:true})).toBeVisible();
 await expect(drawer.locator('[aria-label="Basket subtotal"]')).toContainText('INR 25.00');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'artifacts/basket-rendering/drawer-mobile.png'});
 const box=await drawer.boundingBox();expect(box!.width).toBeLessThanOrEqual(390);
 await drawer.getByRole('button',{name:'Decrease basket quantity of Catalogue verification tablet'}).click();
 await expect(drawer.locator('[aria-label="Basket subtotal"]')).toContainText('INR 12.50');
 await drawer.getByRole('button',{name:'Remove Catalogue verification tablet from basket'}).click();
 await expect(drawer.getByText('Your basket is empty',{exact:true})).toBeVisible();
 await expect(drawer.getByRole('button',{name:'Review & place order'})).toBeDisabled();
 // Populate enough test-only catalogue records to prove the real drawer body scrolls, not the footer.
 await drawer.getByRole('button',{name:'Close basket'}).click();
 await page.route('**/medicines/pharmacy-catalogue/**',r=>r.fulfill({json:{items:Array.from({length:8},(_,i)=>({id:`scroll-${i}`,medicine_name:`Scroll verification medicine ${i+1}`,mrp:10+i,requires_prescription:false,in_stock:true,available_quantity:5})),total:8}}));
 await page.reload();
 const adds=page.locator('section[aria-label="Medicine results"] li').getByRole('button',{name:'Add',exact:true});await expect(adds).toHaveCount(8);
 for(let i=0;i<8;i++)await adds.nth(i).click();
 await toast(page).getByRole('button',{name:'View basket',exact:true}).click();
 for(const size of [{width:1586,height:992},{width:390,height:844}]){
  await page.setViewportSize(size);const body=drawer.locator('[aria-label="Basket contents"]');
  const before=await drawer.locator('footer').boundingBox();
  expect(await body.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  const catalogueScroll=await page.locator('main').first().evaluate(el=>el.scrollTop);
  await body.evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await expect(drawer.getByRole('button',{name:'Review & place order'})).toBeVisible();
  const after=await drawer.locator('footer').boundingBox();expect(Math.abs(after!.y-before!.y)).toBeLessThan(1);
  expect(await page.locator('main').first().evaluate(el=>el.scrollTop)).toBe(catalogueScroll);
  for(const selector of ['footer','[aria-label="Selected pharmacy"]','[aria-label="Basket subtotal"]','[aria-label="Basket fulfillment"]'])await expect(drawer.locator(selector)).toHaveCount(1);
 }
});

test('resume card labels pending changes as active and only confirmed drafts as saved',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/orders/baskets/**',async route=>{await gate;await route.fallback();});
 try {
  await row(page).getByRole('button',{name:'Add',exact:true}).click();
  await page.getByRole('navigation',{name:'Breadcrumb'}).getByRole('button',{name:'Pharmacy Orders',exact:true}).click();
  await page.getByRole('button',{name:'Place an order',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your active order',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Your saved order',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Discard order',exact:true})).toBeDisabled();
  release();
  await expect(page.getByRole('heading',{name:'Your saved order',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Your active order',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Resume order',exact:true})).toHaveCount(1);
 } finally {release();}
});

test('review and fulfillment keep the shared basket and enable backend-supported fulfillment', async ({page}) => {
 await row(page).getByRole('button',{name:'Add',exact:true}).click();
 await toast(page).getByRole('button',{name:'View basket',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Review & place order'}).click();
 await expect(page.getByRole('heading',{name:'Review order',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Review medicines'})).toHaveCount(1);
 await expect(page.getByRole('searchbox',{name:'Search medicines at selected pharmacy'})).toHaveCount(0);
 await expect(page.getByRole('complementary',{name:'Review order summary'})).toContainText('INR 12.50');
 await page.screenshot({path:'artifacts/basket-rendering/review-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
 await page.screenshot({path:'artifacts/basket-rendering/review-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Edit basket',exact:true}).click();
 await page.getByRole('region',{name:'Basket launcher'}).getByRole('button',{name:'View basket'}).click();
 await expect(page.getByRole('dialog').locator('#basket-items > li')).toHaveCount(1);
 await page.getByRole('dialog').getByRole('button',{name:'Review & place order'}).click();
 await page.getByRole('button',{name:'Continue to fulfillment',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Fulfillment',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Place order',exact:true})).toBeEnabled();
 await expect(page.getByRole('button',{name:/Pickup at pharmacy/})).toBeEnabled();
 await expect(page.getByRole('button',{name:/Home delivery/})).toBeEnabled();
 await page.getByRole('button',{name:'Home delivery',exact:true}).click();
 await expect(page.getByRole('button',{name:'Place order',exact:true})).toBeDisabled();
 await expect(page.getByRole('link',{name:'Add an address',exact:true})).toHaveAttribute('href','/profile?section=addresses');
 await page.getByRole('button',{name:'Pay online',exact:true}).click();
 await expect(page.getByRole('button',{name:'Pay online',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Pickup at pharmacy',exact:true}).click();
 await page.getByRole('button',{name:'Pay at pickup',exact:true}).click();
 await expect(page.getByRole('button',{name:'Place order',exact:true})).toBeEnabled();

 await expect(page.getByRole('complementary',{name:'Fulfillment order summary'})).toContainText('INR 12.50');
 await page.screenshot({path:'artifacts/basket-rendering/fulfillment-mobile.png',fullPage:true});
 await page.getByRole('complementary',{name:'Fulfillment order summary'}).scrollIntoViewIfNeeded();
 await page.screenshot({path:'artifacts/basket-rendering/fulfillment-mobile-summary.png'});
 expect(await page.locator('main').evaluate(el=>el.scrollWidth <= el.clientWidth)).toBe(true);
 await page.locator('main').evaluate(el=>el.scrollTo({top:0}));
 await page.setViewportSize({width:1536,height:1024});
 await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeGreaterThan(200);
 await page.screenshot({path:'artifacts/basket-rendering/fulfillment-desktop.png'});
 await page.getByRole('button',{name:'Back to review order'}).click();
 await expect(page.getByRole('group',{name:'Quantity of Catalogue verification tablet'})).toContainText('1');
});
