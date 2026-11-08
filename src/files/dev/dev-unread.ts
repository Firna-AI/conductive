import { filePaths } from '../../shared/files'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { nextEnvelope } from '../../test-support/recorded-repairs'
import { devTree } from './dev-fixtures'
import type { DevTree } from './dev-view'

/**
 * Stores the state of `?tree=`, as the Worker keeps it: the cloud computer
 * could not read the files. The tree route marks the saved tree, or gives an
 * empty tree at revision 0 when no tree was saved. The stored history holds
 * the mark. A full report of the tree clears it.
 */
export function storeUnreadTree(
  server: FakeApiServer,
  tree: DevTree,
  at: number,
): void {
  if (tree === 'latest') return
  const path = filePaths.tree(FAKE_IDS.org, FAKE_IDS.workspace)
  const saved = tree === 'saved' ? devTree() : { revision: 0, entries: [] }
  server.json('GET', path, { ...saved, unavailable: true })
  const event = { type: 'files.unavailable' } as const
  server.events.emit(nextEnvelope(server.events, event, at))
}
