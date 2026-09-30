import { expect, test } from '@playwright/test';

// Comprueba el Service Worker real (public/push-sw.js): Chromium permite entregarle un mensaje push
// por DevTools sin pasar por el servicio de push del navegador (FCM)

// El Chromium completo en modo headless: el "headless shell" por defecto no permite notificaciones
test.use({ channel: 'chromium' });
test('the service worker shows the pushed reminder as a notification', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Push delivery via CDP is Chromium-only');
  await context.grantPermissions(['notifications'], { origin: 'http://localhost:4300' });

  const cdp = await context.newCDPSession(page);
  await cdp.send('ServiceWorker.enable');
  // CDP también informa de registros de otros contextos del mismo navegador (tests anteriores):
  // se entrega el push a todos los del origen y se comprueba la notificación en esta página
  const registrations = new Set<string>();
  cdp.on('ServiceWorker.workerRegistrationUpdated', ({ registrations: updated }) => {
    for (const r of updated) {
      if (r.scopeURL.startsWith('http://localhost:4300/') && !r.isDeleted) registrations.add(r.registrationId);
    }
  });

  await page.goto('/home');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('push-sw.js');
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => registrations.size).toBeGreaterThan(0);

  const data = JSON.stringify({ title: '⏰ Stand-up', body: 'Daily sync', tag: 'reminder-7', url: 'reminders' });
  for (const registrationId of registrations) {
    await cdp
      .send('ServiceWorker.deliverPushMessage', { origin: 'http://localhost:4300', registrationId, data })
      .catch(() => undefined); // un registro de un contexto ya cerrado
  }

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return (await registration.getNotifications()).map(n => ({ title: n.title, body: n.body, tag: n.tag }));
      })
    )
    .toEqual([{ title: '⏰ Stand-up', body: 'Daily sync', tag: 'reminder-7' }]);
});
