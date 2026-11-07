import { createApiClient } from '../../src/app/api/client'
import { socketEventSource } from '../../src/app/events'
import { createLiveServices } from '../../src/app/live-services'
import type { AppServices } from '../../src/app/services'

/** Public Worker transport only. Chromium owns the HttpOnly session cookie. */
export function createDesktopServices(
  target: Window,
  appOrigin: string,
): AppServices {
  return {
    ...createLiveServices(target),
    api: createApiClient((path, init) =>
      target.fetch(new URL(path, appOrigin).href, {
        ...init,
        credentials: 'include',
      }),
    ),
    events: socketEventSource(appOrigin),
    leave: (path) => target.location.assign(new URL(path, appOrigin).href),
  }
}
