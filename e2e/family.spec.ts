import { expect, test, type Locator, type Page } from '@playwright/test';

const panel = (page: Page) => page.locator('#panel');
const node = (page: Page, name: string) =>
  page.locator('.node', { has: page.locator('.nm', { hasText: name }) });

/** After adding a relative, type their name once the name field has focus. */
async function nameNew(page: Page, name: string) {
  await expect(page.locator('#fName')).toBeFocused();
  await page.keyboard.type(name);
  await page.keyboard.press('Escape');
}

async function openRelatives(page: Page, who: Locator) {
  await who.locator('.add').click();
  await expect(panel(page).getByRole('tab', { name: 'Relatives' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
}

test('several partners, children with a specific partner, and computed relationships', async ({
  page,
}) => {
  await page.goto('/tree');
  const me = page.locator('.node.me');
  await me.click();
  await page.fill('#fName', 'Arnab');
  await panel(page).getByRole('radio', { name: 'Male', exact: true }).click();
  await page.keyboard.press('Escape');

  // First wife, then mark the marriage as divorced.
  await openRelatives(page, me);
  await panel(page).locator('.mini-add', { hasText: 'Wife' }).click();
  await nameNew(page, 'Anna');
  await openRelatives(page, me);
  await panel(page).getByLabel('Relationship with Anna').selectOption('divorced');
  await page.keyboard.press('Escape');

  // Second wife, and a daughter with her specifically.
  await openRelatives(page, me);
  await panel(page).locator('.mini-add', { hasText: 'Wife' }).click();
  await nameNew(page, 'Beth');
  await openRelatives(page, me);
  await panel(page)
    .locator('.union-card', { hasText: 'Children with Beth' })
    .locator('.mini-add', { hasText: 'Daughter' })
    .click();
  await nameNew(page, 'Cara');

  // And a son with Anna.
  await openRelatives(page, me);
  await panel(page)
    .locator('.union-card', { hasText: 'Children with Anna' })
    .locator('.mini-add', { hasText: 'Son' })
    .click();
  await nameNew(page, 'Dev');

  await expect(node(page, 'Anna').locator('.rl')).toHaveText('Ex-wife');
  await expect(node(page, 'Beth').locator('.rl')).toHaveText('Wife');
  await expect(node(page, 'Cara').locator('.rl')).toHaveText('Daughter');
  await expect(page.locator('.edges .bond')).toHaveCount(2);
  await expect(page.locator('.edges .bond.st-divorced')).toHaveCount(1);

  // Cara and Dev share only one parent: half-siblings.
  await node(page, 'Cara').click();
  await panel(page).getByRole('tab', { name: 'Relatives' }).click();
  await expect(panel(page).locator('.rel-group', { hasText: 'Half-siblings' })).toContainText(
    'Dev',
  );
  await expect(panel(page).locator('.union-card').first()).toBeVisible();
  await page.keyboard.press('Escape');

  // Everyone without a photo gets a drawn portrait.
  const people = await page.locator('.node').count();
  await expect(page.locator('.node .avatar-art')).toHaveCount(people);

  // Relationship labels can be overridden.
  await node(page, 'Anna').click();
  await page.fill('#fRel', 'First wife');
  await page.keyboard.press('Escape');
  await expect(node(page, 'Anna').locator('.rl')).toHaveText('First wife');
});

test('step-parents, adoption, deceased styling, and fitting the map', async ({ page }) => {
  await page.goto('/tree');
  const me = page.locator('.node.me');
  await openRelatives(page, me);
  await panel(page).locator('.act', { hasText: 'Mother' }).click();
  await expect(page.locator('#fName')).toBeFocused();
  await page.keyboard.type('Mira');
  await page.fill('#fYear', '1950');
  await page.fill('#fDied', '2019');
  await page.keyboard.press('Escape');

  // A step-father: Mira's new partner, added from my parents list.
  await openRelatives(page, me);
  await panel(page)
    .locator('.rel-card', { hasText: 'Mira' })
    .locator('.mini-add', { hasText: 'Partner' })
    .click();
  await nameNew(page, 'Sam');
  await expect(node(page, 'Sam').locator('.rl')).toHaveText('Stepfather');

  // An adoptive father.
  await openRelatives(page, me);
  await panel(page).getByLabel('Kind of parent').selectOption('adopted');
  await panel(page)
    .locator('.mini-row.labelled', { hasText: 'Another parent' })
    .locator('.mini-add', { hasText: 'Father' })
    .click();
  await nameNew(page, 'Omar');
  await expect(node(page, 'Omar').locator('.rl')).toHaveText('Adoptive father');
  await expect(page.locator('.edges .lt-adopted')).toHaveCount(1);

  // Mira has died: faded portrait and a ribbon.
  await expect(node(page, 'Mira')).toHaveClass(/deceased/);
  await expect(node(page, 'Mira').locator('.ribbon')).toBeVisible();

  // Fit never enlarges past 100%; zoom in, then fit brings everyone back on screen.
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.locator('.zoom .lvl')).toHaveText('120%');
  await page.getByRole('button', { name: 'Fit everyone on screen' }).click();
  await expect(page.locator('.zoom .lvl')).toHaveText('100%');
});
