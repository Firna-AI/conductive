import { ProgressBar } from '@firna/ui/loader'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleCheck } from 'lucide-react'
import type { ConductorRow } from '../../fixtures/conductorImport'
import { orgs } from '../../fixtures/orgs'
import type { Workspace } from '../../fixtures/workspaces'
import { formatSize } from '../chat/sizes'
import { Notice } from '../common/Notice'
import { StatusText } from '../common/StatusText'
import { ImportedChip } from './ImportRows'
import styles from './ImportProgress.module.css'

/** A workspace of the import, the row that it came from, and its upload. */
export type ImportItem = {
  workspace: Workspace
  row: ConductorRow
  /** The bytes that went up so far. */
  sent: number
}

function Upload(props: { item: ImportItem }) {
  const theme = useSharedUiTheme()
  const { item } = props
  if (item.sent >= item.row.upload) {
    return (
      <StatusText
        icon={CircleCheck}
        label={`Uploaded · ${formatSize(item.row.upload)}`}
        tone="success"
      />
    )
  }
  return (
    <span className={styles.uploading}>
      <Spinner color={theme.colors.muted} size={11} />
      {formatSize(item.sent)} of {formatSize(item.row.upload)}
    </span>
  )
}

/**
 * The upload of an import. The import made each workspace at once, so its
 * chip already opens it. The Mac app uploads the work of each workspace in
 * turn, and the bar counts the bytes of the whole import. `chipTo` is the
 * screen of the drawn imported workspace, and null keeps every chip static.
 */
export function ImportProgress(props: {
  items: readonly ImportItem[]
  chipTo: string | null
}) {
  const total = props.items.reduce((sum, item) => sum + item.row.upload, 0)
  const sent = props.items.reduce((sum, item) => sum + item.sent, 0)
  const count = props.items.length
  return (
    <div className={styles.progress}>
      <div className={styles.head}>
        <span className={styles.title}>
          Importing {count} workspaces into {orgs.acme.name}
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
      <ul aria-label="Imported workspaces" className={styles.list}>
        {props.items.map((item) => (
          <li className={styles.row} key={item.workspace.key}>
            <ImportedChip to={props.chipTo} workspace={item.workspace} />
            <Upload item={item} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The end of an import: how many workspaces it brought in, where they wait,
 * and a chip of each one, which opens it. `chipTo` is the screen of the
 * drawn imported workspace, and null keeps every chip static.
 */
export function ImportResult(props: {
  items: readonly ImportItem[]
  chipTo: string | null
}) {
  return (
    <div className={styles.progress}>
      <Notice
        body="They wait in Import from Conductor. Open one to activate it."
        icon={CircleCheck}
        title={`Imported ${props.items.length} workspaces`}
      />
      <ul aria-label="Imported workspaces" className={styles.list}>
        {props.items.map((item) => (
          <li className={styles.row} key={item.workspace.key}>
            <ImportedChip to={props.chipTo} workspace={item.workspace} />
            <span className={styles.bytes}>
              {item.row.sessions} sessions · {formatSize(item.row.upload)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
