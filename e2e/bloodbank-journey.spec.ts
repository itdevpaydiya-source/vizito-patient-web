import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { loginAsTestPatient } from "./helpers/testAccount";
async function loginWithOtp(page: Page, phone: string) {
  await page.goto('/auth/login');
  const toggle=page.getByText('Login with OTP instead');
  if(await toggle.waitFor({state:'visible',timeout:15000}).then(()=>true,()=>false))await toggle.click();
  await page.getByPlaceholder('Enter mobile number or email').fill(phone);
  const sent=page.waitForResponse(r=>r.url().includes('/auth/send-otp')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Send OTP',exact:true}).click();
  const body=await (await sent).json();
  await page.getByPlaceholder('Enter code').fill(body.dev_otp||body.otp);
  await page.getByRole('button',{name:'Verify & Enter Dashboard'}).click();
  const proceed=page.getByRole('button',{name:'Continue to Dashboard'});
  await Promise.race([proceed.waitFor({state:'visible'}),page.waitForURL(/\/dashboard/)]);
  if(await proceed.isVisible())await proceed.click();
  await expect(page).toHaveURL(/\/dashboard/);
}
const API = "http://localhost:3000";
const BANK = "6e23ed6a-5539-424c-8ccb-1ddee99bd5d8";
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type /Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);
async function json(r: any) {
  expect(r.ok(), await r.text()).toBeTruthy();
  return r.json();
}
async function partner(request: APIRequestContext) {
  const sent = await json(
    await request.post(API + "/auth/send-otp", {
      data: { phone: "9872078255" },
    }),
  );
  expect(
    (
      await request.get(
        "http://localhost:5174/src/presentation/modules/ambulance/UrgentAmbulanceScreen.tsx",
      )
    ).ok(),
    "Vite must compile before creating data",
  ).toBeTruthy();
  const auth = await json(
    await request.post(API + "/auth/verify-otp", {
      data: { phone: "9872078255", otp: sent.dev_otp || sent.otp },
    }),
  );
  const selected = auth.requires_account_selection
    ? await json(
        await request.post(API + "/auth/select-account", {
          data: { login_token: auth.login_token, partner_id: BANK },
        }),
      )
    : auth;
  return { Authorization: `Bearer ${selected.access_token}` };
}
async function shots(page: Page, name: string) {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    if (width === 390) {
      await expect.poll(async()=> (await page.locator('aside[aria-label="Main navigation"]').boundingBox())!.x).toBeLessThan(-200);
    }
    await expect(page.locator(".bb-page")).toBeVisible();
    expect(
      await page
        .locator(".bb-page")
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
      name + " overflow",
    ).toBe(true);
    await page.setViewportSize({
      width,
      height: Math.min(
        6000,
        Math.max(
          1000,
          await page.locator(".bb-page").evaluate((e) => e.scrollHeight + 180),
        ),
      ),
    });
    await page.screenshot({
      path: `artifacts/bloodbank-journey/${name}-${width}.png`,
      fullPage: true, animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
}
test("blood bank real patient journey: request, ready, issue, cancellation, donor and alert", async ({
  page,
  request,
  browser,
}) => {
  await mkdir("artifacts/bloodbank-journey", { recursive: true });
  expect(
    (
      await request.get(
        "http://localhost:5174/src/presentation/modules/ambulance/UrgentAmbulanceScreen.tsx",
      )
    ).ok(),
    "Vite must compile before creating data",
  ).toBeTruthy();
  const auth = await json(
    await request.post(API + "/patient/auth/login", {
      data: { phone: "8866314762", password: "Vizito@2026" },
    }),
  );
  const token = auth.access_token || auth.token || auth.data?.access_token;
  const ph = { Authorization: `Bearer ${token}` };
  const bh = await partner(request);
  const run = Date.now();
  await json(
    await request.put(API + "/partners/bloodbank/hours/me", {
      headers: bh,
      data: {
        hours: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ].map((day) => ({
          day,
          open_time: "00:00",
          close_time: "23:59",
          is_closed: false,
        })),
      },
    }),
  );
  // Set up only through the authenticated partner APIs; preserve all existing processing charges.
  await json(
    await request.put(API + "/partners/me/location", {
      headers: bh,
      data: {
        latitude: 17.4435,
        longitude: 78.3772,
        address1: "BB-QA Lifeline collection desk",
        address2: "HITEC City, Hyderabad",
        zipcode: "500081",
      },
    }),
  );
  const available = await json(
    await request.get(
      API +
        "/bloodbank/stock/units?component=WHOLE_BLOOD&group=O%2B&status=AVAILABLE",
      { headers: bh },
    ),
  );
  const units: string[] = available
    .filter((u: any) => u.bag_number.startsWith("BB-QA"))
    .slice(0, 5)
    .map((u: any) => u.id);
  for (let i = units.length; i < 5; i++) {
    const u = await json(
      await request.post(API + "/bloodbank/stock/units", {
        headers: bh,
        data: {
          bag_number: `BB-QA-${run}-${i}`,
          component_code: "WHOLE_BLOOD",
          blood_group: "O+",
          collected_at: new Date(Date.now() - 86400000).toISOString(),
          expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
          storage_location: "BB-QA refrigerator",
        },
      }),
    );
    await json(
      await request.post(`${API}/bloodbank/stock/units/${u.id}/release`, {
        headers: bh,
        data: { confirmed: true },
      }),
    );
    units.push(u.id);
  }
  const session = await json(
    await request.post(API + "/bloodbank/centre/donors/sessions", {
      headers: bh,
      data: {
        kind: "CAMP",
        title: `BB-QA Lifeline donation camp ${run}`,
        organizer: "BB-QA Lifeline team",
        venue: "BB-QA Lifeline collection desk, HITEC City",
        starts_at: new Date(Date.now() + 2 * 86400000).toISOString(),
        ends_at: new Date(
          Date.now() + 2 * 86400000 + 4 * 3600000,
        ).toISOString(),
        capacity: 12,
      },
    }),
  );
  await loginAsTestPatient(page, {
    fullName: "Kavya Reddy",
    mobile: "8866314762",
    email: "",
    password: "",
    patientId: "",
    token,
  });
  await page.evaluate(() =>
    sessionStorage.setItem(
      "vizito_search_area",
      JSON.stringify({
        lat: 17.4435,
        lng: 78.3772,
        label: "HITEC City, Hyderabad",
        source: "manual",
        at: Date.now(),
      }),
    ),
  );
  await page.goto("/find-blood");
  await expect(
    page.getByRole("heading", { name: "Lifeline Blood Centre", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "O+", exact: true }).click();
  await page.getByRole("button", { name: "Whole blood", exact: true }).click();
  await expect(page.locator('[aria-label^="O+:"]').first()).toBeVisible();
  await expect(page.getByRole('img',{name:'Blood bag illustration'})).toBeVisible();
  expect((await page.getByRole('img',{name:'Blood bag illustration'}).boundingBox())!.width).toBeGreaterThan(150);
  await expect(page.locator('[aria-label="Blood group"] button')).toHaveText(['A+','A-','B+','B-','O+','O-','AB+','AB-']);
  await expect(page.locator('.bb-stock.bb-selected')).toHaveCount(1);
  await expect(page.locator('.bb-stock.bb-selected')).toContainText('O+');
  await expect(page.locator('.bb-stock:not(.bb-selected).bb-out')).toHaveCount(0);
  await expect(page.getByText('Less than 1 km',{exact:false})).toBeVisible();
  await expect(page.locator('.bb-home .bb-bank-mark')).toBeVisible();
  await expect(page.locator('.bb-urgent-icon')).toBeVisible();
  await expect(page.locator('.bb-donate-card .bb-donate-drop')).toBeVisible();
  const urgent=await page.locator('.bb-urgent').boundingBox();
  const urgentAction=await page.getByRole('link',{name:'Request blood now',exact:true}).boundingBox();
  expect(urgentAction!.width).toBeGreaterThan(urgent!.width*.65);
  expect(urgentAction!.y).toBeGreaterThan((await page.getByRole('heading',{name:'Need blood urgently?'}).boundingBox())!.y);
  await shots(page, "home");
  await page.getByRole("link", { name: "Request blood", exact: true }).click();
  await page
    .getByRole("button", { name: "Family member", exact: true })
    .click();
  await page
    .getByLabel("Family member", { exact: true })
    .selectOption({ label: "Ramesh Reddy (Father)" })
    .catch(async () => {
      const opts = await page
        .getByLabel("Family member", { exact: true })
        .locator("option")
        .allTextContents();
      const text = opts.find((s) => s.includes("Ramesh"));
      expect(text).toBeTruthy();
      await page
        .getByLabel("Family member", { exact: true })
        .selectOption({ label: text! });
    });
  await expect(page.getByLabel("Patient name", { exact: true })).toHaveValue(
    /Ramesh/,
  );
  await page
    .getByLabel("Hospital admitted at")
    .fill("BB-QA admitting hospital");
  await page.getByLabel("Doctor's name").fill("BB-QA treating doctor");
  await page.getByRole("button", { name: "Increase units" }).click();
  await page.getByRole("radio", { name: "Emergency", exact: true }).check();
  await page
    .getByLabel("Emergency reason")
    .fill("BB-QA emergency transfusion walkthrough");
  await page
    .getByLabel("Requisition file")
    .setInputFiles({
      name: "BB-QA-requisition.pdf",
      mimeType: "application/pdf",
      buffer: PDF,
    });
  await expect(
    page.getByText("BB-QA-requisition.pdf", { exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Pay at blood bank/ }).check();
  await expect(page.locator('.bb-note-icon')).toHaveCount(2);
  await expect(page.locator('.bb-requisition-file .bb-file-icon')).toBeVisible();
  await expect(page.locator('[data-file-size]')).toHaveAttribute('data-file-size',String(PDF.length));
  await expect(page.getByRole('button',{name:'Remove requisition',exact:true})).toHaveText('\u00d7');
  await shots(page, "request-details");
  await page.getByRole("button", { name: /Review request/ }).click();
  await shots(page, "request-review");
  await page.getByRole("button", { name: /Submit request/ }).click();
  await expect(
    page.getByRole("heading", { name: "Request submitted" }),
  ).toBeVisible();
  await shots(page, "confirmation");
  const rows = await json(
    await request.get(API + "/bloodbank/requests/mine", { headers: ph }),
  );
  const row = rows.find(
    (r: any) =>
      r.treating_doctor === "BB-QA treating doctor" && r.status === "SUBMITTED",
  );
  expect(row).toBeTruthy();
  expect(row.quantity).toBe(2);
  expect(row.payment_preference).toBe("AT_BANK");
  expect(row.patient_name).toContain("Ramesh");
  const partnerContext = await browser.newContext({ baseURL: 'http://localhost:5173', viewport: { width:1280,height:1000 } });
  const desk = await partnerContext.newPage();
  await loginWithOtp(desk,'9872078255');
  await desk.goto(`/bloodbank-requests?open=${row.id}`);
  await desk.getByLabel('I have checked the uploaded requisition.').check();
  await desk.getByRole('button',{name:'Accept request',exact:true}).click();
  await desk.getByLabel('Sample tube number').fill(`BB-QA-${run}`);
  await desk.getByLabel('Blood group found').selectOption('O+');
  await desk.getByRole('button',{name:/Save.*blood is ready for the patient/}).click();
  await expect(desk.getByRole('button',{name:'Record counter payment'})).toBeVisible();
  await desk.screenshot({path:'artifacts/bloodbank-journey/partner-ready.png',fullPage:true});
  await page.goto(`/blood-requests?open=${row.id}`);
  await expect(
    page.getByRole("heading", { name: "Your blood is ready for pickup" }),
  ).toBeVisible();
  await expect(page.getByLabel("Status timeline")).toContainText(
    "Cross-match done",
  );
  await shots(page, "requests-ready");
  await desk.getByRole('button',{name:'Record counter payment'}).click();
  await desk.getByLabel('Receipt number (optional)').fill(`BB-QA-${run}`);
  await desk.getByRole('button',{name:'Record payment',exact:true}).click();
  await desk.getByRole('button',{name:'Confirm blood issued',exact:true}).click();
  await expect(desk.getByRole('button',{name:'Print issue slip'})).toBeVisible();
  await desk.screenshot({path:'artifacts/bloodbank-journey/partner-issued.png',fullPage:true});
  await partnerContext.close();
  await page.reload();
  await expect(
    page.getByRole("region", { name: "What to do now" }),
  ).toContainText("This request is complete.");
  await shots(page, "requests-issued");
  // Separate real request cancelled through the patient UI.
  const rq = await json(
    await request.post(API + "/bloodbank/requisitions/upload", {
      headers: ph,
      multipart: {
        file: {
          name: "BB-QA-cancel.pdf",
          mimeType: "application/pdf",
          buffer: PDF,
        },
      },
    }),
  );
  const cancel = await json(
    await request.post(API + "/bloodbank/requests", {
      headers: ph,
      data: {
        bloodbank_partner_id: BANK,
        requisition_id: rq.id,
        requested_group: "O+",
        component_code: "WHOLE_BLOOD",
        quantity: 1,
        urgency: "URGENT",
        admitted_hospital: "BB-QA cancellation hospital",
        treating_doctor: "BB-QA cancellation doctor",
        payment_preference: "AT_BANK",
      },
    }),
  );
  await page.goto(`/blood-requests?open=${cancel.id}`);
  await page
    .getByRole("button", { name: /Cancel request|I don.t need this blood/ })
    .click();
  await page.getByLabel("Reason for cancelling").fill("BB-QA no longer needed");
  await page.getByRole("button", { name: "Yes, cancel" }).click();
  await expect(
    page.getByText("Request cancelled", { exact: true }),
  ).toBeVisible();
  await shots(page, "requests-cancelled");
  await page.goto("/donate-blood");
  await expect(
    page.getByRole("heading", { name: "Am I eligible to donate?" }),
  ).toBeVisible();
  await expect.poll(async()=>await page.getByText(/Registered as a donor/).isVisible() || await page.getByRole('button',{name:'Register now',exact:true}).isVisible()).toBe(true);
  const existing = page.getByRole('region',{name:'Your booking',exact:true});
  if (await existing.isVisible() && (await existing.innerText()).includes('BB-QA')) {
    await existing.getByRole('button',{name:'Cancel booking'}).click();
    await expect(existing).toHaveCount(0);
  }
  await shots(page, "donate");
  for (const check of await page.locator(".bb-checklist input").all())
    await check.check();
  if (
    await page
      .getByRole("button", { name: "Register now", exact: true })
      .isVisible()
  ) {
    await page.getByLabel(/I agree to register/).check();
    await page
      .getByRole("button", { name: "Register now", exact: true })
      .click();
  }
  await expect(page.getByText(/Registered as a donor/)).toBeVisible();
  const viewAll=page.getByRole('button',{name:'View all',exact:true});
  if(await viewAll.isVisible())await viewAll.click();
  const camp = page.getByRole("article", { name: session.title });
  await expect(camp).toBeVisible();
  await camp.getByRole("button", { name: "Book slot" }).click();
  await expect(
    page.getByRole("region", { name: "Your booking", exact: true }),
  ).toContainText(session.title);
  await shots(page, "donor-booking");
  const me = await json(
    await request.get(API + "/bloodbank/donor/me", { headers: ph }),
  );
  if (me.donations?.length) {
    await page
      .getByRole("button", { name: "Donation certificate" })
      .first()
      .click();
    await expect(
      page.getByRole("dialog", { name: "Blood donation certificate" }),
    ).toBeVisible();
    await shots(page, "certificate");
  }
  await page.goto("/find-blood");
  await page.getByRole("button", { name: "AB-", exact: true }).click();
  const alertButton = page.getByRole("button", {
    name: "Notify me",
    exact: true,
  });
  if (await alertButton.isVisible()) await alertButton.click();
  await expect(
    page.getByRole("button", { name: "Cancel alert" }),
  ).toBeVisible();
  await shots(page, "out-of-stock-alert");
  await writeFile(
    "artifacts/bloodbank-journey/evidence.json",
    JSON.stringify(
      {
        request_id: row.id,
        request_number: row.request_number,
        cancel_id: cancel.id,
        session_id: session.id,
        donor_registered: me.registered,
        donations: me.donations?.length || 0,
        units_available_for_walk: units.length,
        partner_transitions: "real partner UI: verified requisition, cross-matched, recorded counter payment, issued",
        prices_changed: false,
      },
      null,
      2,
    ),
  );
});

test('blood bank Other recipient, planned date, upload removal, rejection and retry states', async ({page,request})=>{
 const auth=await json(await request.post(API+'/patient/auth/login',{data:{phone:'8866314762',password:'Vizito@2026'}}));const token=auth.access_token||auth.token||auth.data?.access_token;const ph={Authorization:`Bearer ${token}`};const bh=await partner(request);
 await loginAsTestPatient(page,{fullName:'Kavya Reddy',mobile:'8866314762',email:'',password:'',patientId:'',token});
 await page.goto(`/request-blood?bank=${BANK}&group=O%2B&component=WHOLE_BLOOD`);
 await expect(page.getByRole('heading',{name:'Lifeline Blood Centre',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Other',exact:true}).click();await page.getByLabel('Patient name',{exact:true}).fill('BB-QA other recipient');await page.getByLabel('Age',{exact:true}).fill('34');await page.getByLabel('Gender',{exact:true}).selectOption('MALE');await page.getByLabel('Hospital admitted at').fill('BB-QA planned hospital');await page.getByLabel("Doctor's name").fill('BB-QA planned doctor');await page.getByRole('radio',{name:'Planned',exact:true}).check();await page.getByLabel('Planned date').fill(new Date(Date.now()+86400000).toLocaleDateString('en-CA'));
 await page.getByLabel('Requisition file').setInputFiles({name:'BB-QA-invalid.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});await expect(page.getByRole('alert')).toContainText('PDF, JPG or PNG');
 await page.getByLabel('Requisition file').setInputFiles({name:'BB-QA-planned.pdf',mimeType:'application/pdf',buffer:PDF});await expect(page.getByRole('button',{name:'Remove requisition'})).toBeVisible();await page.getByRole('button',{name:'Remove requisition'}).click();await expect(page.getByRole('button',{name:/Review request/})).toBeDisabled();await page.getByLabel('Requisition file').setInputFiles({name:'BB-QA-planned.pdf',mimeType:'application/pdf',buffer:PDF});await page.getByRole('radio',{name:/Pay at blood bank/}).check();await shots(page,'other-planned');await page.getByRole('button',{name:/Review request/}).click();await page.getByRole('button',{name:/Submit request/}).click();const href=await page.getByRole('link',{name:'View my request'}).getAttribute('href');const id=new URL(href!,'http://localhost').searchParams.get('open');const detail=await json(await request.get(`${API}/bloodbank/requests/mine/${id}`,{headers:ph}));expect(detail.patient_name).toBe('BB-QA other recipient');expect(detail.planned_at).toBeTruthy();expect(detail.admitted_hospital).toBe('BB-QA planned hospital');
 await json(await request.post(`${API}/bloodbank/centre/requests/${id}/reject`,{headers:bh,data:{reason:'BB-QA requisition details incomplete'}}));await page.goto(`/blood-requests?open=${id}`);await expect(page.getByRole('region',{name:'What to do now'})).toContainText('BB-QA requisition details incomplete');await shots(page,'requisition-rejected');
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);await page.route('**/bloodbank/stock-grid?**',async route=>{await gate;await route.continue();});await page.goto('/find-blood');await expect(page.getByRole('status')).toContainText('Checking blood availability');await shots(page,'loading');release();await expect(page.getByRole('heading',{name:'Lifeline Blood Centre',exact:true})).toBeVisible();await page.unrouteAll({behavior:'wait'});
 await page.route('**/bloodbank/stock-grid?**',route=>route.abort());await page.goto('/find-blood');await expect(page.getByRole('alert')).toBeVisible();await shots(page,'error');await page.unrouteAll({behavior:'wait'});await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByRole('heading',{name:'Lifeline Blood Centre',exact:true})).toBeVisible();const sorted=page.waitForResponse(r=>r.url().includes('/bloodbank/stock-grid')&&r.url().includes('sort=recently_updated'));await page.getByLabel('Sort blood banks').selectOption('recently_updated');expect((await sorted).ok()).toBe(true);await shots(page,'sorted');
});
