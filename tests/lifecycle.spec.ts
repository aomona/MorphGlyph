import { test, expect } from '@playwright/test';

test('controlled frames are deterministic and never start an internal clock', async ({ page }) => {
  await page.goto('/?test');
  const glyph = page.locator('[data-morphglyph]');
  await expect(glyph).toHaveAttribute('data-state', 'ready');
  const first = await glyph.locator('g').innerHTML();
  await page.getByRole('slider', { name: 'Frame' }).fill('0.8');
  expect(await glyph.locator('g').innerHTML()).not.toBe(first);
  await page.getByRole('slider', { name: 'Frame' }).fill('0.4');
  expect(await glyph.locator('g').innerHTML()).toBe(first);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForTimeout(100);
  expect(await glyph.locator('g').innerHTML()).toBe(first);
  await expect(page.getByTestId('events')).toHaveText('0/0');
});

test('after changes continue from the displayed frame; before changes reset', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?test');
  const glyph = page.locator('[data-morphglyph]');
  await expect(glyph).toHaveAttribute('data-state', 'ready');
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole('checkbox', { name: 'Controlled' }).uncheck();
  await page.clock.runFor(300);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const first = await glyph.locator('g').innerHTML();
  await page.getByRole('textbox', { name: 'Target' }).fill('日本語');
  await expect(glyph.locator('g')).toHaveAttribute('data-progress', '0');
  expect(await glyph.locator('g').innerHTML()).toBe(first);
  await page.getByRole('textbox', { name: 'Source' }).fill('田');
  await expect(glyph).toHaveAttribute('aria-label', '田');
  await page.getByRole('button', { name: 'Mount' }).click();
  await expect(glyph).toHaveCount(0);
  await page.getByRole('button', { name: 'Mount' }).click();
  await expect(glyph).toHaveAttribute('data-state', 'ready');
});

test('StrictMode completes once, reverse reaches the source, unmount cancels', async ({ page }) => {
  await page.goto('/?test');
  await expect(page.locator('[data-morphglyph]')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('checkbox', { name: 'Controlled' }).uncheck();
  await expect(page.getByTestId('events')).toHaveText('1/1');
  await page.getByRole('button', { name: 'Reverse', exact: true }).click();
  await expect(page.getByTestId('events')).toHaveText('2/2');
  await expect(page.locator('[data-morphglyph]')).toHaveAttribute('aria-label', 'ABC');
  await page.getByRole('button', { name: 'Restart' }).click();
  await page.getByRole('button', { name: 'Mount' }).click();
  const count = await page.getByTestId('events').textContent();
  await page.waitForTimeout(1100);
  await expect(page.getByTestId('events')).toHaveText(count!);
});
