import { expect, test } from '@playwright/test';
import { details, rail, signIn } from './helpers.js';

test('the Overview loads all 60 nodes into the 3D scene', async ({ page }) => {
  const nodes = page.waitForResponse((r) => /\/api\/nodes\?/.test(r.url()) && r.ok());
  await signIn(page);
  const body = await (await nodes).json();
  expect(body.nodes).toHaveLength(60);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByLabel('Legend')).toContainText('log scale');
});

test('selecting zone Z-OW1 in the rail opens its forecast', async ({ page }) => {
  await signIn(page);
  await rail(page).getByRole('button', { name: /Z-OW1/ }).first().click();
  const panel = details(page);
  await expect(panel.getByRole('heading', { name: 'Z-OW1' })).toBeVisible();
  await expect(panel.getByText('Forecast', { exact: true })).toBeVisible();
  await expect(panel.getByRole('img', { name: /Sinking forecast for N-/ })).toBeVisible();
  await expect(panel.getByText(/1\/speed falls in a straight line/)).toBeVisible();
  await expect(panel.getByText('Why this tier')).toBeVisible();
  // Escape clears the selection.
  await page.keyboard.press('Escape');
  await expect(panel.getByRole('heading', { name: 'Site summary' })).toBeVisible();
});

test('scrubbing back to day 5 10:30 shows the degraded mesh', async ({ page }) => {
  await signIn(page);
  const slider = page.getByRole('slider', { name: 'Time shown' });
  const min = Number(await slider.getAttribute('aria-valuemin'));
  const max = Number(await slider.getAttribute('aria-valuemax'));
  const target = min + (5 * 24 + 10.5) * 3600_000;
  const box = await slider.boundingBox();
  await page.mouse.click(box.x + (box.width * (target - min)) / (max - min), box.y + box.height / 2);
  const panel = details(page);
  await expect(panel.getByText(/not live/)).toBeVisible();
  await expect(panel.getByText(/Degraded — root lost .*R-02 now root/)).toBeVisible();
  await panel.getByRole('button', { name: 'Back to live' }).click();
  await expect(panel.getByText(/not live/)).toHaveCount(0);
});

test('the theme toggle switches between dark and light', async ({ page }) => {
  await signIn(page);
  const html = page.locator('html');
  const before = await html.getAttribute('data-theme');
  await page.getByRole('button', { name: /Switch to (light|dark) theme/ }).click();
  const after = before === 'dark' ? 'light' : 'dark';
  await expect(html).toHaveAttribute('data-theme', after);
  // Remembered across a reload.
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', after);
});

test('exporting a node downloads a CSV with a descriptive filename', async ({ page }) => {
  await signIn(page);
  await rail(page).getByRole('button', { name: /Z-OW1/ }).first().click();
  await details(page).getByRole('table', { name: /Nodes in Z-OW1/ }).locator('tbody tr').first().click();
  const download = page.waitForEvent('download');
  await details(page).getByRole('link', { name: /Export CSV/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^site-01_N-\d{3}_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/);
  const text = await (await file.createReadStream()).toArray();
  expect(Buffer.concat(text).toString().split('\n')[0]).toMatch(/^ts,nodeId,sinking_mm/);
});
