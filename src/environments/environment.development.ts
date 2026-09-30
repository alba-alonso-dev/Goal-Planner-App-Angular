// Configuración de desarrollo (sustituye a environment.ts en `ng serve`).
// `ng serve` redirige /api al backend local (proxy.conf.json), así que la app y la API comparten origen.
export const environment = {
  production: false,
  apiBaseUrl: '/api'
};
