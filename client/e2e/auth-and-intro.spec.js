import { expect, test } from '@playwright/test';
import { DEMO_EMAIL, signIn } from './helpers.js';

test('sign-in rejects a wrong password with a generic message', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(DEMO_EMAIL);
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect');
});

test('signs in and lands on the Overview', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(page.getByText('Simulated data')).toBeVisible();
});

test('the opening animation plays once and can be skipped', async ({ page }) => {
  // Slow the animation clock 10× (test only) so the running state can be observed reliably.
  await page.addInitScript(() => {
    const real = performance.now.bind(performance);
    const t0 = real();
    performance.now = () => t0 + (real() - t0) / 10;
  });
  await signIn(page, { intro: true });
  const scene = page.locator('[data-intro-t]');
  // Running: the element carries the animation time in seconds.
  await expect(scene).toHaveAttribute('data-intro-t', /^\d/);
  await page.keyboard.press('Escape');
  await expect(scene).toHaveAttribute('data-intro-t', 'done');
  // Once per browser session: a reload goes straight to the dashboard.
  await page.reload();
  await expect(page.locator('[data-intro-t]')).toHaveAttribute('data-intro-t', 'done');
});

test('signing out returns to the sign-in page', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: /^Account/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
});
