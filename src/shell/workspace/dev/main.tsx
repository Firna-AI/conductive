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
import type { WorkspaceIdentity } from '../../../app/workspace-store'
import { createFilesClient } from '../../../files/api/files-client'
import { WorkspaceFiles } from '../../../files/model/files-store'
import type { WorkspaceSocketMessage } from '../../../shared/events'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_TIME } from '../../../test-support/fixtures/core'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
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
const server = new FakeApiServer()
storeFailedRepairs(server.events, options.repair, now())
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
  api: createApiClient(server.fetch),
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
  copy: (text) => navigator.clipboard.writeText(text),
})

/** Makes the store of the Files panel over the fake API. It starts nothing. */
function createFiles({
  orgId,
  workspaceId,
}: WorkspaceIdentity): WorkspaceFiles {
  return new WorkspaceFiles({
    client: createFilesClient({ fetch: server.fetch, orgId, workspaceId }),
    subscribe: (after, listener) => server.events.subscribe(after, listener),
  })
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <DevPage
        app={app}
        createFiles={createFiles}
        now={now}
        options={options}
        server={server}
        workspaceId={workspaceId}
      />
    </StrictMode>,
  )
}
