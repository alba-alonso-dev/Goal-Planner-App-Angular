import { describe, expect, it } from 'vitest';
import { isAllowedPushEndpoint } from './push-endpoints.js';

describe('isAllowedPushEndpoint', () => {
  it('accepts the push services of the main browsers', () => {
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe(true);
    expect(isAllowedPushEndpoint('https://web.push.apple.com/abc')).toBe(true);
    expect(isAllowedPushEndpoint('https://wns2-par02p.notify.windows.com/w/?token=abc')).toBe(true);
  });

  it('rejects other hosts, look-alikes and plain http', () => {
    expect(isAllowedPushEndpoint('https://localhost:3000/api/tasks')).toBe(false);
    expect(isAllowedPushEndpoint('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com.evil.example/abc')).toBe(false);
    expect(isAllowedPushEndpoint('https://evilfcm.googleapis.com/abc')).toBe(false);
    expect(isAllowedPushEndpoint('http://fcm.googleapis.com/fcm/send/abc')).toBe(false);
    expect(isAllowedPushEndpoint('not a url')).toBe(false);
  });
});
