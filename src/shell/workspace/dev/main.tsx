import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createApiClient } from '../../../app/api/client'
import { AppModel } from '../../../app/app-model'
import { browserDelay } from '../../../app/events'
import {
  windowFocus,
  windowInput,
  windowKeys,
  windowPlatform,
  windowVisibility,
} from '../../../app/services'
import type { WorkspaceSocketMessage } from '../../../shared/events'
import { FakeApiServer } from '../../../test-support/fake-api'
import { scenarioFetch } from '../../../test-support/fake-bar-dev'
import { fetchFiles } from '../../../test-support/fake-files'
import {
  FAKE_IDS,
  FAKE_TIME,
  fakeUser,
  fakeUsers,
} from '../../../test-support/fixtures/core'
import { senderSnapshot } from '../../../test-support/fixtures/workspaces'
import { storeFailedRepairs } from '../../../test-support/recorded-repairs'
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
storeFailedRepairs(server.events, options.repair, now())
if (bar && options.member) server.signIn(fakeUsers[1])
// The actions of the bar answer as the Worker does, with its state.
const fetch = bar
  ? scenarioFetch(
      server,
      bar.scenario,
      senderSnapshot(options.member ? fakeUsers[1] : fakeUser),
      now,
    )
  : server.fetch
// A first-start state opens the new workspace of the create flow instead.
const workspaceId = options.start
  ? seedFirstStart(server, options.start, options.member)
  : FAKE_IDS.workspace
/**
 * The messages of one workspace, as its own socket gives them. The fake
 * keeps one log for every workspace, and a first-start state opens a second
 * workspace.
 */
function ofWorkspace(
  workspaceId: string,
  listener: (message: WorkspaceSocketMessage) => void,
) {
  return (message: WorkspaceSocketMessage) => {
    if (message.type === 'event') {
      if (message.envelope.workspaceId === workspaceId) listener(message)
      return
    }
    const events = message.history.events.filter(
      (envelope) => envelope.workspaceId === workspaceId,
    )
    listener({ type: 'history', history: { ...message.history, events } })
  }
}

const app = new AppModel({
  api: createApiClient(fetch, fetchFiles(fetch)),
  events: {
    open: (target, handlers) =>
      server.events.subscribe(
        target.afterEventNumber,
        ofWorkspace(target.workspaceId, handlers.message),
      ),
  },
  now,
  delay: browserDelay,
  onFocus: windowFocus(window),
  onInput: windowInput(window),
  onKey: windowKeys(window),
  platform: windowPlatform(window),
  visible: windowVisibility(window),
  storage: null,
  newId: () => crypto.randomUUID(),
  leave: () => undefined,
  appOrigin: window.location.origin,
  copy: (text) => navigator.clipboard.writeText(text),
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
