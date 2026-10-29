import {expect,test,type Page} from '@playwright/test';

async function login(page:Page,request:any){
  const response=await request.post('http://localhost:3000/patient/auth/login',{data:{phone:'8866314762',password:'Vizito@2026'}});
  expect(response.ok()).toBeTruthy();
  const auth=await response.json();
  await page.goto('/auth/login');
  await page.evaluate(value=>{
    localStorage.setItem('vizito_token',value.access_token);
    localStorage.setItem('vizito_user',JSON.stringify({token:value.access_token,role:'patient',fullName:value.full_name}));
    sessionStorage.setItem('vizito_search_area',JSON.stringify({lat:17.4622,lng:78.3568,label:'Kondapur 500084',source:'manual',at:Date.now()}));
  },auth);
}

test('doctor profile loaded visual states',async({page,request})=>{
  await login(page,request);
  await page.goto('/find-doctors');
  const pagination=page.getByRole('navigation',{name:'doctors pagination'});
  await expect(pagination).toBeVisible();
  await expect(pagination).toContainText('Showing 1');
  await expect(pagination.getByRole('button',{name:'doctors page 1'})).toHaveAttribute('aria-current','page');
  const card=page.locator('.dj-card').filter({hasText:'Meera Rao'}).first();
  await card.getByRole('button',{name:'View profile'}).click();
  await expect(page.getByRole('heading',{name:'Clinic location'})).toBeVisible();
  await expect(page.locator('.dj-profile-v2 main [role="status"]')).toHaveCount(0);
  for(const width of [1440,1280,390]){
    await page.setViewportSize({width,height:1000});
    await page.evaluate(()=>scrollTo(0,0));
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await page.screenshot({path:`../artifacts/doctor-redesign/02-profile-${width}.png`,fullPage:true,animations:'disabled'});
  }
});
