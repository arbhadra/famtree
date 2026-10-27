import { expect, test } from '@playwright/test';

for (const path of ['/', '/tree', '/logbook', '/timeline']) {
  test(`no horizontal scroll on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
