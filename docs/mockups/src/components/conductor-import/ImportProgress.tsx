import { ProgressBar } from '@firna/ui/loader'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleCheck } from 'lucide-react'
import type { ConductorRow } from '../../fixtures/conductorImport'
import {
  importedSessions,
  type ImportReport,
} from '../../fixtures/conductorUploads'
import { orgs } from '../../fixtures/orgs'
import type { Workspace } from '../../fixtures/workspaces'
import { formatSize } from '../chat/sizes'
import { Notice } from '../common/Notice'
import { StatusText } from '../common/StatusText'
import { ImportReportLists } from './ImportReport'
import { ImportedChip, sessionCount } from './ImportRows'
import styles from './ImportProgress.module.css'

/**
 * A workspace of the import, the row that it came from, and its upload.
 * The workspace exists only once its upload is complete.
 */
export type ImportItem = {
  workspace: Workspace
  row: ConductorRow
  /** The bytes that went up so far. */
  sent: number
}

/** The workspaces in words, such as "2 workspaces". */
function workspaceCount(count: number): string {
  return count === 1 ? '1 workspace' : `${count} workspaces`
}

function complete(item: ImportItem): boolean {
  return item.sent >= item.row.upload
}

/** The upload of a row: done, going up, or waiting for its turn. */
function Upload(props: { item: ImportItem }) {
  const theme = useSharedUiTheme()
  const { item } = props
  if (complete(item)) {
    return (
      <StatusText
        icon={CircleCheck}
        label={`Imported · ${formatSize(item.row.upload)}`}
        tone="success"
      />
    )
  }
  if (item.sent === 0) {
    return <span className={styles.uploading}>Waiting</span>
  }
  return (
    <span className={styles.uploading}>
      <Spinner color={theme.colors.muted} size={11} />
      {formatSize(item.sent)} of {formatSize(item.row.upload)}
    </span>
  )
}

/**
 * The upload of an import. A workspace appears in the org only when its
 * own upload ends, so only a complete row shows the chip of its
 * workspace. A row whose upload runs or waits shows its name as plain
 * text. The Mac app uploads the work of each workspace in turn, and the
 * bar counts the bytes of the whole import. `note` says what the upload
 * does. `chipTo` is the screen of the drawn imported workspace, and null
 * keeps every chip static.
 */
export function ImportProgress(props: {
  items: readonly ImportItem[]
  note: string
  chipTo: string | null
}) {
  const total = props.items.reduce((sum, item) => sum + item.row.upload, 0)
  const sent = props.items.reduce((sum, item) => sum + item.sent, 0)
  return (
    <div className={styles.progress}>
      <div className={styles.head}>
        <span className={styles.title}>
          Importing {workspaceCount(props.items.length)} into {orgs.acme.name}
        </span>
        <span className={styles.bytes}>
          {formatSize(sent)} of {formatSize(total)}
        </span>
      </div>
      <ProgressBar
        accessibilityLabel="Import progress"
        height={4}
        value={sent / total}
      />
      <p className={styles.note}>{props.note}</p>
      <ul aria-label="Workspaces of the import" className={styles.list}>
        {props.items.map((item) => (
          <li className={styles.row} key={item.workspace.key}>
            {complete(item) ? (
              <ImportedChip to={props.chipTo} workspace={item.workspace} />
            ) : (
              <span className={styles.name}>{item.row.name}</span>
            )}
            <Upload item={item} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The end of an import: how many workspaces it brought in, where they wait,
 * and a chip of each one, which opens it. Each row counts the sessions that
 * imported. `report` names what the import left out, each list with its
 * reason. `chipTo` is the screen of the drawn imported workspace, and null
 * keeps every chip static.
 */
export function ImportResult(props: {
  items: readonly ImportItem[]
  report: ImportReport
  chipTo: string | null
}) {
  return (
    <div className={styles.progress}>
      <Notice
        body="They wait in Import from Conductor. Open one to activate it."
        icon={CircleCheck}
        title={`Imported ${workspaceCount(props.items.length)}`}
      />
      <ul aria-label="Imported workspaces" className={styles.list}>
        {props.items.map((item) => (
          <li className={styles.row} key={item.workspace.key}>
            <ImportedChip to={props.chipTo} workspace={item.workspace} />
            <span className={styles.bytes}>
              {sessionCount(importedSessions(item.row))} ·{' '}
              {formatSize(item.row.upload)}
            </span>
          </li>
        ))}
      </ul>
      <ImportReportLists
        report={props.report}
        rows={props.items.map((item) => item.row)}
      />
    </div>
  )
}
