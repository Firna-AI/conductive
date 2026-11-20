import { createLiveServices } from '../../src/app/live-services'
import type { AppServices } from '../../src/app/services'

/**
 * Public Worker transport only. Chromium owns the HttpOnly session cookie.
 * Requests and file uploads go to the app origin with that cookie.
 */
export function createDesktopServices(
  target: Window,
  appOrigin: string,
): AppServices {
  const services = createLiveServices(target, appOrigin, 'include')
  services.platform = 'mac'
  services.host = { kind: 'mac-app', system: 'mac' }
  return services
}
