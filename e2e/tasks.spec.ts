import { expect, navigateTo, test } from './fixtures';

test.describe('tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await navigateTo(page, 'Tasks');
  });

  test('create, complete (persisted), edit and delete a task', async ({ page }) => {
    await page.getByRole('button', { name: 'New Task' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create New Task' });
    await dialog.getByLabel('Task Title').fill('Preparar la demo');
    await dialog.getByLabel('Start Date').fill('2026-06-01');
    await dialog.getByLabel('Due Date').fill('2026-06-10');
    await dialog.getByRole('button', { name: 'Create Task' }).click();
    await expect(dialog).toBeHidden();

    const item = page.locator('app-task-item', { hasText: 'Preparar la demo' });
    await expect(item).toContainText('01/06/2026 - 10/06/2026');

    await item.getByRole('checkbox').check();
    await page.reload();
    await expect(page.locator('app-task-item', { hasText: 'Preparar la demo' }).getByRole('checkbox')).toBeChecked();

    await page
      .locator('app-task-item', { hasText: 'Preparar la demo' })
      .getByRole('button', { name: 'View Details' })
      .click();
    const details = page.getByRole('dialog');
    await details.getByRole('button', { name: 'Edit', exact: true }).click();
    await details.getByLabel('Task Title').fill('Preparar la demo final');
    await details.getByRole('button', { name: 'Save Changes' }).click();
    await expect(details.getByText('Preparar la demo final').first()).toBeVisible();
    await details.getByRole('button', { name: 'Close', exact: true }).last().click();

    page.once('dialog', d => d.accept());
    await page
      .locator('app-task-item', { hasText: 'Preparar la demo final' })
      .getByRole('button', { name: 'Delete task' })
      .click();
    await expect(page.locator('app-task-item', { hasText: 'Preparar la demo final' })).toHaveCount(0);
    await page.reload();
    await expect(page.locator('app-task-item', { hasText: 'Preparar la demo final' })).toHaveCount(0);
  });

  test('validates that the due date is not before the start date', async ({ page }) => {
    await page.getByRole('button', { name: 'New Task' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create New Task' });
    await dialog.getByLabel('Task Title').fill('Fechas mal');
    await dialog.getByLabel('Start Date').fill('2026-06-10');
    await dialog.getByLabel('Due Date').fill('2026-06-01');

    await expect(dialog.getByText('Due date cannot be before start date')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Create Task' })).toBeDisabled();
  });
});
