import { defineConfig, devices } from '@playwright/test';
import { OUTBOX_DIR } from './e2e/outbox';

const CI = !!process.env['CI'];

/**
 * Tests e2e de la aplicación completa: frontend (ng serve) + backend real + PostgreSQL.
 * Cada test registra su propio usuario, así que son independientes y pueden ejecutarse en paralelo.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4300',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm --prefix server run build && node server/dist/main.js',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !CI,
      timeout: 120_000,
      env: {
        DATABASE_URL: process.env['E2E_DATABASE_URL'] ?? 'postgres://goal:goal@localhost:5432/goal_planner_e2e',
        // Los tests registran muchos usuarios desde la misma IP
        AUTH_RATE_LIMIT: '10000',
        // Sin SMTP: los emails se guardan como JSON y los tests leen el enlace de ahí
        MAIL_OUTBOX_DIR: OUTBOX_DIR,
        APP_URL: 'http://localhost:4300'
      }
    },
    {
      command: 'npx ng serve --port 4300',
      url: 'http://localhost:4300',
      reuseExistingServer: !CI,
      timeout: 180_000
    }
  ]
});
