import { copyText } from './clipboard'
import { createApiClient } from './api/client'
import { xhrFileTransport } from './api/xhr-files'
import { socketEventSource } from './event-socket'
import { browserDelay } from './events'
import { APP_VERSION } from './version'
import {
  windowFocus,
  windowHost,
  windowInput,
  windowKeys,
  windowNewTab,
  windowPlatform,
  windowStorage,
  windowVisibility,
  type AppServices,
} from './services'

/**
 * The services of the Worker at `appOrigin`. A browser uses its page
 * origin and normal credentials. The Mac app always includes its cookie.
 * Files upload to the same origin, with a native `XMLHttpRequest`.
 */
export function createLiveServices(
  target: Window,
  appOrigin: string,
  credentials: RequestCredentials,
): AppServices {
  const address = (path: string) => new URL(path, appOrigin).href
  return {
    api: createApiClient(
      (path, init) =>
        target.fetch(address(path), {
          ...init,
          credentials:
            credentials === 'include'
              ? credentials
              : (init?.credentials ?? credentials),
        }),
      xhrFileTransport(() => new XMLHttpRequest(), address),
    ),
    events: socketEventSource(appOrigin),
    now: () => Date.now(),
    delay: browserDelay,
    onFocus: windowFocus(target),
    onInput: windowInput(target),
    onKey: windowKeys(target),
    platform: windowPlatform(target),
    host: windowHost(target),
    visible: windowVisibility(target),
    storage: windowStorage(target),
    newId: () => target.crypto.randomUUID(),
    leave: (path) => target.location.assign(address(path)),
    openInNewTab: windowNewTab(target),
    appOrigin,
    appVersion: APP_VERSION,
    copy: (text) => copyText(target, text),
  }
}
