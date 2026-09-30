import { expect, test } from '@playwright/test';
import { registerViaApi } from './fixtures';

test("a user never sees another user's data", async ({ browser }) => {
  const alice = await browser.newContext({ baseURL: 'http://localhost:4300' });
  const bob = await browser.newContext({ baseURL: 'http://localhost:4300' });
  await registerViaApi(alice.request);
  await registerViaApi(bob.request);

  const created = await alice.request.post('/api/tasks', {
    data: { taskName: 'Secreto de Alice', frequency: 'Daily', startDate: '2026-06-01', dueDate: '2026-06-10' }
  });
  const { taskId } = await created.json();

  const bobPage = await bob.newPage();
  await bobPage.goto('/tasks');
  await expect(bobPage.getByRole('heading', { name: 'Tasks' }).first()).toBeVisible();
  await expect(bobPage.getByText('Secreto de Alice')).toHaveCount(0);
  expect((await bob.request.get(`/api/tasks/${taskId}`)).status()).toBe(404);
  expect((await bob.request.delete(`/api/tasks/${taskId}`)).status()).toBe(404);

  await alice.close();
  await bob.close();
});
