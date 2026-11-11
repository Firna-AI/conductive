import { ProgressBar } from '@firna/ui/loader'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { formatSize } from '../../../docs/mockups/src/components/chat/sizes'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import styles from '../../../docs/mockups/src/components/conductor-import/ImportProgress.module.css'
import type { UploadItem } from '../../app/import/import-uploads'
import type { OrgSummary } from '../../shared/orgs'
import type { Workspace } from '../../shared/workspaces'
import { ActionButton } from '../ui/actions'
import { ImportReport } from './ImportReport'
import { ImportedChip, sessionCount } from './ImportRowParts'

/** A count of workspaces in words, such as "2 workspaces". */
function workspaceCount(count: number): string {
  return count === 1 ? '1 workspace' : `${count} workspaces`
}

/** Whether an upload still runs or waits for its turn. */
function open(item: UploadItem): boolean {
  return item.state === 'waiting' || item.state === 'uploading'
}

/**
 * The bytes of an upload: the bytes that the server verified, then the
 * estimate of the Mac when it has one, and the bytes on their way apart.
 */
function bytesOf(item: UploadItem): string {
  const estimate =
    item.row.uploadBytes === null
      ? ''
      : ` of about ${formatSize(item.row.uploadBytes)}`
  const moving =
    item.inFlightBytes > 0
      ? `, ${formatSize(item.inFlightBytes)} on the way`
      : ''
  return `${formatSize(item.storedBytes)}${estimate} uploaded${moving}`
}

/** The state of one upload. */
function UploadState(props: {
  item: UploadItem
  retry: (localWorkspaceId: string) => void
  busy: boolean
}) {
  const theme = useSharedUiTheme()
  const { item } = props
  switch (item.state) {
    case 'waiting':
      return <span className={styles.uploading}>Waiting</span>
    case 'uploading':
      return (
        <span className={styles.uploading}>
          <Spinner color={theme.colors.muted} size={11} />
          {item.workspaceId === null ? bytesOf(item) : 'Finishing'}
        </span>
      )
    case 'ended':
      return (
        <StatusText
          icon={CircleCheck}
          label={`Imported · ${formatSize(item.storedBytes)}`}
          tone="success"
        />
      )
    case 'failed':
      return (
        <span className={styles.uploading}>
          <StatusText
            icon={CircleAlert}
            label={item.failure ?? ''}
            tone="danger"
          />
          <ActionButton
            disabled={props.busy}
            onPress={() => props.retry(item.row.localWorkspaceId)}
          >
            Try again
          </ActionButton>
        </span>
      )
  }
}

/** The sessions that an upload brought in, when the Mac counted them. */
function importedSessions(item: UploadItem): string | null {
  const { sessionCount: count } = item.row
  return count === null
    ? null
    : sessionCount(Math.max(0, count - item.sessions.length))
}

/**
 * The uploads of an import, and its end. A workspace appears in the org at
 * its `complete`, so its row shows the chip of its workspace from then on,
 * while the results of its upload still come. Each row counts the bytes
 * that the server verified, apart from the bytes on their way. The size of
 * the Mac is an estimate, so the bar shows that the import runs, and no
 * share. At the end the page names the workspaces that it brought in, the
 * uploads that stopped, with Try again, and what stayed on this Mac.
 */
export function ImportProgressView(props: {
  items: readonly UploadItem[]
  org: OrgSummary
  workspaceOf: (id: string) => Workspace | undefined
  retry: (localWorkspaceId: string) => void
}) {
  const { items, org } = props
  const running = items.some(open)
  const ended = items.filter((item) => item.state === 'ended')
  return (
    <div className={styles.progress}>
      {running ? (
        <>
          <div className={styles.head}>
            <span className={styles.title}>
              Importing {workspaceCount(items.length)} into {org.name}
            </span>
          </div>
          <ProgressBar accessibilityLabel="Import progress" height={4} />
          <p className={styles.note}>
            Each workspace joins Import from Conductor when its upload ends.
          </p>
        </>
      ) : ended.length > 0 ? (
        <Notice
          body="They wait in Import from Conductor. Open one to activate it."
          icon={CircleCheck}
          title={`Imported ${workspaceCount(ended.length)}`}
        />
      ) : null}
      <ul aria-label="Workspaces of the import" className={styles.list}>
        {items.map((item) => (
          <li className={styles.row} key={item.row.localWorkspaceId}>
            {item.workspaceId ? (
              <ImportedChip
                name={item.row.name}
                orgId={org.id}
                workspace={props.workspaceOf(item.workspaceId)}
                workspaceId={item.workspaceId}
              />
            ) : (
              <span className={styles.name}>{item.row.name}</span>
            )}
            {item.state === 'ended' && importedSessions(item) ? (
              <span className={styles.bytes}>{importedSessions(item)}</span>
            ) : null}
            <UploadState busy={running} item={item} retry={props.retry} />
          </li>
        ))}
      </ul>
      {running ? null : <ImportReport items={items} />}
    </div>
  )
}
