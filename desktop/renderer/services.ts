import { createApiClient } from '../../src/app/api/client'
import { xhrFileTransport } from '../../src/app/api/xhr-files'
import { socketEventSource } from '../../src/app/events'
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
  const address = (path: string) => new URL(path, appOrigin).href
  return {
    ...createLiveServices(target),
    api: createApiClient(
      (path, init) =>
        target.fetch(address(path), { ...init, credentials: 'include' }),
      xhrFileTransport(() => new XMLHttpRequest(), address),
    ),
    events: socketEventSource(appOrigin),
    leave: (path) => target.location.assign(new URL(path, appOrigin).href),
  }
}
