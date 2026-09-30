import { FormControl, FormGroup } from '@angular/forms';
import { passwordsMatchValidator } from './password-validators';

describe('passwordsMatchValidator', () => {
  const form = (password: string, confirm: string) =>
    new FormGroup(
      { password: new FormControl(password), confirm: new FormControl(confirm) },
      { validators: passwordsMatchValidator('password', 'confirm') }
    );

  it('flags a confirmation that does not match', () => {
    expect(form('supersecret', 'supersecreT').hasError('passwordMismatch')).toBe(true);
  });

  it('accepts matching values and waits until the confirmation is typed', () => {
    expect(form('supersecret', 'supersecret').valid).toBe(true);
    expect(form('supersecret', '').hasError('passwordMismatch')).toBe(false);
  });
});
