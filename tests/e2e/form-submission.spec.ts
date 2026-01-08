import { test, expect } from '@playwright/test';

test('ICS-212 form page loads', async ({ page }) => {
  await page.goto('https://usar-ics212.pages.dev');
  
  // Check that the page title is visible
  await expect(page.locator('h1')).toContainText('ICS');
  
  // Take a screenshot
  await page.screenshot({ path: 'tests/screenshots/homepage.png' });
});

test('API health check', async ({ page }) => {
  const response = await page.request.get('https://usar-ics212.pdarleyjr.workers.dev/health');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.status).toBe('ok');
});
