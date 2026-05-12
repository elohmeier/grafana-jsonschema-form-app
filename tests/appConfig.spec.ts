import { test, expect } from './fixtures';

test('should render app configuration', async ({ appConfigPage, page }) => {
  await appConfigPage;

  await expect(page.getByRole('status', { name: /JSON Schema Form has no required settings/i })).toBeVisible();
});
