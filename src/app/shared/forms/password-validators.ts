import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Longitud mínima de contraseña (la misma que exige el backend). */
export const PASSWORD_MIN_LENGTH = 8;

/** Error `passwordMismatch` en el grupo si la confirmación no coincide (solo cuando ya se ha escrito). */
export function passwordsMatchValidator(passwordKey: string, confirmKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey)?.value;
    const confirm = group.get(confirmKey)?.value;
    return confirm && password !== confirm ? { passwordMismatch: true } : null;
  };
}
