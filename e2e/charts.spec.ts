import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/** A small saved tree, written in the original storage format so the app migrates it on load. */
function seed(page: Page) {
  const P = (
    id: string,
    name: string,
    gender: string,
    year: string,
    parents: string[] = [],
    spouses: string[] = [],
  ) => ({
    id,
    name,
    gender,
    side: 'self',
    relation: '',
    year,
    died: '',
    birthplace: '',
    occupation: '',
    notes: '',
    photo: null,
    collapsedUp: false,
    collapsedDown: false,
    parents,
    parentTypes: {},
    spouses,
  });
  const tree = {
    meId: 'me',
    version: 2,
    unions: { 'dad|mum': { status: 'married', start: '1985', end: '' } },
    people: {
      me: P('me', 'Arnab Bhadra', 'male', '1990', ['dad', 'mum']),
      dad: P('dad', 'Ravi Bhadra', 'male', '1958', ['gpa'], ['mum']),
      mum: P('mum', 'Mira Sen', 'female', '1962', [], ['dad']),
      gpa: P('gpa', 'Hari Bhadra', 'male', '1930'),
      sis: P('sis', 'Priya Bhadra', 'female', '1993', ['dad', 'mum']),
    },
  };
  return page.addInitScript((t) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('familyTree.v4', t);
      localStorage.setItem('ft_hint_v4', '1');
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(tree));
}

test('four chart views render and export to PNG, PDF and SVG', async ({ page }) => {
  await seed(page);
  await page.goto('/charts');
  const chart = page.locator('svg.chart-svg');
  await expect(chart).toContainText('The House of Bhadra');
  await expect(chart).toContainText('Ancestors of Arnab Bhadra');
  await expect(chart).toContainText('Hari Bhadra');

  for (const kind of ['Descendants', 'Fan chart', 'Outline', 'Ancestors']) {
    await page.getByRole('radio', { name: kind }).click();
    await expect(page.getByRole('radio', { name: kind })).toHaveAttribute('aria-checked', 'true');
    await expect(chart).toContainText('Ravi Bhadra');
  }
  await page.getByRole('radio', { name: 'Descendants' }).click();
  await expect(chart).toContainText('Descendants of Hari Bhadra');

  for (const [button, ext] of [
    ['PNG', 'png'],
    ['PDF', 'pdf'],
    ['SVG', 'svg'],
  ]) {
    const download = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('button', { name: button, exact: true }).click();
    expect((await download).suggestedFilename()).toBe(`bhadra-descendants.${ext}`);
  }
});

test('CSV export, edit as text, and import back', async ({ page }, info) => {
  await seed(page);
  await page.goto('/tree');
  await page.getByRole('button', { name: 'More actions' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /export csv/i }).click();
  const file = info.outputPath('tree.csv');
  await (await download).saveAs(file);

  const csv = readFileSync(file, 'utf8');
  expect(csv.split('\r\n')[0]).toBe(
    '﻿id,name,gender,born,died,birthplace,occupation,label,notes,parents,partners,me',
  );
  expect(csv).toContain('dad,Ravi Bhadra,male,1958');

  // Edit as plain text: rename Priya and add a brother.
  const edited =
    csv.replace('Priya Bhadra', 'Priya Sen-Bhadra') +
    'bro,Kiran Bhadra,male,1996,,,,,,dad;mum,,\r\n';
  writeFileSync(file, edited);

  page.once('dialog', (d) => d.accept());
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: /import csv/i }).click();
  await (await chooser).setFiles(file);

  await expect(page.locator('.node .nm', { hasText: 'Priya Sen-Bhadra' })).toBeVisible();
  const kiran = page.locator('.node', { has: page.locator('.nm', { hasText: 'Kiran Bhadra' }) });
  await expect(kiran.locator('.rl')).toHaveText('Brother');
  await expect(page.locator('.hud')).toContainText('6 people');

  // The import is one undoable step.
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.node .nm', { hasText: 'Kiran Bhadra' })).toHaveCount(0);
});

test('thanks and credits page lists the references', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /thanks & credits/i }).click();
  await expect(page.getByRole('heading', { name: 'Thanks & Credits' })).toBeVisible();
  await expect(
    page.getByText('Types of Family Trees – A Guide to Family Charts and Templates'),
  ).toBeVisible();
  await expect(page.getByText(/r\/Genealogy on Reddit/)).toBeVisible();
});
