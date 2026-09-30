/**
 * Locale de la aplicación. En los builds localizados (`ng build`, ver `i18n` en angular.json) lo fija
 * `@angular/localize` al incrustar las traducciones y es el mismo valor que recibe `LOCALE_ID`;
 * en `ng serve` y en los tests es el locale de origen (en-US).
 *
 * Lo usan las funciones de dominio puras, que no pueden inyectar `LOCALE_ID`.
 */
export function currentLocale(): string {
  return (typeof $localize !== 'undefined' && $localize.locale) || 'en-US';
}
