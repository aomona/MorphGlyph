import { test, expect } from '@playwright/test';

test('loads the bundled font, scrubs real paths, plays and copies code', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const morph = page.locator('.stage [data-morphglyph]');
  await expect(morph).toHaveAttribute('data-state', 'ready');
  await expect(morph.locator('path').first()).toHaveAttribute('fill-rule', 'nonzero');
  await page.getByRole('slider', { name: 'Progress' }).fill('0');
  const source = await morph.locator('g').innerHTML();
  await page.getByRole('slider', { name: 'Progress' }).fill('0.5');
  expect(await morph.locator('g').innerHTML()).not.toBe(source);
  await expect(morph.locator('g')).toHaveAttribute('data-progress', '0.5');
  await page.getByRole('slider', { name: 'Progress' }).fill('1');
  await expect(morph.locator('[data-morphglyph-text]')).toHaveText('World');
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
  await expect(page.locator('.stage [data-morphglyph]')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('slider', { name: 'Progress' }).fill('1');
  const path = await page.locator('.stage [data-morphglyph] path').first().getAttribute('d');
  expect(path).not.toBeNull();
  expect(path!.match(/M/g)).toHaveLength(5);
  await page.getByRole('textbox', { name: 'After', exact: true }).fill('');
  await page.getByRole('slider', { name: 'Progress' }).fill('1');
  await expect(page.locator('.stage [data-morphglyph-text]')).toHaveText('');
  await page.getByRole('textbox', { name: 'After', exact: true }).fill('🦄');
  await expect(page.locator('.stage [data-morphglyph]')).toHaveAttribute('data-state', 'error');
  await expect(page.getByRole('alert')).toContainText('glyph');
  await page.getByRole('textbox', { name: 'After', exact: true }).fill('田');
  await expect(page.locator('.stage [data-morphglyph]')).toHaveAttribute('data-state', 'ready');
});

test('respects reduced motion and stops loops', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.stage [data-morphglyph]')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('checkbox', { name: 'Loop' }).check();
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.locator('.stage [data-morphglyph] g')).toHaveAttribute('data-progress', '1');
  await page.waitForTimeout(100);
  await expect(page.locator('.stage [data-morphglyph] g')).toHaveAttribute('data-progress', '1');
  await page.getByRole('slider', { name: 'Progress' }).fill('0.3');
  const reduced = await page.locator('.stage [data-morphglyph] g').innerHTML();
  await page.getByRole('slider', { name: 'Progress' }).fill('0');
  expect(await page.locator('.stage [data-morphglyph] g').innerHTML()).toBe(reduced);
});

test('fits a mobile viewport without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.stage [data-morphglyph]')).toHaveAttribute('data-state', 'ready');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: '文字 → かたち', exact: true }).click();
  await page.getByRole('slider', { name: 'Progress' }).fill('0.5');
  await page.screenshot({ path: 'test-results/playground-mobile.png', fullPage: true });
});

test('endpoint HTML preserves every rendered pixel and supports selection and reader text', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const morph = page.locator('.stage [data-morphglyph]');
  await expect(morph).toHaveAttribute('data-state', 'ready');
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [progress, text] of [
      ['0', 'Hello'],
      ['1', 'World'],
    ]) {
      await page.getByRole('slider', { name: 'Progress' }).fill(progress);
      const native = morph.locator('[data-morphglyph-text]');
      await expect(native).toHaveText(text);
      await expect(morph).toHaveAttribute('data-selectable', 'true');
      expect(await morph.ariaSnapshot()).toBe(`- text: ${text}`);
      expect(await native.evaluate((e) => e.closest('svg'))).toBeNull();
      const withHTML = await morph.screenshot();
      await native.evaluate((e) => {
        e.style.visibility = 'hidden';
      });
      expect((await morph.screenshot()).equals(withHTML), `${width}px at ${progress}`).toBe(true);
      await native.evaluate((e) => {
        e.style.visibility = '';
      });
      const box = (await native.boundingBox())!;
      await page.mouse.move(box.x + 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2, { steps: 20 });
      await page.mouse.up();
      expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(text);
      await page.keyboard.press('ControlOrMeta+c');
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text);
      await page.evaluate(() => window.getSelection()?.removeAllRanges());
    }
  }
  await page.getByRole('slider', { name: 'Progress' }).fill('0.5');
  await expect(morph.locator('[data-morphglyph-text]')).toHaveCount(0);
  await expect(morph).toHaveAttribute('role', 'img');
  await page.getByRole('button', { name: '文字 → かたち', exact: true }).click();
  await page.getByRole('slider', { name: 'Progress' }).fill('1');
  await expect(morph.locator('[data-morphglyph-text]')).toHaveText('かたち');
  expect(await morph.ariaSnapshot()).toBe('- text: かたち');
  await page.getByRole('checkbox', { name: 'Outlines' }).check();
  const withJapanese = await morph.screenshot();
  await morph.locator('[data-morphglyph-text]').evaluate((e) => {
    e.style.visibility = 'hidden';
  });
  expect((await morph.screenshot()).equals(withJapanese)).toBe(true);
});

test('holds loop endpoints and pauses when selection starts; button labels morph', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.clock.install();
  await page.goto('/');
  const morph = page.locator('.stage [data-morphglyph]');
  await expect(morph).toHaveAttribute('data-state', 'ready');
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await page.clock.runFor(1650);
  await expect(morph.locator('g')).toHaveAttribute('data-progress', '1');
  await page.clock.runFor(500);
  await expect(morph.locator('g')).toHaveAttribute('data-progress', '1');
  await morph.locator('[data-morphglyph-text]').click();
  const play = page.getByRole('button', { name: 'Play', exact: true });
  await expect(play).toBeVisible();
  await page.clock.runFor(2500);
  await expect(morph.locator('g')).toHaveAttribute('data-progress', '1');
  const label = play.locator('g');
  const before = await label.innerHTML();
  await play.click();
  await page.clock.runFor(100);
  const during = await page
    .getByRole('button', { name: 'Pause', exact: true })
    .locator('g')
    .innerHTML();
  expect(during).not.toBe(before);
  await page.clock.runFor(200);
  expect(
    await page.getByRole('button', { name: 'Pause', exact: true }).locator('g').innerHTML(),
  ).not.toBe(during);
  await page.getByRole('button', { name: 'Copy code', exact: true }).click();
  const copied = page.getByRole('button', { name: 'Copied', exact: true });
  await expect(copied).toBeVisible();
  await expect(copied.locator('.morph-label')).toHaveAttribute('aria-hidden', 'true');
  await page.clock.runFor(300);
  await expect(copied.locator('g')).toHaveAttribute('data-progress', '1');
});
