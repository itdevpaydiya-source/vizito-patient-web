import {test,expect} from '@playwright/test';
const tests=[{id:1,code:'CBC',name:'Catalogue blood count',short_name:'CBC',department:'Haematology',specimen_type:'Blood',fasting_hours:0,tat_hours:24,about:'Catalogue description',patient_instructions:'Follow lab instructions'},{id:2,code:'T2',name:'Catalogue glucose',department:'Biochemistry',specimen_type:'Blood',fasting_hours:8,tat_hours:12}];
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('vizito_token','ui-session');localStorage.setItem('vizito_user',JSON.stringify({fullName:'UI patient',role:'patient',token:'ui-session'}));});
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.port!=='3000')return route.continue();return route.fulfill({json:u.pathname==='/lab-tests'?tests:[]});});
 await page.goto('/lab-tests');
});
test('search, category, details and shared selection summary work without fabricated prices',async({page})=>{
 const catalogue=page.getByRole('region',{name:'Choose tests'});
 await catalogue.getByRole('checkbox').first().check();
 const summary=page.getByRole('complementary',{name:'Selected tests'});
 await expect(summary).toContainText('Selected tests (1)');await expect(summary).toContainText('Catalogue blood count');await expect(summary).toContainText('Price shown after lab selection');
 await catalogue.getByText('View details',{exact:true}).first().click();await expect(catalogue).toContainText('Follow lab instructions');
 await page.getByRole('button',{name:'Biochemistry',exact:true}).click();await expect(catalogue.getByRole('checkbox')).toHaveCount(1);
 await catalogue.getByRole('checkbox').check();await expect(summary).toContainText('Selected tests (2)');
 await summary.getByRole('button',{name:'Remove Catalogue blood count'}).click();await expect(summary).toContainText('Selected tests (1)');
 await summary.getByRole('button',{name:'Continue to select centre'}).click();await expect(page.getByRole('region',{name:'Choose a lab',exact:true})).toBeVisible();
 await expect(catalogue).toHaveCount(0);await page.getByRole('button',{name:'Back to previous step'}).click();
 await summary.getByRole('button',{name:'Clear all'}).click();await expect(summary.getByRole('button',{name:'Continue to select centre'})).toBeDisabled();
 await page.getByRole('textbox',{name:'Search tests'}).fill('no such test');await expect(catalogue).toContainText('No tests match');
});
test('selection layout fits desktop, tablet and phone widths',async({page})=>{
 await page.getByRole('region',{name:'Choose tests'}).getByRole('checkbox').first().check();
 for(const width of [1440,1024,768,390]){
  await page.setViewportSize({width,height:1000});
  if(width===390)await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  await page.locator('main').evaluate(el=>{el.style.scrollBehavior='auto';el.scrollTop=0;});
  expect(await page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:`artifacts/lab-booking/select-tests-${width}.png`});
 }
});
test('packages use the existing package view and unavailable data has an honest empty state',async({page})=>{
 await page.getByRole('button',{name:'Health packages',exact:true}).click();await expect(page.getByText('No health packages are available right now. Choose individual tests instead.')).toBeVisible();
 await page.getByRole('button',{name:'Tests by category',exact:true}).click();await expect(page.getByRole('region',{name:'Choose tests'})).toBeVisible();
});

test('category dropdown and chips share filters and supported sorting keeps selection',async({page})=>{
 const catalogue=page.getByRole('region',{name:'Choose tests'});
 await page.getByRole('combobox',{name:'Test category',exact:true}).selectOption('Biochemistry');
 await expect(page.getByRole('button',{name:'Biochemistry',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(catalogue.getByRole('heading',{name:'Available tests (1)'})).toBeVisible();
 await catalogue.getByRole('checkbox').check();
 await page.getByRole('button',{name:'All',exact:true}).click();
 await expect(page.getByRole('combobox',{name:'Test category',exact:true})).toHaveValue('');
 await page.getByRole('combobox',{name:'Sort tests',exact:true}).selectOption('name');
 await expect(catalogue.getByRole('heading',{name:'Available tests (2)'})).toBeVisible();
 await expect(page.getByRole('complementary',{name:'Selected tests'})).toContainText('Selected tests (1)');
});

test('390px sticky Continue bar, selected-tests sheet and URL history survive refresh',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.reload();
 await expect(page.locator('h2[tabindex="-1"]')).not.toBeFocused();
 await expect(page.getByRole('combobox',{name:'Test category'})).toHaveCount(0);
 await expect(page.getByRole('textbox',{name:'Search tests'})).toHaveAttribute('placeholder','Search tests (CBC, HbA1c\u2026)');
 await page.getByRole('region',{name:'Choose tests'}).getByRole('checkbox').first().check();
 const bar=page.getByRole('region',{name:'Selected tests actions'});
 await expect(bar.getByRole('button',{name:'Continue to select centre'})).toBeInViewport();
 await expect(page).toHaveURL(/tests=CBC/);
 await bar.getByRole('button',{name:'1 test selected'}).click();
 const sheet=page.getByRole('dialog',{name:'Selected tests sheet'});await expect(sheet).toBeVisible();
 await expect(sheet).toContainText('Catalogue blood count');await page.keyboard.press('Escape');await expect(sheet).not.toBeVisible();
 await expect(bar.getByRole('button',{name:'1 test selected'})).toBeFocused();
 await bar.getByRole('button',{name:'Continue to select centre'}).click();
 await expect(page).toHaveURL(/step=2/);
 await page.goBack();await expect(page.getByRole('region',{name:'Choose tests'}).getByRole('checkbox').first()).toBeChecked();
 await page.goForward();await expect(page.getByRole('region',{name:'Choose a lab',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('region',{name:'Choose a lab',exact:true})).toBeVisible();await expect(page).toHaveURL(/tests=CBC/);
 await page.getByRole('button',{name:'Back to previous step'}).click();
 await bar.getByRole('button',{name:'1 test selected'}).click();await sheet.getByRole('button',{name:'Remove Catalogue blood count'}).click();
 await expect(bar).toHaveCount(0);await expect(sheet).not.toBeVisible();
 await page.getByRole('region',{name:'Choose tests'}).getByRole('checkbox').first().check();
 await bar.getByRole('button',{name:'1 test selected'}).click();await sheet.getByRole('button',{name:'Clear all'}).click();await expect(bar).toHaveCount(0);
});
