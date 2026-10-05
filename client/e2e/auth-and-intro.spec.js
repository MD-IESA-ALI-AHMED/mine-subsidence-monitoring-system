import { expect, test } from '@playwright/test';
import { openDashboard } from './helpers.js';

test('the root URL opens the public Overview without sign-in', async ({ page }) => {
  await openDashboard(page);
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(page.getByText('Simulated data')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Account/ })).toHaveCount(0);
});

test('the opening animation plays once and can be skipped', async ({ page }) => {
  // Slow the animation clock 10× (test only) so the running state can be observed reliably.
  await page.addInitScript(() => {
    const real = performance.now.bind(performance);
    const t0 = real();
    performance.now = () => t0 + (real() - t0) / 10;
  });
  await openDashboard(page, { intro: true });
  const scene = page.locator('[data-intro-t]');
  // Running: the element carries the animation time in seconds.
  await expect(scene).toHaveAttribute('data-intro-t', /^\d/);
  await page.keyboard.press('Escape');
  await expect(scene).toHaveAttribute('data-intro-t', 'done');
  // Once per browser session: a reload goes straight to the dashboard.
  await page.reload();
  await expect(page.locator('[data-intro-t]')).toHaveAttribute('data-intro-t', 'done');
});

test('legacy sign-in URL returns to the root dashboard', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Moving zones' })).toBeVisible();
});
