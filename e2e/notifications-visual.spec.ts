import {test,expect} from '@playwright/test';
test('notification visual states',async({page,request})=>{
 const r=await request.post('http://localhost:3000/patient/auth/login',{data:{phone:'8866314762',password:'Vizito@2026'}});expect(r.ok()).toBeTruthy();
 const a=await r.json(),token=a.access_token||a.token;
 await page.goto('/auth/login');await page.evaluate(({token,a})=>{localStorage.setItem('vizito_token',token);localStorage.setItem('vizito_user',JSON.stringify({token,role:'patient',fullName:a.full_name||'Kavya Reddy'}));},{token,a});
 await page.setViewportSize({width:1280,height:900});await page.goto('/notifications');await page.getByLabel(/^Notifications/).click();await expect(page.getByRole('dialog',{name:'Recent notifications'})).toBeVisible();await page.screenshot({path:'../artifacts/notifications/bell-dropdown-desktop.png'});await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.reload();await page.waitForTimeout(500);await page.screenshot({path:'../artifacts/notifications/mobile-390.png',fullPage:true});
 await page.setViewportSize({width:1280,height:900});await page.goto('/notifications');const markAll=page.getByRole('button',{name:'Mark all as read'});if(await markAll.isEnabled())await markAll.click();await page.goto('/notifications?tab=unread');await expect(page.getByText("You're all caught up!")).toBeVisible();await page.screenshot({path:'../artifacts/notifications/unread-empty-desktop.png',fullPage:true});
});
