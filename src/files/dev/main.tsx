import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../docs/mockups/src/render.css'
import type { WorkspaceIdentity } from '../../app/workspace-store'
import { FakeApiServer } from '../../test-support/fake-api'
import { storeFailedRepairs } from '../../test-support/recorded-repairs'
import { createFilesClient } from '../api/files-client'
import { WorkspaceFiles, type FilesSubscribe } from '../model/files-store'
import { registerDevFiles } from './dev-fixtures'
import { devTargets } from './dev-targets'
import { DevApp } from './DevApp'
import { storeUnreadTree } from './dev-unread'
import { readView } from './dev-view'
import { devNow } from './RepairControls'

/**
 * Development entry of the Files screens, at /src/files/dev.html. It runs
 * the screens against the fake API and its recorded events. The product
 * build does not include it.
 */
const server = new FakeApiServer()
registerDevFiles(server)
const baseline = server.events.history().throughEventNumber
const view = readView(location.search)
const live = view.scenario === 'live'
// The stored history of the lists that `?repair=` names: a lost update,
// then its lost fresh report. Both data sets read it.
storeFailedRepairs(
  server.events,
  view.repair.map((repair) =>
    repair === 'all-files' ? 'files.snapshot' : 'changes.updated',
  ),
  devNow(),
)
storeUnreadTree(server, view.tree, devNow())
// Mockup data reads the routes only. Live data replays the recorded events.
const subscribe: FilesSubscribe = (after, listener) =>
  server.events.subscribe(live ? after : Math.max(after, baseline), listener)

/** Makes the store of the page over the fake API. It starts nothing. */
function createFiles({
  orgId,
  workspaceId,
}: WorkspaceIdentity): WorkspaceFiles {
  return new WorkspaceFiles({
    client: createFilesClient({ fetch: server.fetch, orgId, workspaceId }),
    subscribe,
  })
}

const targets = devTargets(server)

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <DevApp createFiles={createFiles} server={server} targets={targets} />
    </StrictMode>,
  )
}
