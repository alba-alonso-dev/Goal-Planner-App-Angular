import AxeBuilder from '@axe-core/playwright';
import { Page, expect, test as base } from '@playwright/test';
import { navigateTo, test } from './fixtures';

/** Reglas WCAG 2.1 A/AA (incluye contraste de color). */
async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const summary = results.violations.flatMap(v =>
    v.nodes.map(n => `${v.id}: ${n.target.join(' ')} → ${n.any[0]?.message ?? n.failureSummary}`)
  );
  expect(summary).toEqual([]);
}

base('home and login dialog have no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/home');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoViolations(page);

  await page
    .getByRole('button', { name: /log ?in|sign in|get started/i })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectNoViolations(page);
});

test.describe('authenticated pages', () => {
  test.beforeEach(async ({ page }) => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const day = tomorrow.toISOString().slice(0, 10);
    await page.request.post('/api/tasks', {
      data: { taskName: 'Axe task', frequency: 'Daily', startDate: day, dueDate: day }
    });
    await page.request.post('/api/goals', {
      data: {
        goalName: 'Axe goal',
        startDate: day,
        endDate: day,
        milestones: [{ milestoneName: 'Axe milestone', targetDate: day }]
      }
    });
    await page.request.post('/api/reminders', {
      data: { title: 'Axe reminder', reminderDateTime: tomorrow.toISOString() }
    });
    await page.goto('/dashboard');
  });

  for (const section of ['Dashboard', 'Tasks', 'Goals', 'Reminders'] as const) {
    test(`${section} has no WCAG A/AA violations`, async ({ page }) => {
      await navigateTo(page, section);
      await expect(page.getByText(/Axe (task|goal|reminder)/).first()).toBeVisible();
      await expectNoViolations(page);
    });
  }
});

base('reset password page has no WCAG A/AA violations', async ({ page }) => {
  await page.goto(`/reset-password?token=${'a'.repeat(43)}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoViolations(page);
});

test.describe('dialogs and account', () => {
  test.beforeEach(async ({ page }) => {
    const day = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await page.request.post('/api/tasks', {
      data: { taskName: 'Axe task', frequency: 'Daily', startDate: day, dueDate: day }
    });
    await page.request.post('/api/goals', {
      data: {
        goalName: 'Axe goal',
        startDate: day,
        endDate: day,
        milestones: [{ milestoneName: 'Axe milestone', targetDate: day }]
      }
    });
    await page.request.post('/api/reminders', {
      data: { title: 'Axe reminder', reminderDateTime: new Date(Date.now() + 86_400_000).toISOString() }
    });
    await page.goto('/dashboard');
  });

  /** Abre un diálogo, lo analiza (también en modo edición si lo tiene) y lo cierra. */
  async function checkDialog(page: Page, open: () => Promise<void>, editButton?: string) {
    await open();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expectNoViolations(page);
    if (editButton) {
      await dialog.getByRole('button', { name: editButton }).click();
      await expectNoViolations(page);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  }

  test('task dialogs', async ({ page }) => {
    await navigateTo(page, 'Tasks');
    await checkDialog(page, () => page.getByRole('button', { name: 'New Task' }).click());
    await checkDialog(page, () => page.getByRole('button', { name: 'View Details' }).first().click(), 'Edit');
  });

  test('goal dialogs', async ({ page }) => {
    await navigateTo(page, 'Goals');
    await checkDialog(page, async () => {
      await page.getByRole('button', { name: 'New Goal' }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: /Add milestone/i })
        .click();
    });
    await checkDialog(page, () => page.getByRole('button', { name: 'View Details' }).first().click(), 'Edit Goal');
  });

  test('reminder dialogs', async ({ page }) => {
    await navigateTo(page, 'Reminders');
    await checkDialog(page, () => page.getByRole('button', { name: 'New Reminder' }).click());
    await checkDialog(page, () => page.getByRole('button', { name: 'View details' }).first().click(), 'Edit');
  });

  test('account page', async ({ page, user }) => {
    await page.locator('nav').getByRole('link', { name: user.emailId }).click();
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
    await expectNoViolations(page);
  });
});
