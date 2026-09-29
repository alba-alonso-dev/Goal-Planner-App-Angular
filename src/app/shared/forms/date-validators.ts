import { AbstractControl, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms';
import { daysBetween } from '../utils/date';

// Validadores de fechas reutilizables. Los que comparan varios campos se aplican al FormGroup,
// así se reevalúan al cambiar cualquiera de los campos y no se pisan con los validadores de cada control.

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && value !== '' && !isNaN(new Date(value).getTime());
}

/** Error `errorKey` en el grupo si la fecha `endKey` es anterior (en días) a `startKey`. */
export function dateOrderValidator(startKey: string, endKey: string, errorKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(startKey)?.value;
    const end = group.get(endKey)?.value;
    if (!isValidDate(start) || !isValidDate(end)) return null;
    return daysBetween(start, end) < 0 ? { [errorKey]: true } : null;
  };
}

/**
 * Error `milestoneOutOfRange` (con los índices afectados) si algún milestone tiene la fecha objetivo
 * fuera del intervalo del goal.
 */
export function milestonesWithinRangeValidator(startKey: string, endKey: string, milestonesKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(startKey)?.value;
    const end = group.get(endKey)?.value;
    const milestones = group.get(milestonesKey) as FormArray | null;
    if (!isValidDate(start) || !isValidDate(end) || !milestones) return null;

    const outOfRange = milestones.controls
      .map((control, index) => ({ index, date: control.get('targetDate')?.value }))
      .filter(({ date }) => isValidDate(date) && (daysBetween(start, date) < 0 || daysBetween(date, end) < 0))
      .map(({ index }) => index);

    return outOfRange.length ? { milestoneOutOfRange: outOfRange } : null;
  };
}

/**
 * Error `pastDate` si la fecha/hora ya pasó. Con `onlyWhenChanged`, solo se valida si el usuario ha
 * modificado el campo: así se puede editar el texto de un recordatorio vencido sin tener que moverlo.
 */
export function notInPastValidator(options: { onlyWhenChanged?: boolean; now?: () => Date } = {}): ValidatorFn {
  const now = options.now ?? (() => new Date());
  return (control: AbstractControl): ValidationErrors | null => {
    if (options.onlyWhenChanged && control.pristine) return null;
    if (!isValidDate(control.value)) return null;
    return new Date(control.value).getTime() < now().getTime() ? { pastDate: true } : null;
  };
}
