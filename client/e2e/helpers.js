import { expect } from '@playwright/test';

/** Marks the opening animation as already played for this browser session. */
export async function skipIntro(page) {
  await page.addInitScript(() => sessionStorage.setItem('introPlayed', '1'));
}

/** Opens the public dashboard and waits for the Overview to be usable. */
export async function openDashboard(page, { intro = false } = {}) {
  if (!intro) await skipIntro(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Moving zones' })).toBeVisible();
}

/** The Overview's left rail, where zones and the alert feed live. */
export const rail = (page) => page.getByRole('complementary', { name: 'Moving zones and alerts' });
export const details = (page) => page.getByRole('complementary', { name: 'Details' });
