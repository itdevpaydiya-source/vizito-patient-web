import {test,expect} from '@playwright/test';
const base={locations:[{id:1,name:'Actual centre',address:'Actual address',city:'Hyderabad'}],selected:[{code:'CBC',name:'API test',price:100}],tests_offered:1};
const labs=[{...base,id:'a',name:'Lab A',total:100,report_hours:12,registration_number:'REG-A',settings:{home:{enabled:true,fee:40}}},{...base,id:'b',name:'Lab B',total:150,report_hours:6,settings:{home:{enabled:false}}},{...base,id:'c',name:'Lab C',total:200}];
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('vizito_token','ui-session');localStorage.setItem('vizito_user',JSON.stringify({fullName:'UI patient',role:'patient',token:'ui-session'}));});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.port!=='3000')return r.continue();return r.fulfill({json:u.pathname==='/lab-tests'?[{id:1,code:'CBC',name:'API test',department:'Blood',fasting_hours:0}]:u.pathname==='/lab-tests/labs'?labs:[]});});
 await page.goto('/lab-tests?step=2&tests=CBC');
});
test('compares actual fields, unique best options and a single continuation',async({page})=>{
 const summary=page.getByRole('complementary',{name:'Lab selection summary'});
 await expect(summary).toContainText('API test');await expect(summary.getByRole('button',{name:'Continue to date and time'})).toBeDisabled();
 await expect(summary).toContainText('Select an eligible lab');
 const cards=page.getByRole('list',{name:'Labs'}).getByRole('listitem');await expect(cards).toHaveCount(3);
 await expect(cards.first()).toContainText('Lowest price');await expect(cards.nth(1)).toContainText('Fastest report');await expect(cards.nth(2)).not.toContainText('Report turnaround not provided');
 await expect(cards.nth(1)).not.toContainText('Registration details not provided');await expect(cards.first()).toContainText('REG-A');
 await page.getByRole('radio',{name:'Select Lab B',exact:true}).check();await expect(summary).toContainText('Lab B');await expect(summary).toContainText('150');await expect(page.getByRole('button',{name:'Continue to date and time'})).toHaveCount(1);
 await page.getByRole('button',{name:'Fastest report',exact:true}).click();await expect(cards.first()).toContainText('Lab B');
 await page.getByRole('button',{name:'Filters',exact:true}).click();await page.getByRole('button',{name:'Home collection available',exact:true}).click();await expect(cards).toHaveCount(1);await expect(cards.first()).not.toContainText('Lowest price');
 await page.getByRole('button',{name:'Home collection available',exact:true}).click();await page.getByRole('textbox',{name:'Search labs',exact:true}).fill('Lab A');await expect(cards).toHaveCount(1);
 await page.getByRole('textbox',{name:'Search labs',exact:true}).fill('');
 await page.setViewportSize({width:1440,height:1000});await page.locator('main').evaluate(el=>{el.style.scrollBehavior='auto';el.scrollTop=0;});await page.screenshot({path:'artifacts/lab-booking/choose-lab-desktop.png'});
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);expect(await page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:'artifacts/lab-booking/choose-lab-mobile.png'});
 await page.getByRole('button',{name:'Continue to date and time'}).click();await expect(page.getByRole('region',{name:'Centre and time'})).toBeVisible();
});
test('no eligible lab offers honest recovery while API errors stay errors',async({page})=>{
 await page.route('**/lab-tests/labs?**',r=>r.fulfill({json:[]}));await page.reload();
 await expect(page.getByText('Individual test availability is not provided here.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Change selected tests'}).click();await expect(page.getByRole('region',{name:'Choose tests'}).getByRole('checkbox')).toBeChecked();
 await page.getByRole('button',{name:'Continue to select centre'}).click();await page.route('**/lab-tests/labs?**',r=>r.fulfill({status:500,json:{message:'Comparison unavailable'}}));await page.reload();await expect(page.getByRole('alert')).toContainText('Comparison unavailable');await expect(page.getByRole('button',{name:'Continue to date and time'})).toBeDisabled();
});

test('chosen lab survives filters, city changes, refresh and phone navigation',async({page})=>{
 await page.getByRole('radio',{name:'Select Lab B',exact:true}).check();await expect(page).toHaveURL(/lab=b/);
 const summary=page.getByRole('complementary',{name:'Lab selection summary'});
 await page.getByRole('textbox',{name:'Search labs',exact:true}).fill('Lab A');
 await expect(summary).toContainText('Lab B');await expect(summary).toContainText('Your chosen lab is hidden by current filters');await summary.getByRole('button',{name:'Show it'}).click();await expect(page.getByRole('radio',{name:'Select Lab B',exact:true})).toBeChecked();
 await page.getByRole('textbox',{name:'City or area',exact:true}).fill('NoMatchingCity');await expect(summary).toContainText('Lab B');await expect(page.getByText('No lab matches these filters.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Clear filters',exact:true}).first().click();await expect(page.getByRole('textbox',{name:'City or area'})).toHaveValue('');await expect(page.getByRole('radio',{name:'Select Lab B',exact:true})).toBeChecked();
 await page.reload();await expect(page.getByRole('radio',{name:'Select Lab B',exact:true})).toBeChecked();
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
 const bar=page.getByRole('region',{name:'Chosen lab actions'});await expect(bar).toContainText('Lab B');await expect(bar).toContainText('150');await expect(bar.getByRole('button',{name:'Continue to date and time'})).toBeInViewport();await page.screenshot({path:'artifacts/lab-booking/chosen-lab-bar-390.png'});
 await bar.getByRole('button',{name:'Continue to date and time'}).click();await page.goBack();await expect(page.getByRole('radio',{name:'Select Lab B',exact:true})).toBeChecked();
});
test('drops unknown test codes and ignores an ineligible linked lab',async({page})=>{
 await page.goto('/lab-tests?step=2&tests=BOGUS');await expect(page.getByRole('status')).toContainText('Some tests in this link are no longer available.');await expect(page).toHaveURL(/step=1/);await expect(page.getByRole('region',{name:'Choose tests'})).toBeVisible();
 await page.goto('/lab-tests?step=2&tests=CBC,BOGUS&lab=not-eligible');await expect(page.getByRole('status').filter({hasText:'Some tests'})).toBeVisible();await expect(page).not.toHaveURL(/BOGUS|not-eligible/);await expect(page.getByRole('radio',{name:'Select Lab A',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Continue to date and time'})).toBeDisabled();
});
