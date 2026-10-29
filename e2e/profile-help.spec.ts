import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { loginAsTestPatient, type TestPatient } from "./helpers/testAccount";
const API = "http://localhost:3000",
  ART = "artifacts/profile-help";
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type /Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);
async function json(r: any) {
  expect(r.ok(), `${r.status()} ${await r.text()}`).toBeTruthy();
  return r.json();
}
async function login(request: APIRequestContext) {
  const a = await json(
    await request.post(API + "/patient/auth/login", {
      data: { phone: "8866314762", password: "Vizito@2026" },
    }),
  );
  const token = a.access_token || a.token;
  return {
    token,
    headers: { Authorization: `Bearer ${token}` },
    patient: {
      fullName: "Kavya Reddy",
      mobile: "8866314762",
      email: "",
      password: "",
      patientId: "",
      token,
    },
  };
}
async function shots(page: Page, name: string) {
  await mkdir(ART, { recursive: true });
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    if (width === 390)
      await expect
        .poll(
          async () =>
            (await page
              .locator('aside[aria-label="Main navigation"]')
              .boundingBox())!.x,
        )
        .toBeLessThan(-200);
    await expect(page.locator(".ph-page")).toBeVisible();
    for (const loc of [page.locator(".ph-page"), page.locator(".ph-dialog")])
      if (await loc.count())
        expect(
          await loc.first().evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
          name + " overflow",
        ).toBe(true);
    const height = await page
      .locator(".ph-page")
      .evaluate((e) => e.scrollHeight + 200);
    const modalHeight = (await page.locator(".ph-dialog").count())
      ? await page.locator(".ph-dialog").evaluate((e) => e.scrollHeight + 200)
      : 0;
    await page.setViewportSize({
      width,
      height: Math.min(6000, Math.max(1000, height, modalHeight)),
    });
    await page.screenshot({
      path: `${ART}/${name}-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
}
function healthBody(h: any) {
  return {
    blood_group: h.blood_group || "",
    height_cm: h.height_cm,
    weight_kg: h.weight_kg,
    allergies: h.allergies,
    no_known_allergies: h.no_known_allergies,
    conditions: h.conditions,
    medications: h.medications,
    emergency_contact_name: h.emergency_contact?.name || "",
    emergency_contact_relation: h.emergency_contact?.relation || "",
    emergency_contact_phone: h.emergency_contact?.phone || "",
  };
}

test("profile and help show real loading, network errors, retry and validation", async ({
  page,
  request,
}) => {
  const a = await login(request);
  await loginAsTestPatient(page, a.patient);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/patients/me", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/profile");
  await expect(page.getByText("Loading profile…")).toBeVisible();
  await shots(page, "profile-loading");
  release();
  await expect(
    page.getByRole("region", { name: "Personal details", exact: true }),
  ).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });
  await page.route("**/patients/me", (route) => route.abort("failed"));
  await page.reload();
  await expect(page.getByRole("alert")).toBeVisible();
  await shots(page, "profile-error");
  await page.unroute("**/patients/me");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Personal details", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit medical basics", exact: true })
    .click();
  await page.getByLabel("Height (cm)", { exact: true }).fill("-1");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  expect(
    await page
      .getByLabel("Height (cm)", { exact: true })
      .evaluate((e: HTMLInputElement) => e.validity.valid),
  ).toBe(false);
  await shots(page, "medical-validation");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.route("**/support-tickets/mine/page?**", (route) =>
    route.abort("failed"),
  );
  await page.goto("/help");
  await expect(page.getByRole("alert")).toBeVisible();
  await shots(page, "help-error");
  await page.unroute("**/support-tickets/mine/page?**");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.goto("/help?view=raise");
  await page
    .getByRole("button", { name: "Submit ticket", exact: true })
    .click();
  await expect(page.getByLabel("Ticket subject")).toHaveValue("");
  expect(
    await page
      .getByLabel("Ticket subject")
      .evaluate((e: HTMLInputElement) => e.validity.valid),
  ).toBe(false);
  await page.goto("/help?view=tickets");
  await page
    .getByRole("searchbox", { name: "Search tickets" })
    .fill("PH-QA-no-such-ticket-xyz");
  await expect(page.locator(".ph-ticket")).toHaveCount(0);
  await expect(page.getByText("No tickets found.")).toBeVisible();
  await shots(page, "tickets-empty");
});

test("profile personal, medical, contact and address edits persist and Kavya is restored", async ({
  page,
  request,
}) => {
  const a = await login(request),
    headers = a.headers;
  const p = (await json(await request.get(API + "/patients/me", { headers })))
    .data;
  const health = await json(
    await request.get(API + "/patients/me/health-profile", { headers }),
  );
  const originalIds = new Set(p.addresses.map((x: any) => x.addressId));
  const defaultId = p.addresses.find((x: any) => x.isDefault)?.addressId;
  await mkdir(ART, { recursive: true });
  await writeFile(
    `${ART}/kavya-before.json`,
    JSON.stringify({ profile: p, health }, null, 2),
  );
  try {
    await loginAsTestPatient(page, a.patient);
    await page.goto("/profile");
    await expect(
      page.getByRole("region", { name: "Personal details", exact: true }),
    ).toContainText(p.fullName);
    await shots(page, "profile");
    await page
      .getByRole("button", { name: "Edit personal details", exact: true })
      .click();
    await page.getByLabel("Full name", { exact: true }).fill("PH-QA Kavya");
    await shots(page, "personal-edit");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Personal details", exact: true }),
    ).toContainText("PH-QA Kavya");
    await page
      .getByRole("button", { name: "Edit medical basics", exact: true })
      .click();
    await page.getByLabel("Height (cm)", { exact: true }).fill("163");
    await page.getByLabel("Weight (kg)", { exact: true }).fill("59");
    await page.getByLabel("Add allergy", { exact: true }).fill("PH-QA allergy");
    await page
      .getByRole("button", { name: "Add allergy", exact: true })
      .click();
    await page
      .getByLabel("Add condition", { exact: true })
      .fill("PH-QA condition");
    await page
      .getByRole("button", { name: "Add condition", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add medicine", exact: true })
      .click();
    const inputs = page.locator('input[aria-label^="Medicine name "]');
    const n = await inputs.count();
    await page
      .getByLabel(`Medicine name ${n}`, { exact: true })
      .fill("PH-QA medicine");
    await page.getByLabel(`Dose ${n}`, { exact: true }).fill("PH-QA dose");
    await page
      .getByLabel(`Frequency ${n}`, { exact: true })
      .fill("PH-QA twice daily");
    await shots(page, "medical-edit");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Medical basics", exact: true }),
    ).toContainText("PH-QA twice daily");
    await page
      .getByRole("button", { name: "Edit emergency contact", exact: true })
      .click();
    await expect(page.getByText(/Ramesh Reddy \(Father\)/)).toBeVisible();
    await shots(page, "emergency-family");
    await page.getByRole("tab", { name: "Add new contact" }).click();
    await page.getByLabel("Emergency contact name").fill("PH-QA Contact");
    await page.getByLabel("Emergency contact relation").fill("PH-QA relation");
    await page.getByLabel("Emergency contact phone").fill("9876543210");
    await shots(page, "emergency-new");
    await page.getByRole("button", { name: "Save contact" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Emergency contact", exact: true }),
    ).toContainText("PH-QA Contact");
    await page
      .getByRole("button", { name: "Change email", exact: true })
      .click();
    await shots(page, "email-change-start");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .getByRole("button", { name: "Add address", exact: true })
      .click();
    await page.getByRole("radio", { name: "Other", exact: true }).click();
    await page
      .getByLabel("Address label", { exact: true })
      .fill("PH-QA address");
    await page
      .getByLabel("House / flat no., building", { exact: true })
      .fill("PH-QA Flat 12");
    await page
      .getByLabel("Street / area", { exact: true })
      .fill("PH-QA HITEC City");
    await page.getByLabel("Landmark", { exact: true }).fill("PH-QA landmark");
    await page.getByLabel("PIN code", { exact: true }).fill("500081");
    await page.getByLabel("City", { exact: true }).fill("Hyderabad");
    await page.getByLabel("State", { exact: true }).selectOption("Telangana");
    await page
      .getByLabel("Person to call on arrival", { exact: true })
      .fill("Kavya Reddy");
    await page
      .context()
      .grantPermissions(["geolocation"], { origin: "http://localhost:5174" });
    await page
      .context()
      .setGeolocation({ latitude: 17.4435, longitude: 78.3772 });
    await page
      .getByRole("button", { name: "Choose location on map", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Allow location access", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Apply location", exact: true })
      .click();
    await page.getByLabel("Use as my default address").check();
    await shots(page, "address-add");
    await page
      .getByRole("button", { name: "Save address", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Add address", exact: true }),
    ).toHaveCount(0);
    let current = (
      await json(await request.get(API + "/patients/me", { headers }))
    ).data.addresses;
    const added = current.find(
      (x: any) => x.label === "PH-QA address" && !originalIds.has(x.addressId),
    );
    expect(added).toBeTruthy();
    expect(added.isDefault).toBe(true);
    expect(Number(added.latitude)).toBeCloseTo(17.4435, 4);
    const card = page.locator(`[data-address-id="${added.addressId}"]`);
    await card.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .getByLabel("House / flat no., building", { exact: true })
      .fill("PH-QA Flat 34");
    await shots(page, "address-edit");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(
      page.locator(`[data-address-id="${added.addressId}"]`),
    ).toContainText("PH-QA Flat 34");
    await page.goto("/settings");
    await expect(
      page.getByRole("region", { name: "Notification preferences" }),
    ).toContainText("On · always on");
    await shots(page, "notifications");
    await page.reload();
    await expect(
      page.getByText("SMS and email alerts are coming soon."),
    ).toBeVisible();
    await page.goto("/profile");
    await page
      .getByRole("button", { name: "Logged-in devices", exact: false })
      .click();
    await expect(page.getByText("This device", { exact: true })).toBeVisible();
    await shots(page, "devices");
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page
      .getByRole("button", { name: "Download my data", exact: false })
      .click();
    const download = page.waitForEvent("download");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Download my data", exact: true })
      .click();
    const file = await download;
    await file.saveAs(`${ART}/PH-QA-kavya-export.json`);
    await expect(
      page.getByText("Your data file has been downloaded."),
    ).toBeVisible();
    await shots(page, "data-export");
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page
      .getByRole("button", { name: "Delete account", exact: false })
      .click();
    await expect(
      page.getByText("Account deletion is currently unavailable"),
    ).toBeVisible();
    await shots(page, "delete-blocked");
  } finally {
    await json(
      await request.patch(API + "/patients/profile", {
        headers,
        data: {
          fullName: p.fullName,
          dateOfBirth: p.dateOfBirth || "",
          gender: p.gender || undefined,
        },
      }),
    );
    await json(
      await request.put(API + "/patients/me/health-profile", {
        headers,
        data: healthBody(health),
      }),
    );
    const current = (
      await json(await request.get(API + "/patients/me", { headers }))
    ).data.addresses;
    if (defaultId)
      await json(
        await request.patch(`${API}/patients/address/${defaultId}/default`, {
          headers,
          data: {},
        }),
      );
    for (const x of current)
      if (!originalIds.has(x.addressId) && x.label?.startsWith("PH-QA")) {
        const r = await request.delete(
          `${API}/patients/address/${x.addressId}`,
          { headers },
        );
        expect(r.ok()).toBe(true);
      }
    const restored = (
      await json(await request.get(API + "/patients/me", { headers }))
    ).data;
    expect(restored.fullName).toBe(p.fullName);
    expect(restored.phone).toBe(p.phone);
    expect(restored.email).toBe(p.email);
    expect(restored.addresses.map((x: any) => x.addressId).sort()).toEqual(
      p.addresses.map((x: any) => x.addressId).sort(),
    );
  }
});

test("help search, topics, articles, saved vote, real linked ticket, thread reply and support resolution", async ({
  page,
  request,
}) => {
  const a = await login(request);
  await loginAsTestPatient(page, a.patient);
  await page.goto("/help");
  await expect(
    page.getByRole("heading", { name: "Browse help topics" }),
  ).toBeVisible();
  await shots(page, "help");
  await page
    .getByRole("button", { name: /Payments & refunds Payment methods/ })
    .click();
  await shots(page, "help-topic");
  await page
    .getByRole("button", { name: "How do I get a refund?", exact: true })
    .click();
  await page.getByRole("button", { name: "Read article & feedback →" }).click();
  await shots(page, "help-article");
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(
    page.getByText("Thank you. Your feedback has been saved."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Yes", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/help");
  await page.getByRole("searchbox", { name: "Search help" }).fill("refund");
  await expect(
    page.getByRole("heading", { name: "Search results" }),
  ).toBeVisible();
  await shots(page, "help-search");
  await page
    .getByRole("searchbox", { name: "Search help" })
    .fill("PH-QA-no-result-xyz");
  await expect(
    page.getByRole("heading", { name: "No results found" }),
  ).toBeVisible();
  await shots(page, "help-no-results");
  await page.goto("/help?view=raise");
  await page.getByLabel("Ticket category").selectOption("Payment & refund");
  const options = page.getByLabel("Related booking").locator("option");
  await expect.poll(async () => options.count()).toBeGreaterThan(1);
  const reference = await options.nth(1).getAttribute("value");
  await page.getByLabel("Related booking").selectOption(reference!);
  const subject = `PH-QA support walk ${Date.now()}`;
  await page.getByLabel("Ticket subject").fill(subject);
  await page
    .getByLabel("Ticket description")
    .fill(
      "PH-QA please check this real booking and confirm the payment details.",
    );
  await page
    .getByLabel("Ticket attachment")
    .setInputFiles({
      name: "PH-QA-support.pdf",
      mimeType: "application/pdf",
      buffer: PDF,
    });
  await page.getByRole("radio", { name: /Phone \(/ }).check();
  await shots(page, "ticket-raise");
  await page
    .getByRole("button", { name: "Submit ticket", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Ticket conversation" }),
  ).toContainText("PH-QA please check");
  const id = new URL(page.url()).searchParams.get("ticket");
  expect(id).toBeTruthy();
  await page
    .getByLabel("Ticket reply")
    .fill("PH-QA additional information from the patient.");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(
    page.getByRole("region", { name: "Ticket conversation" }),
  ).toContainText("PH-QA additional information");
  await shots(page, "ticket-thread");
  const ops = await json(
    await request.post(API + "/auth/ops/login", {
      data: { email: "ops.support@vizito.test", password: "OpsSupport123!" },
    }),
  );
  await json(
    await request.post(`${API}/support-tickets/admin/${id}/reply`, {
      headers: { Authorization: `Bearer ${ops.access_token}` },
      data: {
        body: "PH-QA reviewed the booking and resolved this support test.",
        status: "RESOLVED",
      },
    }),
  );
  await page.reload();
  await expect(page.getByLabel("Ticket status timeline")).toContainText(
    "Resolved",
  );
  await expect(
    page.getByRole("region", { name: "Ticket conversation" }),
  ).toContainText("PH-QA reviewed");
  await shots(page, "ticket-resolved");
  await page.getByRole("button", { name: "← Back to all tickets" }).click();
  await shots(page, "tickets-all");
  await page.getByRole("tab", { name: /Resolved \(/ }).click();
  await page.getByRole("searchbox", { name: "Search tickets" }).fill(subject);
  await expect(page.locator(".ph-ticket")).toHaveCount(1);
  await writeFile(
    `${ART}/support-evidence.json`,
    JSON.stringify(
      {
        ticket_id: id,
        booking_reference: reference,
        subject,
        resolution:
          "POST /support-tickets/admin/:id/reply as ops support admin",
        attachment_bytes: PDF.length,
      },
      null,
      2,
    ),
  );
});

test("PH-QA account password, mobile and email OTP, export and account deletion", async ({
  page,
  request,
}) => {
  const stamp = String(Date.now());
  const mobile = "7" + stamp.slice(-9),
    newMobile = "8" + stamp.slice(-9);
  const email = `ph-qa-${stamp}@vizito.test`,
    password = "PhQaOriginal@2026";
  const sent = await json(
    await request.post(API + "/patient/auth/register/send-otp", {
      data: { phone: mobile },
    }),
  );
  const verified = await json(
    await request.post(API + "/patient/auth/register/verify-otp", {
      data: { phone: mobile, otp: sent.dev_otp },
    }),
  );
  const registered = await json(
    await request.post(API + "/patient/auth/register", {
      data: {
        full_name: "PH-QA Patient",
        phone: mobile,
        email,
        password,
        registration_token: verified.registration_token,
      },
    }),
  );
  const patient: TestPatient = {
    fullName: "PH-QA Patient",
    mobile,
    email,
    password,
    patientId: registered.patient_id || "",
    token: registered.access_token || registered.token,
  };
  await loginAsTestPatient(page, patient);
  await page.goto("/profile");
  await page
    .getByRole("button", { name: "Change password", exact: false })
    .click();
  await page.getByLabel("Current password", { exact: true }).fill(password);
  await page
    .getByLabel("New password", { exact: true })
    .fill("PhQaChanged@2026");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("PhQaChanged@2026");
  await shots(page, "password-change");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Change mobile number", exact: true })
    .click();
  await page.getByLabel("New mobile number").fill(newMobile);
  await shots(page, "mobile-change-start");
  await page.getByRole("button", { name: "Send OTP", exact: true }).click();
  await expect(page.locator("[data-dev-otp]")).toBeVisible();
  const otp = await page.locator("[data-dev-otp]").innerText();
  await page.getByLabel("Verification code").fill(otp);
  await shots(page, "mobile-change-otp");
  await page.getByRole("button", { name: "Verify & continue" }).click();
  await expect(
    page.getByText("Your mobile number has been updated and verified."),
  ).toBeVisible();
  await shots(page, "mobile-change-complete");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Change email", exact: true }).click();
  await page
    .getByLabel("New email", { exact: true })
    .fill(`ph-qa-updated-${stamp}@vizito.test`);
  await page.getByRole("button", { name: "Send OTP", exact: true }).click();
  await expect(page.locator("[data-dev-otp]")).toBeVisible();
  await page
    .getByLabel("Verification code")
    .fill(await page.locator("[data-dev-otp]").innerText());
  await shots(page, "email-change-otp");
  await page.getByRole("button", { name: "Verify & continue" }).click();
  await expect(
    page.getByText("Your email has been updated and verified."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const loginResult = await json(
    await request.post(API + "/patient/auth/login", {
      data: { phone: newMobile, password: "PhQaChanged@2026" },
    }),
  );
  expect(loginResult.access_token).toBeTruthy();
  await page
    .getByRole("button", { name: "Delete account", exact: false })
    .click();
  await expect(page.getByLabel("Reason for deleting account")).toBeVisible();
  await page.getByLabel("Reason for deleting account").selectOption("OTHER");
  await page
    .getByRole("dialog")
    .locator("textarea")
    .fill("PH-QA delete this disposable acceptance-test account.");
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await shots(page, "delete-confirm");
  await page.getByRole("button", { name: "Send deletion OTP" }).click();
  await expect(page.locator("[data-dev-otp]")).toBeVisible();
  await page
    .getByLabel("Deletion OTP")
    .fill(await page.locator("[data-dev-otp]").innerText());
  await shots(page, "delete-otp");
  await page.getByRole("button", { name: "Permanently close account" }).click();
  await expect(
    page.getByText("Your account is closed. You are signed out everywhere."),
  ).toBeVisible();
  await page.waitForURL(/auth\/login/);
  const denied = await request.post(API + "/patient/auth/login", {
    data: { phone: newMobile, password: "PhQaChanged@2026" },
  });
  expect(denied.ok()).toBe(false);
  await writeFile(
    `${ART}/account-evidence.json`,
    JSON.stringify(
      {
        prefix: "PH-QA",
        phone_changed: true,
        email_changed: true,
        password_changed: true,
        deleted: true,
        login_after_deletion: denied.status(),
      },
      null,
      2,
    ),
  );
});
