import { expect, navigateTo, test } from './fixtures';

test('goal milestones: range validation and achievement persisted', async ({ page }) => {
  await page.goto('/dashboard');
  await navigateTo(page, 'Goals');

  await page.getByRole('button', { name: 'New Goal' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create New Goal' });
  await dialog.getByLabel('Goal Title').fill('Aprender Angular 22');
  await dialog.getByLabel('Start Date').fill('2026-06-01');
  await dialog.getByLabel('Target Date').first().fill('2026-06-30');
  await dialog.getByRole('button', { name: /Add milestone/i }).click();
  await dialog.locator('#new-goal-milestone-0-milestoneName').fill('Zoneless');
  await dialog.locator('#new-goal-milestone-0-targetDate').fill('2026-07-15');
  await expect(dialog.getByText('Must be between the goal start and target dates')).toBeVisible();
  await dialog.locator('#new-goal-milestone-0-targetDate').fill('2026-06-15');
  await dialog.getByRole('button', { name: /Create Goal/i }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByText('Aprender Angular 22')).toBeVisible();
  await page.getByRole('button', { name: 'View Details' }).click();
  const details = page.getByRole('dialog');
  await details.getByText('Zoneless').click();
  await expect(details.getByText('100%').first()).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'View Details' }).click();
  await expect(page.getByRole('dialog').getByText('100%').first()).toBeVisible();
});

test('reminders: create, acknowledge (persisted) and delete', async ({ page }) => {
  await page.goto('/dashboard');
  await navigateTo(page, 'Reminders');

  await page.getByRole('button', { name: 'New Reminder' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create New Reminder' });
  await dialog.getByLabel('Title').fill('Llamar al equipo');
  await dialog.getByRole('button', { name: 'Create Reminder' }).click();
  await expect(dialog).toBeHidden();

  const card = page.locator('app-reminder-item', { hasText: 'Llamar al equipo' });
  await card.getByRole('button', { name: 'Mark as acknowledged' }).click();
  await expect(card.getByRole('button', { name: 'Mark as pending' })).toBeVisible();
  await page.reload();
  await expect(
    page.locator('app-reminder-item', { hasText: 'Llamar al equipo' }).getByRole('button', { name: 'Mark as pending' })
  ).toBeVisible();

  page.once('dialog', d => d.accept());
  await page
    .locator('app-reminder-item', { hasText: 'Llamar al equipo' })
    .getByRole('button', { name: 'Delete reminder' })
    .click();
  await expect(page.locator('app-reminder-item', { hasText: 'Llamar al equipo' })).toHaveCount(0);
});
