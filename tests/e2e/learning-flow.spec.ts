import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('navigates between learning areas with real routes', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'What do you want to learn?' })).toBeVisible();
  await page.getByRole('button', { name: /Explore Cloud/ }).click();

  await expect(page).toHaveURL(/\/cloud$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Cloud platforms' })).toBeVisible();
});

test('registers a learner and restores the authenticated session', async ({ page }) => {
  const email = `browser-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Create a new account' }).click();
  await page.getByLabel('Display name').fill('Browser Learner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Browser-Test-Password-123');
  await page.getByRole('button', { name: 'Create SkillPath account' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'Account: Browser Learner' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Account: Browser Learner' })).toBeVisible();
});

test('redirects an unauthenticated user away from Admin', async ({ page }) => {
  await page.goto('/admin/questions');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Sign in' })).toBeVisible();
});

test('home and sign-in pages have no automatically detectable accessibility violations', async ({ page }) => {
  for (const path of ['/', '/login']) {
    await page.goto(path);
    if (path === '/') {
      await expect(page.getByRole('heading', { level: 1, name: 'What do you want to learn?' })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { level: 1, name: 'Continue your SkillPath' })).toBeVisible();
    }
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${path}: ${JSON.stringify(results.violations, null, 2)}`).toEqual([]);
  }
});
