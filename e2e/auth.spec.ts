import { expect, newUser, registerViaApi, test } from './fixtures';
import { test as anonymous } from '@playwright/test';

anonymous.describe('authentication', () => {
  anonymous('registers from the UI, keeps the session after reload and logs out', async ({ page }) => {
    const user = newUser();
    await page.goto('/home');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page.getByRole('dialog', { name: 'Create your account' })).toBeVisible();

    await page.getByPlaceholder('Full Name').fill(user.fullName);
    await page.getByPlaceholder('Email').fill(user.emailId);
    await page.getByPlaceholder('Password').fill(user.password);
    await page.getByPlaceholder('Mobile number').fill(user.mobileNo);
    await page.getByRole('dialog').getByRole('button', { name: 'Sign Up' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    const session = (await page.context().cookies()).find(c => c.name === 'gp_session');
    expect(session).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api' });
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);

    await page.reload();
    await expect(page.getByText(user.emailId)).toBeVisible();

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.goto('/tasks');
    await expect(page).toHaveURL(/\/home$/);
  });

  anonymous('shows the server message for wrong credentials', async ({ page }) => {
    const user = await registerViaApi(page.request);
    await page.context().clearCookies();

    await page.goto('/home');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByPlaceholder('Email').fill(user.emailId);
    await page.getByPlaceholder('Password').fill('wrong-password');
    await page.getByRole('dialog').getByRole('button', { name: 'Login' }).click();

    await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\/home$/);
  });

  anonymous('login dialog: focus, Tab trap, Escape and focus restore', async ({ page }) => {
    await page.goto('/home');
    const opener = page.locator('nav').getByRole('button', { name: 'Login' });
    await opener.click();

    const dialog = page.getByRole('dialog', { name: 'Welcome Back!' });
    await expect(dialog).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeFocused();

    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });
});

test('the protected pages are reachable once logged in', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
