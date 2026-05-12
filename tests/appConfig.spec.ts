import { test, expect } from './fixtures';

test('should render app configuration', async ({ appConfigPage, page }) => {
  await appConfigPage;

  await expect(page.getByRole('heading', { name: /JSON Schema Form configuration/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Document source/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Schema source/i })).toBeVisible();
});
