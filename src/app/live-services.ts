import { createApiClient } from './api/client'
import { socketEventSource } from './events'
import { windowStorage, type AppServices } from './services'

/** The services of the deployed app: the Worker on the origin of the page. */
export function createLiveServices(target: Window): AppServices {
  return {
    api: createApiClient((input, init) => target.fetch(input, init)),
    events: socketEventSource(target.location.origin),
    now: () => Date.now(),
    storage: windowStorage(target),
    newId: () => target.crypto.randomUUID(),
    leave: (url) => target.location.assign(url),
    copy: (text) => target.navigator.clipboard.writeText(text),
  }
}
