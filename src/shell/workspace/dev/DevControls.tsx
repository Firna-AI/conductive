import type { WorkspaceEvent } from '../../../shared/events'
import type { RunnerReportKind } from '../../../shared/runner'
import type { FakeApiServer } from '../../../test-support/fake-api'
import {
  firstLoss,
  fullReport,
  nextEnvelope,
  refusedReport,
  treeUpdate,
} from '../../../test-support/recorded-repairs'
import type { WorkspaceFiles } from '../../../files/model/files-store'
import styles from './DevPage.module.css'

const kinds: readonly (readonly [string, RunnerReportKind])[] = [
  ['Name', 'workspace.title'],
  ['Start steps', 'start.updated'],
  ['All files', 'files.snapshot'],
  ['Changes', 'changes.updated'],
]

/**
 * The controls of the page. For each kind: the first loss, which shows
 * nothing, the loss of its fresh full report, which shows the notice, and a
 * full report, which clears it. A tree update leaves the notice of All
 * files. "Open the workspace again" mounts a new view, which reads the
 * stored history.
 */
export function DevControls(props: {
  server: FakeApiServer
  files: WorkspaceFiles
  now: () => number
  onNewView: () => void
}) {
  const { server, files } = props
  const emit = (event: WorkspaceEvent) =>
    server.events.emit(nextEnvelope(server.events, event, props.now()))
  const button = (label: string, event: () => WorkspaceEvent) => (
    <button onClick={() => emit(event())} type="button">
      {label}
    </button>
  )
  return (
    <div aria-label="Development controls" className={styles.controls}>
      {kinds.map(([label, kind]) => (
        <div className={styles.row} key={kind}>
          <span className={styles.label}>{label}</span>
          {button('Lose an update', () => firstLoss(kind))}
          {button('Lose its fresh report', () => refusedReport(kind, true))}
          {button('Send a full report', () => fullReport(kind))}
        </div>
      ))}
      <div className={styles.row}>
        {button('Send a tree update', () =>
          treeUpdate((files.getSnapshot().tree?.revision ?? 0) + 1),
        )}
        <button onClick={props.onNewView} type="button">
          Open the workspace again
        </button>
      </div>
    </div>
  )
}
