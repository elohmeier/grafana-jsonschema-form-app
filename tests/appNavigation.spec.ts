import { test, expect } from './fixtures';
import { ROUTES } from '../src/constants';
import { testIds } from '../src/components/testIds';

test.describe('navigating app', () => {
  test('form editor should render successfully', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.Editor}`);
    await expect(page.getByTestId(testIds.editor.container)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'JSON Schema Form' })).toBeVisible();
    await expect(page.getByTestId(testIds.editor.preview)).toBeVisible();
  });
});
