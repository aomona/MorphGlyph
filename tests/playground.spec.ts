import { test, expect } from '@playwright/test';

test('loads the bundled font, scrubs real paths, plays and copies code', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const morph = page.locator('[data-morphglyph]');
  await expect(morph).toHaveAttribute('data-state', 'ready');
  await expect(morph.locator('path').first()).toHaveAttribute('fill-rule', 'nonzero');
  await page.getByRole('slider', { name: 'Progress' }).fill('0');
  const source = await morph.locator('g').innerHTML();
  await page.getByRole('slider', { name: 'Progress' }).fill('0.5');
  expect(await morph.locator('g').innerHTML()).not.toBe(source);
  await expect(morph.locator('g')).toHaveAttribute('data-progress', '0.5');
  await page.getByRole('slider', { name: 'Progress' }).fill('1');
  await expect(morph).toHaveAttribute('aria-label', 'World');
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await morph.locator('g').getAttribute('data-progress');
  await page.waitForTimeout(100);
  expect(await morph.locator('g').getAttribute('data-progress')).toBe(paused);
  await page.getByRole('button', { name: 'Copy code' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('<MorphGlyph');
  expect(errors).toEqual([]);
});

test('handles Japanese, empty text and missing glyph fallback', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '日 → 田', exact: true }).click();
  await expect(page.locator('[data-morphglyph]')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('slider', { name: 'Progress' }).fill('1');
  const path = await page.locator('[data-morphglyph] path').first().getAttribute('d');
  expect(path).not.toBeNull();
  expect(path!.match(/M/g)).toHaveLength(5);
  await page.getByRole('textbox', { name: 'After', exact: true }).fill('');
  await page.getByRole('slider', { name: 'Progress' }).fill('1');
  await expect(page.locator('[data-morphglyph]')).toHaveAttribute('aria-label', '');
  await page.getByRole('textbox', { name: 'After', exact: true }).fill('🦄');
  await expect(page.locator('[data-morphglyph]')).toHaveAttribute('data-state', 'error');
  await expect(page.getByRole('alert')).toContainText('glyph');
  await page.getByRole('textbox', { name: 'After', exact: true }).fill('田');
  await expect(page.locator('[data-morphglyph]')).toHaveAttribute('data-state', 'ready');
});

test('respects reduced motion and stops loops', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-morphglyph]')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('checkbox', { name: 'Loop' }).check();
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.locator('[data-morphglyph] g')).toHaveAttribute('data-progress', '1');
  await page.waitForTimeout(100);
  await expect(page.locator('[data-morphglyph] g')).toHaveAttribute('data-progress', '1');
  await page.getByRole('slider', { name: 'Progress' }).fill('0.3');
  const reduced = await page.locator('[data-morphglyph] g').innerHTML();
  await page.getByRole('slider', { name: 'Progress' }).fill('0');
  expect(await page.locator('[data-morphglyph] g').innerHTML()).toBe(reduced);
});

test('fits a mobile viewport without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('[data-morphglyph]')).toHaveAttribute('data-state', 'ready');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: '文字 → かたち', exact: true }).click();
  await page.getByRole('slider', { name: 'Progress' }).fill('0.5');
  await page.screenshot({ path: 'test-results/playground-mobile.png', fullPage: true });
});
