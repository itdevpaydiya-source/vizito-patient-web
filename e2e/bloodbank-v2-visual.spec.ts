import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { loginAsTestPatient } from "./helpers/testAccount";

test("blood v2 five-panel read-only visual walk", async ({ page, request }) => {
  await mkdir("artifacts/bloodbank-v2", { recursive: true });
  const auth=await (await request.post("http://localhost:3000/patient/auth/login",{data:{phone:"8866314762",password:"Vizito@2026"}})).json();
  const token=auth.access_token||auth.token||auth.data?.access_token;
  await loginAsTestPatient(page,{fullName:"Kavya Reddy",mobile:"8866314762",email:"",password:"",patientId:"",token});
  await page.evaluate(()=>sessionStorage.setItem("vizito_search_area",JSON.stringify({lat:17.4435,lng:78.3772,label:"HITEC City, Hyderabad 500084",source:"manual",at:Date.now()})));
  const capture=async(name:string)=>{await expect(page.locator(".bb-page")).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBeTruthy();await page.screenshot({path:`artifacts/bloodbank-v2/${name}-desktop.png`,fullPage:true,animations:"disabled"});await page.setViewportSize({width:390,height:844});await expect(page.locator(".bb-page")).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBeTruthy();await page.screenshot({path:`artifacts/bloodbank-v2/${name}-390.png`,fullPage:true,animations:"disabled"});await page.setViewportSize({width:1280,height:900});};
  await page.setViewportSize({width:1280,height:900});
  await page.goto("/find-blood"); await expect(page.getByRole("heading",{name:/Find blood/})).toBeVisible(); await capture("1-home");
  await page.goto("/find-blood?view=centres"); await expect(page.getByRole("heading",{name:"Blood centres near you"})).toBeVisible(); await capture("2-centres");
  const detail=await page.getByRole("link",{name:"View details"}).first().getAttribute("href"); expect(detail).toBeTruthy(); await page.goto(detail!); await expect(page.getByRole("heading",{name:"Blood availability"})).toBeVisible(); await capture("3-centre");
  const requestLink=await page.getByRole("link",{name:"Request blood here"}).getAttribute("href"); expect(requestLink).toBeTruthy(); await page.goto(requestLink!); await expect(page.getByRole("heading",{name:/Request blood/})).toBeVisible(); await capture("4-request");
  await page.goto("/blood-requests"); const first=page.locator("article").first(); if(await first.isVisible()) await first.locator("button").first().click(); await capture("5-tracking");
});
