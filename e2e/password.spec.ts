import { expect, newUser, registerViaApi, test } from './fixtures';
import { lastMailTo } from './outbox';

test('forgot password: the emailed link sets a new password', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://localhost:4300' });
  const user = await registerViaApi(context.request, newUser());
  await context.request.post('/api/auth/logout');
  const page = await context.newPage();

  await page.goto('/home');
  await page.locator('nav').getByRole('button', { name: 'Login' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Forgot your password?' }).click();
  await dialog.getByPlaceholder('Email').fill(user.emailId);
  await dialog.getByRole('button', { name: 'Send link' }).click();
  await expect(dialog.getByRole('status')).toContainText('If an account exists for that email');

  const mail = await lastMailTo(user.emailId);
  const link = /http:\/\/localhost:4300\/reset-password\?token=[\w-]+/.exec(mail.text)![0];

  await page.goto(link);
  await expect(page).toHaveURL(/\/reset-password$/); // el token sale de la URL
  await page.getByLabel('New password', { exact: true }).fill('recovered-secret');
  await page.getByLabel('Repeat the new password').fill('recovered-secret');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByText('Your password has been changed')).toBeVisible();

  await page.getByRole('button', { name: 'Log in with your new password' }).click();
  await dialog.getByPlaceholder('Email').fill(user.emailId);
  await dialog.getByPlaceholder('Password').fill('recovered-secret');
  await dialog.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // El enlace no se puede reutilizar
  await page.goto(link);
  await page.getByLabel('New password', { exact: true }).fill('another-secret');
  await page.getByLabel('Repeat the new password').fill('another-secret');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toContainText('invalid or has expired');
  await context.close();
});

test('change password from the account page closes the other sessions', async ({ page, user, browser }) => {
  const otherDevice = await browser.newContext({ baseURL: 'http://localhost:4300' });
  await otherDevice.request.post('/api/auth/login', { data: { emailId: user.emailId, password: user.password } });

  await page.goto('/dashboard');
  await page.locator('nav').getByRole('link', { name: user.emailId }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByLabel('Current password').fill(user.password);
  await page.getByLabel('New password', { exact: true }).fill('brand-new-secret');
  await page.getByLabel('Repeat the new password').fill('brand-new-secret');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Your password has been changed')).toBeVisible();

  // Esta sesión sigue abierta; la del otro dispositivo, no
  await page.reload();
  await expect(page).toHaveURL(/\/account$/);
  expect((await otherDevice.request.get('/api/auth/me')).status()).toBe(401);
  await otherDevice.close();
});
