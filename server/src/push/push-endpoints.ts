/**
 * Servicios de push de los navegadores. Solo se aceptan suscripciones a estos hosts: el servidor
 * hace peticiones a la URL que envía el cliente, y sin esta lista podría usarse contra redes internas.
 */
const PUSH_SERVICE_HOSTS = [
  'fcm.googleapis.com', // Chrome, Edge, Opera, Samsung
  'push.services.mozilla.com', // Firefox (updates.push.services.mozilla.com)
  'notify.windows.com', // Edge heredado
  'push.apple.com' // Safari (web.push.apple.com)
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' &&
    PUSH_SERVICE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))
  );
}
