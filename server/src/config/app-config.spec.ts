import { describe, expect, it } from 'vitest';
import { loadConfig } from './app-config.js';

const production = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://localhost/db',
  JWT_SECRET: 'x'.repeat(32),
  SMTP_URL: 'smtp://mail.example.com:587',
  APP_URL: 'https://goals.example.com/'
};

describe('loadConfig', () => {
  it('uses safe development defaults for mail and links', () => {
    const config = loadConfig({ DATABASE_URL: 'postgres://localhost/db' });
    expect(config.smtpUrl).toBeNull();
    expect(config.appUrl).toBe('http://localhost:4200');
  });

  it('requires SMTP_URL and APP_URL in production', () => {
    expect(() => loadConfig({ ...production, SMTP_URL: '' })).toThrow(/SMTP_URL/);
    expect(() => loadConfig({ ...production, APP_URL: undefined })).toThrow(/APP_URL/);
  });

  it('strips the trailing slash of APP_URL', () => {
    expect(loadConfig(production).appUrl).toBe('https://goals.example.com');
  });
});
