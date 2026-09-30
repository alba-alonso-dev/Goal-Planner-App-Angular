import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct horse battery staple');

    expect(stored).toMatch(/^scrypt\$\d+\$8\$1\$/);
    expect(await verifyPassword('correct horse battery staple', stored)).toBe(true);
    expect(await verifyPassword('Correct horse battery staple', stored)).toBe(false);
  });

  it('uses a random salt, so the same password produces different hashes', async () => {
    expect(await hashPassword('secret-password')).not.toBe(await hashPassword('secret-password'));
  });

  it('rejects malformed stored values instead of throwing', async () => {
    expect(await verifyPassword('x', 'plain-text')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$1$2$3$a$b')).toBe(false);
  });
});
