import { expect, test } from '@playwright/test';

for (const path of ['/', '/tree', '/logbook', '/timeline', '/charts', '/credits']) {
  test(`no horizontal scroll on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => {
      const header = document.querySelector('.app-header');
      return Math.max(
        document.documentElement.scrollWidth - window.innerWidth,
        header ? header.scrollWidth - header.clientWidth : 0,
      );
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
