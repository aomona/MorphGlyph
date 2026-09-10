import { test, expect } from '@playwright/test';

test('all eight examples respond independently and expose their code', async ({ page }) => {
  await page.goto('/');
  const gallery = page.getByRole('region', { name: 'Examples', exact: true });
  await expect(gallery.getByRole('article')).toHaveCount(8);
  await expect(gallery.locator('[data-morphglyph][data-state="ready"]')).toHaveCount(8);
  const example = (name: string) => gallery.getByRole('article', { name, exact: true });
  const text = (name: string) => example(name).locator('[data-morphglyph-text]');
  await example('Counter').getByRole('button', { name: 'Increase count' }).click();
  await expect(text('Counter')).toHaveText('129');
  await example('Countdown').getByRole('button', { name: 'Start' }).click();
  await expect(text('Countdown')).toHaveText('GO');
  await example('Playback').getByRole('button', { name: 'Play demo' }).click();
  await expect(example('Playback').getByRole('button', { name: 'Pause demo' })).toBeVisible();
  await example('Languages').getByRole('button', { name: 'JP', exact: true }).click();
  await expect(text('Languages')).toHaveText('こんにちは');
  await example('Factorization').getByRole('button', { name: 'Factor', exact: true }).click();
  await expect(text('Factorization')).toHaveText('(x + 1)²');
  await example('Save state').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(text('Save state')).toHaveText('保存済み');
  await example('Pricing').getByRole('button', { name: 'Yearly', exact: true }).click();
  await expect(text('Pricing')).toHaveText('$190');
  await example('Typography').getByRole('button', { name: 'Transform', exact: true }).click();
  await expect(text('Typography')).toHaveText('かたち');
  await expect(text('Counter')).toHaveText('129');
  await example('Counter').locator('summary').click();
  await expect(example('Counter').locator('pre')).toContainText('setCount');
});

test('examples fit mobile and work with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const gallery = page.getByRole('region', { name: 'Examples', exact: true });
  await expect(gallery.locator('[data-state="ready"]')).toHaveCount(8);
  await gallery.getByRole('button', { name: 'Transform', exact: true }).click();
  await expect(
    gallery.getByRole('article', { name: 'Typography' }).locator('[data-morphglyph-text]'),
  ).toHaveText('かたち');
  await gallery.getByRole('article', { name: 'Factorization' }).locator('summary').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
