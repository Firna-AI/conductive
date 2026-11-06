import { createApiClient } from './api/client'
import { browserDelay, socketEventSource } from './events'
import {
  windowFocus,
  windowInput,
  windowStorage,
  windowVisibility,
  type AppServices,
} from './services'

/** The services of the deployed app: the Worker on the origin of the page. */
export function createLiveServices(target: Window): AppServices {
  return {
    api: createApiClient((input, init) => target.fetch(input, init)),
    events: socketEventSource(target.location.origin),
    now: () => Date.now(),
    delay: browserDelay,
    onFocus: windowFocus(target),
    onInput: windowInput(target),
    visible: windowVisibility(target),
    storage: windowStorage(target),
    newId: () => target.crypto.randomUUID(),
    leave: (url) => target.location.assign(url),
    copy: (text) => target.navigator.clipboard.writeText(text),
  }
}
