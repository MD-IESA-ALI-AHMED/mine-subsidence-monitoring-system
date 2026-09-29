import { expect, test } from '@playwright/test';
import { signIn } from './helpers.js';

test('acknowledging an alert records who did it and updates the lists', async ({ page }) => {
  await signIn(page);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /Alerts/ }).click();
  const table = page.getByRole('table', { name: 'Alerts' });
  const openRow = table.locator('tbody tr', { hasText: 'Open' }).first();
  await expect(openRow).toBeVisible();
  const zone = (await openRow.locator('td').nth(2).innerText()).trim();
  await openRow.click();

  const drawer = page.getByRole('dialog');
  const ack = drawer.getByRole('button', { name: 'Acknowledge' });
  // A note of at least 5 characters is required.
  await drawer.getByLabel('Note').fill('ok');
  await expect(ack).toBeDisabled();
  await drawer.getByLabel('Note').fill('Checked on site, cordon placed');
  await ack.click();

  await expect(drawer.getByText(/Acknowledged by Duty Engineer/)).toBeVisible();
  const ackRow = table.locator('tbody tr', { hasText: zone }).filter({ hasText: 'Acknowledged' }).first();
  await expect(ackRow).toContainText('Duty Engineer');
  // Resolving takes it off the default (open + acknowledged) list.
  await drawer.getByLabel('Note').fill('Ground stable after inspection');
  await drawer.getByRole('button', { name: 'Resolve' }).click();
  await expect(drawer).toHaveCount(0);
});

test('the Network page lists every node and opens one on the Overview', async ({ page }) => {
  await signIn(page);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Network' }).click();
  const rows = page.getByRole('table', { name: 'Nodes' }).locator('tbody tr');
  await expect(rows).toHaveCount(60);
  await expect(page.getByRole('img', { name: 'Mesh tree' })).toBeVisible();
  await rows.filter({ hasText: 'N-037' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('complementary', { name: 'Details' }).getByRole('heading', { name: 'N-037' }),
  ).toBeVisible();
});

test('Settings shows display options and read-only thresholds', async ({ page }) => {
  await signIn(page);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Tilt unit' })).toBeVisible();
  await expect(page.getByText('Limit: sinking beyond expected')).toBeVisible();
  await expect(page.getByText(/Read-only/)).toBeVisible();
});
