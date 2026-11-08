import type { WorkspaceEvent } from '../../shared/events'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import {
  firstLoss,
  fullReport,
  nextEnvelope,
  refusedReport,
  treeUpdate,
} from '../../test-support/recorded-repairs'
import type { WorkspaceFiles } from '../model/files-store'

/** The time of the page. It stands still, so each age stays as drawn. */
export const devNow = () => FAKE_TIME

function emit(server: FakeApiServer, event: WorkspaceEvent): void {
  server.events.emit(nextEnvelope(server.events, event, devNow()))
}

/**
 * The controls of a lost update of each list: the first loss, which shows
 * nothing, the loss of its fresh full report, which shows the notice, and a
 * full report, which clears it. A tree update leaves the notice. A failed
 * read of the files marks the tree, until a full report of the tree.
 */
export function RepairControls(props: {
  server: FakeApiServer
  files: WorkspaceFiles
}) {
  const { server, files } = props
  const button = (label: string, event: () => WorkspaceEvent) => (
    <button onClick={() => emit(server, event())} type="button">
      {label}
    </button>
  )
  return (
    <>
      <span>All files:</span>
      {button('Lose an update', () => firstLoss('files.snapshot'))}
      {button('Lose its fresh report', () =>
        refusedReport('files.snapshot', true),
      )}
      {button('Send a full report', () => fullReport('files.snapshot'))}
      {button('Send a tree update', () =>
        treeUpdate((files.getSnapshot().tree?.revision ?? 0) + 1),
      )}
      {button('Fail a read of the files', () => ({
        type: 'files.unavailable',
      }))}
      <span>Changes:</span>
      {button('Lose an update', () => firstLoss('changes.updated'))}
      {button('Lose its fresh report', () =>
        refusedReport('changes.updated', true),
      )}
      {button('Send a full report', () => fullReport('changes.updated'))}
    </>
  )
}
