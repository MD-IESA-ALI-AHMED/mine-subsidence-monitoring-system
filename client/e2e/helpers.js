import { expect } from '@playwright/test';
import { E2E_PASSWORD } from '../playwright.config.js';

export const DEMO_EMAIL = 'minesubsidence@sih';

/** Marks the opening animation as already played for this browser session. */
export async function skipIntro(page) {
  await page.addInitScript(() => sessionStorage.setItem('introPlayed', '1'));
}

/** Signs in through the form and waits for the Overview to be usable. */
export async function signIn(page, { intro = false } = {}) {
  if (!intro) await skipIntro(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Email').fill(DEMO_EMAIL);
  await page.getByLabel('Password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Moving zones' })).toBeVisible();
}

/** The Overview's left rail, where zones and the alert feed live. */
export const rail = (page) => page.getByRole('complementary', { name: 'Moving zones and alerts' });
export const details = (page) => page.getByRole('complementary', { name: 'Details' });
