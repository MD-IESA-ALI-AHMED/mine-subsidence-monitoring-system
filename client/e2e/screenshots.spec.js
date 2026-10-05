import { expect, test } from '@playwright/test';
import { openDashboard, rail } from './helpers.js';

// Visual review set (brief 13.4): saved to docs/screenshots/ at 1440 × 900.
const OUT = '../docs/screenshots';

for (const theme of ['dark', 'light']) {
  test.describe(`${theme} theme`, () => {
    test.use({ colorScheme: theme });

    test(`login and overview (${theme})`, async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
      await page.screenshot({ path: `${OUT}/login-${theme}.png` });

      await openDashboard(page);
      await expect(page.locator('canvas')).toBeVisible();
      await page.waitForTimeout(4000); // let the scene and charts settle
      await page.screenshot({ path: `${OUT}/overview-${theme}.png` });

      await rail(page).getByRole('button', { name: /Z-OW1/ }).first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${OUT}/overview-zone-${theme}.png` });
    });
  });
}

test('alerts and network pages', async ({ page }) => {
  await openDashboard(page);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /Alerts/ }).click();
  const table = page.getByRole('table', { name: 'Alerts' });
  await expect(table).toBeVisible();
  await table.locator('tbody tr').first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/alerts.png` });

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Network' }).click();
  await expect(page.getByRole('img', { name: 'Mesh tree' })).toBeVisible();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/network.png` });
});
