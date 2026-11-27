import { copyText } from '../clipboard'
import { FakeApiServer } from '../../test-support/fake-api'
import { devOrgOrderRoute } from '../../test-support/dev-org-order-route'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { API_PATHS } from '../../shared/api'
import { createApiClient } from '../api/client'
import { browserDelay } from '../events'
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
} from '../services'
import { accountRoutes } from './account-routes'
import { attachmentRoutes } from './attachment-routes'
import { attachmentFileRoutes } from './attachment-files'
import { attachmentMessageFetch } from './attachment-message-routes'
import { createBackend, guardScope } from './backend'
import { branchRoutes } from './branch-routes'
import { buildRoutes } from './build-routes'
import { seedCapabilityNotes } from './capability-note-seed'
import { createRoutes } from './create-routes'
import { feedbackRoutes } from './feedback-routes'
import { APP_VERSION } from '../version'
import { operatorRoutes } from './operator-routes'
import { readDevOptions } from './options'
import { orgLoginRoutes } from './org-login-routes'
import { orgRoutes } from './org-routes'
import { queueRoutes, seedMergeQueue } from './queue-routes'
import { automationRoutes } from './automation-routes'
import { devFileTransport } from './progress-fixture'
import { routeFetch, RouteError, type Route } from './router'
import { runRoutes } from './run-routes'
import { secretRequestRoutes } from './secret-request-routes'
import { seedSecretRequests } from './secret-request-seed'
import { secretRoutes } from './secret-routes'
import { sectionRoutes } from './section-routes'
import { seedState } from './seed'
import { sessionLoginRoutes } from './session-login-routes'
import { settingsRoutes } from './settings-routes'
import { seedSkills, skillsRoutes } from './skills-routes'
import { seedSkillChips, skillTabRoutes } from './skill-tab-routes'
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
  const state = seedState(options)
  const workspaceStates = new Map(
    state.orgs.flatMap((org) =>
      org.workspaces.map(
        (workspace) => [workspace.id, workspace.state] as const,
      ),
    ),
  )
  const server = new FakeApiServer({ ...options.server, workspaceStates })
  const offset = FAKE_TIME - Date.now()
  const now = () => Date.now() + offset
  const newId = () => crypto.randomUUID()
  seedSkills(state, options.skills, options.skillsTrusted)
  const acme = state.orgs.find((org) => org.org.id === FAKE_IDS.org)
  if (acme) seedMergeQueue(acme, options.mergeQueue)
  const backend = createBackend(state, server.events, now, newId)
  seedSecretRequests(backend, server.events, options.secrets)
  seedCapabilityNotes(server.events, options.capabilities)
  seedSkillChips(server.events, options.skillChips, options.skillRead)
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
    ...sessionLoginRoutes(options.sessionLogin, server.fetch, state),
    ...waitlistRoutes(backend),
    ...feedbackRoutes(backend, options),
    ...accountRoutes(backend),
    devOrgOrderRoute(backend),
    ...orgRoutes(backend),
    ...sectionRoutes(backend),
    ...workspaceRoutes(backend),
    ...queueRoutes(backend, server.fetch),
    ...createRoutes(backend, options.branchCheck),
    ...branchRoutes(backend, options.branches),
    ...attachmentRoutes(backend, options.upload),
    ...attachmentFileRoutes(backend),
    ...settingsRoutes(backend),
    ...skillsRoutes(backend, options.skills),
    ...skillTabRoutes(backend, options.skillRead),
    ...orgLoginRoutes(backend),
    ...secretRoutes(backend),
    ...secretRequestRoutes(backend),
    ...buildRoutes(backend),
    ...automationRoutes(backend),
    ...runRoutes(backend),
    ...operatorRoutes(backend),
  ]
  const fetch = routeFetch(
    routes,
    (path, method) => {
      admitOpenSignup(backend)
      guardScope(backend.state, path, method)
    },
    attachmentMessageFetch(backend, server.fetch),
  )
  return {
    api: createApiClient(fetch, devFileTransport(fetch, search)),
    events: server.events,
    now,
    delay: browserDelay,
    onFocus: windowFocus(window),
    onInput: windowInput(window),
    onKey: windowKeys(window),
    platform: windowPlatform(window),
    host: windowHost(window),
    visible: windowVisibility(window),
    storage: windowStorage(window),
    newId,
    leave: (url) => window.location.assign(url),
    openInNewTab: windowNewTab(window),
    appOrigin: window.location.origin,
    appVersion: APP_VERSION,
    copy: (text) => copyText(window, text),
  }
}
