import { copyText } from './clipboard'
import { appDomain } from '../../docs/mockups/src/brand'
import { createApiClient } from './api/client'
import { xhrFileTransport } from './api/xhr-files'
import { browserDelay, socketEventSource } from './events'
import {
  windowFocus,
  windowInput,
  windowKeys,
  windowPlatform,
  windowStorage,
  windowVisibility,
  type AppServices,
} from './services'

/**
 * The origin of the app host. A browser loads the app from that host. The
 * Mac app loads the app from its own origin, so it names the app host of
 * the brand.
 */
function appHostOrigin(location: Location): string {
  return location.protocol === 'https:' || location.protocol === 'http:'
    ? location.origin
    : `https://${appDomain}`
}

/**
 * The services of the deployed app: the Worker on the origin of the page.
 * Files upload from the same origin, with a native `XMLHttpRequest`.
 */
export function createLiveServices(target: Window): AppServices {
  return {
    api: createApiClient(
      (input, init) => target.fetch(input, init),
      xhrFileTransport(
        () => new XMLHttpRequest(),
        (path) => path,
      ),
    ),
    events: socketEventSource(target.location.origin),
    now: () => Date.now(),
    delay: browserDelay,
    onFocus: windowFocus(target),
    onInput: windowInput(target),
    onKey: windowKeys(target),
    platform: windowPlatform(target),
    visible: windowVisibility(target),
    storage: windowStorage(target),
    newId: () => target.crypto.randomUUID(),
    leave: (url) => target.location.assign(url),
    appOrigin: appHostOrigin(target.location),
    copy: (text) => copyText(target, text),
  }
}
