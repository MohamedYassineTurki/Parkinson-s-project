import { expect, test } from "@playwright/test";

test("doctor invite, patient onboarding, sensor recording, and dashboard flow", async ({ page }) => {
  const suffix = Date.now();
  const doctorEmail = `doctor-${suffix}@example.test`;
  const patientEmail = `patient-${suffix}@example.test`;
  const password = "StrongPass123!";

  await page.addInitScript(() => {
    if (!("DeviceMotionEvent" in window)) {
      Object.defineProperty(window, "DeviceMotionEvent", { value: class extends Event {} });
    }
  });

  await page.goto("/auth/sign-up");
  await page.getByRole("button", { name: /I am a Doctor/ }).click();
  await page.getByLabel("Full name").fill("Amira Haddad");
  await page.getByLabel("Email").fill(doctorEmail);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create doctor account" }).click();
  await expect(page).toHaveURL(/\/doctor\/onboarding/);
  await page.getByLabel("First name").fill("Amira");
  await page.getByLabel("Last name").fill("Haddad");
  await page.getByLabel("Specialty").fill("Neurology");
  await page.getByLabel("Clinic or hospital").fill("Central Clinic");
  await page.getByRole("button", { name: "Save doctor profile" }).click();
  await expect(page.getByText("Doctor onboarding saved.")).toBeVisible();
  const inviteCode = (await page.locator("p.font-mono").textContent())?.trim();
  expect(inviteCode).toMatch(/^DR-[A-Z0-9]{8}$/);
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/);

  await page.goto("/auth/sign-up");
  await page.getByRole("button", { name: /I am a Patient/ }).click();
  await page.getByLabel("Full name").fill("Yasmine Ben Ali");
  await page.getByLabel("Email").fill(patientEmail);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create patient account" }).click();
  await expect(page).toHaveURL(/\/patient\/onboarding/);
  await page.getByLabel("First name").fill("Yasmine");
  await page.getByLabel("Last name").fill("Ben Ali");
  await page.getByLabel("Date of birth").fill("1964-05-12");
  await page.getByLabel("Medication name").fill("Levodopa");
  await page.getByLabel("Dose").fill("100 mg");
  await page.getByLabel("Doctor invite code").fill(inviteCode!);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByRole("heading", { name: "Edit profile" })).toBeVisible();

  await page.goto("/patient/medications");
  const medicationCard = page.locator("article").filter({ hasText: "Levodopa" });
  await medicationCard.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Dose").fill("125 mg");
  await page.getByRole("button", { name: "Save medication" }).click();
  await expect(page.getByText("Medication updated.")).toBeVisible();
  await medicationCard.getByRole("button", { name: "Archive" }).click();
  await expect(medicationCard.getByText("Archived", { exact: true })).toBeVisible();
  await medicationCard.getByRole("button", { name: "Restore" }).click();
  await expect(medicationCard.getByText("Active", { exact: true })).toBeVisible();

  await page.goto("/patient/test");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "I’m ready" }).click();
  await page.getByRole("button", { name: "Start 10-second recording" }).click();
  await page.evaluate(() => {
    let count = 0;
    const timer = window.setInterval(() => {
      const event = new Event("devicemotion");
      const signal = Math.sin((2 * Math.PI * 5 * count) / 50);
      Object.defineProperty(event, "accelerationIncludingGravity", {
        value: { x: signal, y: signal * 0.7, z: 9.81 + signal * 0.4 },
      });
      window.dispatchEvent(event);
      count += 1;
      if (count >= 500) window.clearInterval(timer);
    }, 20);
  });
  await expect(page.getByRole("heading", { name: "Before test saved" })).toBeVisible({ timeout: 20_000 });

  await page.goto("/patient/test");
  await page.getByRole("button", { name: "After medication" }).click();
  await expect(page.getByText(/Before test found for Dose 1 today/)).toBeVisible();
  await page.getByText("Optional dose details").click();
  await page.getByLabel("Time medication was taken").fill("08:00");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "I’m ready" }).click();
  await page.getByRole("button", { name: "Start 10-second recording" }).click();
  await page.evaluate(() => {
    let count = 0;
    const timer = window.setInterval(() => {
      const event = new Event("devicemotion");
      const signal = 0.4 * Math.sin((2 * Math.PI * 5 * count) / 50);
      Object.defineProperty(event, "accelerationIncludingGravity", {
        value: { x: signal, y: signal * 0.7, z: 9.81 + signal * 0.4 },
      });
      window.dispatchEvent(event);
      count += 1;
      if (count >= 500) window.clearInterval(timer);
    }, 20);
  });
  await expect(page.getByRole("heading", { name: "Your tests were linked" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/lower movement/i).first()).toBeVisible();
  await page.getByRole("link", { name: "View personal trend" }).click();
  await expect(page).toHaveURL(/\/patient\/history/);
  await page.goto("/patient");
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/);

  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill(doctorEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/doctor$/);
  await expect(page.getByText("Yasmine Ben Ali")).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByRole("link", { name: "View" })).toBeVisible();
  await page.goto("/patient");
  await expect(page).toHaveURL(/\/forbidden/);
});
