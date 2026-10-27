import { expect, test } from '@playwright/test';

test.describe('family tree', () => {
  test('landing leads into a guest tree', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /chronicle your lineage/i })).toBeVisible();
    await page
      .getByRole('link', { name: /begin your tree/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/tree$/);
    await expect(page.locator('.node.me')).toBeVisible();
  });

  test('guided entry, undo/redo, search, and persistence', async ({ page }) => {
    await page.goto('/tree');
    await page.locator('.node.me .add').click();
    await page.locator('#panel .act', { hasText: 'Father' }).click();

    // A new relative opens with the name field focused.
    await expect(page.locator('#fName')).toBeFocused();
    await page.keyboard.type('Ravi Bhadra');
    await page.fill('#fYear', '1960');
    await page.fill('#fDied', '2020');
    await page.keyboard.press('Escape');
    await expect(page.locator('.node .yr', { hasText: '1960 – 2020' })).toBeVisible();

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('.node .yr', { hasText: '1960 – 2020' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Redo' }).click();
    await expect(page.locator('.node .yr', { hasText: '1960 – 2020' })).toBeVisible();

    await page.keyboard.press('Control+k');
    await page.keyboard.type('ravi');
    await page.keyboard.press('Enter');
    await expect(page.locator('#panel .p-name')).toHaveText('Ravi Bhadra');
    await page.keyboard.press('Escape');

    await page.waitForTimeout(900); // autosave debounce
    await page.reload();
    await expect(page.locator('.node .nm', { hasText: 'Ravi Bhadra' })).toBeVisible();
    await expect(page.locator('.hud')).toContainText('2 people');
  });

  test('exports GEDCOM and a JSON backup', async ({ page }) => {
    await page.goto('/tree');
    await page.getByRole('button', { name: 'More actions' }).click();
    const ged = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /export gedcom/i }).click();
    expect((await ged).suggestedFilename()).toBe('family-tree.ged');

    await page.getByRole('button', { name: 'More actions' }).click();
    const backup = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /download backup/i }).click();
    expect((await backup).suggestedFilename()).toMatch(/^family-tree-backup-.*\.json$/);
  });
});
