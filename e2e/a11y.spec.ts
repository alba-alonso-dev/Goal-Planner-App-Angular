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
