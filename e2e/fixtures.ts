import { APIRequestContext, Page, expect, test as base } from '@playwright/test';

export interface TestUser {
  fullName: string;
  emailId: string;
  password: string;
  mobileNo: string;
}

let counter = 0;
export const newUser = (): TestUser => ({
  fullName: 'E2E User',
  emailId: `e2e-${Date.now()}-${process.pid}-${++counter}@example.com`,
  password: 'supersecret',
  mobileNo: '600000000'
});

/** Registra un usuario vía API: la cookie de sesión queda en el contexto del navegador. */
export async function registerViaApi(request: APIRequestContext, user = newUser()): Promise<TestUser> {
  const response = await request.post('/api/auth/register', { data: user });
  expect(response.status(), await response.text()).toBe(201);
  return user;
}

/** Navega usando la barra de navegación (SPA), como haría un usuario. */
export async function navigateTo(page: Page, section: 'Dashboard' | 'Tasks' | 'Goals' | 'Reminders') {
  await page.locator('nav').getByRole('link', { name: section, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${section.toLowerCase()}$`));
}

/** Test con un usuario nuevo ya autenticado (se registra automáticamente antes de cada test). */
export const test = base.extend<{ user: TestUser }>({
  user: [
    async ({ page }, use) => {
      const user = await registerViaApi(page.request);
      await use(user);
    },
    { auto: true }
  ]
});

export { expect };
