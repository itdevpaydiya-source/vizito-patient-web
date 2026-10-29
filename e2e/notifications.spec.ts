import {test,expect,type APIRequestContext,type Page} from '@playwright/test';
const API='http://localhost:3000';
async function login(page:Page,request:APIRequestContext){const r=await request.post(API+'/patient/auth/login',{data:{phone:'8866314762',password:'Vizito@2026'}});expect(r.ok()).toBeTruthy();const a=await r.json();const token=a.access_token||a.token;await page.goto('/auth/login');await page.evaluate(({token,a})=>{localStorage.setItem('vizito_token',token);localStorage.setItem('vizito_user',JSON.stringify({token,role:'patient',fullName:a.full_name||'Kavya Reddy'}));},{token,a});return token;}
test('notifications live feed, filters, paging, read, delete and undo',async({page,request})=>{
 const token=await login(page,request),headers={Authorization:`Bearer ${token}`};
 const feed=await request.get(API+'/notifications/patient-feed?page=1&page_size=10&tab=all',{headers});expect(feed.ok()).toBeTruthy();const original=await feed.json();expect(original.items.length).toBeGreaterThan(0);expect(original.counts.all).toBeGreaterThan(10);
 await page.setViewportSize({width:1280,height:900});await page.goto('/notifications');await expect(page.getByRole('heading',{name:'Notifications'})).toBeVisible();
 await page.getByLabel(/^Notifications/).click();await expect(page.getByRole('dialog',{name:'Recent notifications'})).toBeVisible();await page.screenshot({path:'../artifacts/notifications/bell-dropdown-desktop.png'});await page.keyboard.press('Escape');
 for(const name of ['All','Unread','Appointments','Lab & reports','Orders','Payments','Support'])await expect(page.getByRole('button',{name:new RegExp(`^${name}`)})).toBeVisible();
 await page.getByRole('button',{name:/Support/}).click();await expect(page).toHaveURL(/tab=support/);await page.getByRole('button',{name:/All /}).click();
 await page.getByLabel('Search notifications').fill('NT-QA-no-match');await expect(page.getByText('No notifications found')).toBeVisible();await page.getByLabel('Search notifications').fill('');
 await page.getByLabel('Notification date range').click();await page.getByRole('option',{name:'Last 30 days'}).click();await expect(page).toHaveURL(/range=30/);await page.getByLabel('Notification date range').click();await page.getByRole('option',{name:'All dates'}).click();
 const next=page.getByRole('button',{name:'Next notifications page'});if(await next.isEnabled()){await next.click();await expect(page).toHaveURL(/page=2/);await page.goBack();}
 await page.screenshot({path:'../artifacts/notifications/desktop-1280.png',fullPage:true});
 const first=original.items[0];const del=await request.delete(API+`/notifications/${encodeURIComponent(first.id)}`,{headers});expect(del.ok()).toBeTruthy();const deleted=await del.json();const undo=await request.post(API+`/notifications/${encodeURIComponent(first.id)}/undo`,{headers,data:{undo_token:deleted.undo_token}});expect(undo.ok()).toBeTruthy();
 const disposable=original.items.find((n:any)=>n.id!==first.id);if(disposable){const finalDelete=await request.delete(API+`/notifications/${encodeURIComponent(disposable.id)}`,{headers});expect(finalDelete.ok()).toBeTruthy();}
 const unread=original.items.find((n:any)=>n.unread);if(unread){const read=await request.patch(API+`/notifications/${encodeURIComponent(unread.id)}/read`,{headers});expect(read.ok()).toBeTruthy();expect(typeof(await read.json()).unread_count).toBe('number');}
 await page.setViewportSize({width:390,height:844});await page.goto('/notifications');await expect(page.locator('body')).not.toHaveCSS('overflow-x','scroll');await page.screenshot({path:'../artifacts/notifications/mobile-390.png',fullPage:true});
 await page.setViewportSize({width:1280,height:900});await page.goto('/notifications?tab=unread');await expect(page.getByText("You're all caught up!")).toBeVisible();await page.screenshot({path:'../artifacts/notifications/unread-empty-desktop.png',fullPage:true});
});
