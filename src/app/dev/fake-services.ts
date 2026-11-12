import { copyText } from '../clipboard'
import { FakeApiServer } from '../../test-support/fake-api'
import { devOrgOrderRoute } from '../../test-support/dev-org-order-route'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { API_PATHS } from '../../shared/api'
import { createApiClient } from '../api/client'
import { browserDelay, type WorkspaceEventSource } from '../events'
import {
  windowFocus,
  windowInput,
  windowKeys,
  windowPlatform,
  windowStorage,
  windowVisibility,
  type AppServices,
} from '../services'
import { accountRoutes } from './account-routes'
import { attachmentRoutes } from './attachment-routes'
import { createBackend, guardScope } from './backend'
import { buildRoutes } from './build-routes'
import { createRoutes } from './create-routes'
import { feedbackRoutes } from './feedback-routes'
import { APP_VERSION } from '../version'
import { operatorRoutes } from './operator-routes'
import { readDevOptions } from './options'
import { orgRoutes } from './org-routes'
import { routineRoutes } from './routine-routes'
import { devFileTransport } from './progress-fixture'
import { routeFetch, RouteError, type Route } from './router'
import { runRoutes } from './run-routes'
import { sectionRoutes } from './section-routes'
import { seedState } from './seed'
import { settingsRoutes } from './settings-routes'
import { admitOpenSignup, waitlistRoutes } from './waitlist-routes'
import { workspaceRoutes } from './workspace-routes'

/**
 * The services of the app in development, over the recorded fake API.
 * Reads come from an in-memory state that the fixtures fill, and writes
 * change it, so a later read shows the edit. Requests that the state does
 * not answer go to the recorded server. `search`, the query string of the
 * page, picks the preview state, as `DevOptions` says. `main.tsx` loads
 * this module only in development, so production never bundles it.
 */
export function createFakeServices(search: string): AppServices {
  const options = readDevOptions(search)
  const server = new FakeApiServer(options.server)
  const offset = FAKE_TIME - Date.now()
  const now = () => Date.now() + offset
  const newId = () => crypto.randomUUID()
  const backend = createBackend(seedState(options), server.events, now, newId)
  const signedOut: Route[] = options.signedOut
    ? [
        {
          method: 'GET',
          path: API_PATHS.session,
          answer: () => {
            throw new RouteError(401, 'unauthorized', 'Sign in to continue.')
          },
        },
      ]
    : []
  const routes = [
    ...signedOut,
    ...waitlistRoutes(backend),
    ...feedbackRoutes(backend, options),
    ...accountRoutes(backend),
    devOrgOrderRoute(backend),
    ...orgRoutes(backend),
    ...sectionRoutes(backend),
    ...workspaceRoutes(backend),
    ...createRoutes(backend),
    ...attachmentRoutes(backend, options.upload),
    ...settingsRoutes(backend),
    ...buildRoutes(backend),
    ...routineRoutes(backend),
    ...runRoutes(backend),
    ...operatorRoutes(backend),
  ]
  const fetch = routeFetch(
    routes,
    (path, method) => {
      admitOpenSignup(backend)
      guardScope(backend.state, path, method)
    },
    server.fetch,
  )
  const events: WorkspaceEventSource = {
    open: (target, handlers) =>
      server.events.subscribe(target.afterEventNumber, handlers.message),
  }
  return {
    api: createApiClient(fetch, devFileTransport(fetch, search)),
    events,
    now,
    delay: browserDelay,
    onFocus: windowFocus(window),
    onInput: windowInput(window),
    onKey: windowKeys(window),
    platform: windowPlatform(window),
    visible: windowVisibility(window),
    storage: windowStorage(window),
    newId,
    leave: (url) => window.location.assign(url),
    appOrigin: window.location.origin,
    appVersion: APP_VERSION,
    copy: (text) => copyText(window, text),
  }
}
