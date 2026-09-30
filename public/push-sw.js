// Service Worker de Goal Planner: solo gestiona las notificaciones push de los recordatorios
// (no cachea nada). Se registra desde PushService con el scope del idioma (/en/, /es/ o /).

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Goal Planner', {
      body: data.body,
      // Misma etiqueta que el aviso de la pestaña abierta: el navegador sustituye en vez de duplicar
      tag: data.tag,
      icon: 'favicon.ico',
      data: { url: data.url || '' }
    })
  );
});

// Al pulsar la notificación: enfoca una pestaña de la app (y la lleva a la página) o abre una nueva
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? '', self.registration.scope).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const tab = windows.find(client => client.url.startsWith(self.registration.scope));
      if (!tab) return self.clients.openWindow(url);
      await tab.focus();
      if (tab.url !== url) await tab.navigate(url).catch(() => undefined);
    })()
  );
});
