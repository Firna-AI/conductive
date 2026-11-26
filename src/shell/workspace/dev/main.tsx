import { copyText } from '../../../app/clipboard'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createApiClient } from '../../../app/api/client'
import { AppModel } from '../../../app/app-model'
import { browserDelay } from '../../../app/events'
import {
  windowFocus,
  windowHost,
  windowInput,
  windowKeys,
  windowNewTab,
  windowPlatform,
  windowVisibility,
} from '../../../app/services'
import { FakeApiServer } from '../../../test-support/fake-api'
import { scenarioFetch } from '../../../test-support/fake-bar-dev'
import {
  repositoryFetch,
  serveHeld,
} from '../../../test-support/fake-repository-change'
import { fetchFiles } from '../../../test-support/fake-files'
import {
  FAKE_IDS,
  FAKE_TIME,
  fakeUser,
  fakeUsers,
} from '../../../test-support/fixtures/core'
import { senderSnapshot } from '../../../test-support/fixtures/workspaces'
import { serveFakeServices } from '../../../test-support/fake-services'
import { storeLimitedLists } from '../../../test-support/limited-file-lists'
import {
  fullReport,
  nextEnvelope,
  storeFailedRepairs,
} from '../../../test-support/recorded-repairs'
import { seedFirstStart } from './dev-first-start'
import { readDevOptions } from './dev-options'
import { DevPage } from './DevPage'

/**
 * Development entry of the workspace screen, at /src/shell/workspace/dev/.
 * It runs the shell and the Files panel on the fake API and its recorded
 * events. The product build does not include it.
 */
const options = readDevOptions(location.search)
/** The time of the page. It stands still, so each age stays as drawn. */
const now = () => FAKE_TIME
const { bar } = options
// With the bar, `viewer=member` is a member of the org who may not archive.
const server = new FakeApiServer(
  bar
    ? {
        banner: bar.state,
        ...(bar.turn ? { conversation: 'running' } : {}),
        ...(options.member ? { role: 'member' } : {}),
      }
    : {},
)
// The limited lists go first, because a later full report of a list would
// clear its failed repair.
if (options.limited) storeLimitedLists(server.events, now())
storeFailedRepairs(server.events, options.repair, now())
// The services answer as the Worker does, beside the servers of a report.
if (options.services) {
  serveFakeServices(server, options.services, { now, hold: 1_500 })
  const ports = fullReport('ports.updated')
  server.events.emit(nextEnvelope(server.events, ports, now()))
}
if (bar && options.member) server.signIn(fakeUsers[1])
const member = senderSnapshot(options.member ? fakeUsers[1] : fakeUser)
// The actions of the bar answer as the Worker does, with its state.
const barFetch = bar
  ? scenarioFetch(server, bar.scenario, member, now)
  : server.fetch
// A repository change answers as the Worker does, over each chosen folder,
// with the branch names of the bar.
if (options.repository) {
  serveHeld(server, ['storefront', 'billing-service', 'marketing-site'])
}
const fetch = options.repository
  ? repositoryFetch(
      server,
      options.repository,
      member,
      now,
      barFetch,
      bar?.scenario.branches,
    )
  : barFetch
// A first-start state opens the new workspace of the create flow instead.
const workspaceId = options.start
  ? seedFirstStart(server, options.start, options.member)
  : FAKE_IDS.workspace
const app = new AppModel({
  api: createApiClient(fetch, fetchFiles(fetch)),
  events: server.events,
  now,
  delay: browserDelay,
  onFocus: windowFocus(window),
  onInput: windowInput(window),
  onKey: windowKeys(window),
  platform: windowPlatform(window),
  host: windowHost(window),
  visible: windowVisibility(window),
  storage: null,
  newId: () => crypto.randomUUID(),
  leave: () => undefined,
  openInNewTab: windowNewTab(window),
  appOrigin: window.location.origin,
  copy: (text) => copyText(window, text),
})

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <DevPage
        app={app}
        now={now}
        options={options}
        server={server}
        workspaceId={workspaceId}
      />
    </StrictMode>,
  )
}
