import { DOCUMENT } from '@angular/common';
import { InjectionToken, inject } from '@angular/core';

/** APIs del navegador que usa PushService, agrupadas para poder sustituirlas en los tests. */
export interface BrowserPush {
  /** Service Worker, PushManager y Notification disponibles (y contexto seguro). */
  readonly supported: boolean;
  permission(): NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  /** Suscripción actual de este navegador, si la hay. */
  getSubscription(): Promise<PushSubscription | null>;
  subscribe(applicationServerKey: string): Promise<PushSubscription>;
  /** Persistencia local mínima (quién activó el push en este navegador). */
  readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
}

const SERVICE_WORKER = 'push-sw.js';

export const BROWSER_PUSH = new InjectionToken<BrowserPush>('BROWSER_PUSH', {
  providedIn: 'root',
  factory: () => {
    const window = inject(DOCUMENT).defaultView;
    const supported =
      !!window?.isSecureContext &&
      'serviceWorker' in window.navigator &&
      'PushManager' in window &&
      'Notification' in window;

    // La ruta es relativa al <base href>: en el build de cada idioma el scope es /en/ o /es/
    const registration = async () =>
      (await window!.navigator.serviceWorker.getRegistration(SERVICE_WORKER)) ??
      window!.navigator.serviceWorker.register(SERVICE_WORKER);

    let storage: BrowserPush['storage'] = null;
    try {
      storage = window?.localStorage ?? null;
    } catch {
      storage = null; // navegación privada con el almacenamiento bloqueado
    }

    return {
      supported,
      storage,
      permission: () => (supported ? window!.Notification.permission : 'denied'),
      requestPermission: () => window!.Notification.requestPermission(),
      getSubscription: async () => {
        if (!supported) return null;
        const existing = await window!.navigator.serviceWorker.getRegistration(SERVICE_WORKER);
        return existing ? existing.pushManager.getSubscription() : null;
      },
      subscribe: async applicationServerKey => {
        const reg = await registration();
        await window!.navigator.serviceWorker.ready;
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToBytes(applicationServerKey)
        });
      }
    } satisfies BrowserPush;
  }
});

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
