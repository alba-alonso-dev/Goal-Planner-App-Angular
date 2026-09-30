import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BROWSER_PUSH, BrowserPush } from './browser-push';
import { PushService } from './push.service';
import { signInTestUser, TEST_USER } from '../../../testing/fixtures';

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';

function fakeSubscription() {
  return {
    endpoint: ENDPOINT,
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'key', auth: 'auth' } }),
    unsubscribe: vi.fn(async () => true)
  } as unknown as PushSubscription & { unsubscribe: ReturnType<typeof vi.fn> };
}

function fakeBrowser(overrides: Partial<BrowserPush> = {}) {
  const store = new Map<string, string>();
  let subscription: PushSubscription | null = null;
  const browser = {
    supported: true,
    permission: vi.fn((): NotificationPermission => 'default'),
    requestPermission: vi.fn(async (): Promise<NotificationPermission> => 'granted'),
    getSubscription: vi.fn(async () => subscription),
    subscribe: vi.fn(async () => (subscription = fakeSubscription())),
    storage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key)
    },
    ...overrides
  };
  return { browser, store, setSubscription: (value: PushSubscription | null) => (subscription = value) };
}

/** Deja avanzar las promesas encadenadas del servicio. */
const settle = () => new Promise(resolve => setTimeout(resolve));

describe('PushService', () => {
  let httpTesting: HttpTestingController;

  const setup = (browser: BrowserPush) => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: BROWSER_PUSH, useValue: browser }]
    });
    httpTesting = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(PushService);
    return service;
  };

  /** Inicia sesión y responde a la configuración de push del servidor. */
  const signIn = async (publicKey: string | null = 'BPublicKey') => {
    signInTestUser();
    TestBed.tick();
    await settle();
    httpTesting.expectOne('/api/push/config').flush({ publicKey });
    await settle();
  };

  afterEach(() => httpTesting.verify());

  it('reports unsupported browsers without calling the server', async () => {
    const service = setup(fakeBrowser({ supported: false }).browser);
    signInTestUser();
    TestBed.tick();
    await settle();
    expect(service.state()).toBe('unsupported');
  });

  it('is unavailable when the server has no VAPID key', async () => {
    const service = setup(fakeBrowser().browser);
    await signIn(null);
    expect(service.state()).toBe('unavailable');
  });

  it('subscribes this browser and registers it for the user', async () => {
    const { browser, store } = fakeBrowser();
    const service = setup(browser);
    await signIn();
    expect(service.state()).toBe('off');

    const enabling = service.enable();
    await settle();
    const req = httpTesting.expectOne({ method: 'POST', url: '/api/push/subscriptions' });
    expect(req.request.body).toEqual({ endpoint: ENDPOINT, keys: { p256dh: 'key', auth: 'auth' }, locale: 'en' });
    req.flush(null);
    await enabling;

    expect(browser.subscribe).toHaveBeenCalledWith('BPublicKey');
    expect(service.state()).toBe('on');
    expect(store.get('gp_push_owner')).toBe(String(TEST_USER.userId));
  });

  it('does not subscribe when the user blocks notifications', async () => {
    const { browser } = fakeBrowser({ requestPermission: vi.fn(async () => 'denied' as const) });
    const service = setup(browser);
    await signIn();

    await service.enable();
    expect(browser.subscribe).not.toHaveBeenCalled();
    expect(service.state()).toBe('denied');
  });

  it('re-registers an existing subscription of the same user', async () => {
    const fake = fakeBrowser({ permission: vi.fn(() => 'granted' as const) });
    fake.setSubscription(fakeSubscription());
    fake.store.set('gp_push_owner', String(TEST_USER.userId));
    const service = setup(fake.browser);

    await signIn();
    httpTesting.expectOne({ method: 'POST', url: '/api/push/subscriptions' }).flush(null);
    await settle();
    expect(service.state()).toBe('on');
  });

  it("drops a subscription left behind by someone else's session", async () => {
    const fake = fakeBrowser({ permission: vi.fn(() => 'granted' as const) });
    const leftover = fakeSubscription();
    fake.setSubscription(leftover);
    fake.store.set('gp_push_owner', '999');
    const service = setup(fake.browser);

    await signIn();
    httpTesting.expectNone('/api/push/subscriptions');
    expect(leftover.unsubscribe).toHaveBeenCalled();
    expect(service.state()).toBe('off');
  });

  it('forgets the browser on logout: server first, then the browser', async () => {
    const fake = fakeBrowser();
    const subscription = fakeSubscription();
    fake.setSubscription(subscription);
    fake.store.set('gp_push_owner', '1');
    const service = setup(fake.browser);

    const forgetting = service.forgetBrowser();
    await settle();
    const req = httpTesting.expectOne({ method: 'DELETE', url: '/api/push/subscriptions' });
    expect(req.request.body).toEqual({ endpoint: ENDPOINT });
    req.flush(null);
    await forgetting;

    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(fake.store.has('gp_push_owner')).toBe(false);
  });
});
