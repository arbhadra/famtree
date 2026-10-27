import { expect, test } from '@playwright/test';

test('logbook: write an entry, find it, read it, see it on the timeline', async ({ page }) => {
  await page.goto('/tree');
  await page.locator('.node.me').click();
  await page.fill('#fName', 'Arnab Bhadra');
  await page.keyboard.press('Escape');

  // Logbook lives in the top-right corner of every page.
  await page.getByRole('link', { name: /logbook/i }).click();
  await expect(page.getByRole('heading', { name: 'The Logbook' })).toBeVisible();
  await page.getByRole('button', { name: /write the first entry/i }).click();

  await page.getByLabel('Title').fill('The voyage to London');
  await page.locator('.form-grid select').first().selectOption('migration');
  await page.getByLabel('Date', { exact: true }).fill('1962-04');
  await expect(page.getByText('Reads as: Apr 1962')).toBeVisible();
  await page.getByLabel('Date', { exact: true }).fill('1962-13');
  await expect(page.getByText('Use YYYY, YYYY-MM or YYYY-MM-DD')).toBeVisible();
  await page.getByLabel('Date', { exact: true }).fill('1962-04');

  await page.getByLabel('Tag people').fill('arnab');
  await page.keyboard.press('Enter');
  await page.locator('.ProseMirror').click();
  await page.keyboard.type('We sailed on the SS Canton.');
  await page.getByRole('button', { name: 'Read' }).click();

  await expect(page.getByRole('heading', { name: 'The voyage to London' })).toBeVisible();
  await expect(page.locator('.read-people')).toContainText('Arnab Bhadra');
  await expect(page.locator('.story.read')).toContainText('SS Canton');
  await expect(page.getByText('All changes saved')).toBeVisible();

  await page
    .getByRole('link', { name: /logbook/i })
    .first()
    .click();
  await expect(page.locator('.logbook-btn .badge')).toHaveText('1');
  await page.getByLabel('Search the logbook').fill('canton');
  await expect(page.locator('.entry-card')).toHaveCount(1);
  await page.getByLabel('Search the logbook').fill('zzz');
  await expect(page.locator('.entry-card')).toHaveCount(0);

  await page.reload();
  await expect(page.locator('.entry-card h3')).toHaveText('The voyage to London');

  await page.getByRole('link', { name: 'Timeline' }).click();
  await expect(page.locator('.tl-card', { hasText: 'The voyage to London' })).toBeVisible();
});

test('an abandoned blank entry is discarded', async ({ page }) => {
  await page.goto('/logbook');
  await page.getByRole('button', { name: /write the first entry/i }).click();
  await expect(page.getByLabel('Title')).toBeVisible();
  await page.getByRole('link', { name: 'Logbook' }).first().click();
  await expect(page.getByText('Your logbook awaits its first page')).toBeVisible();
});
