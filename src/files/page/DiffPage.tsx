import { useMemo, type ReactNode } from 'react'
import { FileBox, FileDiff } from 'lucide-react'
import type { FilesClient } from '../api/files-client'
import { DiffView } from '../diff/DiffView'
import { parsePatch } from '../diff/parse-patch'
import { labelName, pageLabel } from '../model/file-labels'
import type { WorkspaceFiles } from '../model/files-store'
import type { DiffTab, FilesLayout, FilesNavigation } from '../navigation'
import { useFilesSnapshot } from '../panel/FilesPanel'
import { ActionLink } from '../ui/actions'
import { DiffStat } from '../ui/DiffStat'
import { EmptyState, Loading } from '../ui/EmptyState'
import { ReadError } from '../ui/FileStates'
import { LayoutRoot } from '../ui/layout'
import type { FileActionTargets } from './file-actions'
import { PageHeader } from './PageHeader'
import { useFileActions } from './use-file-actions'
import { useFollowed } from './use-followed'
import styles from './FilePage.module.css'

const readDiff = (client: FilesClient, path: string, signal: AbortSignal) =>
  client.readDiff(path, signal)

/**
 * The diff of one changed file against the base branch, as a page: a tab
 * of the centre column on desktop, and a page of the Files tab on a phone,
 * with a way back to Changes. It reads the diff again when the changes or
 * the file change.
 *
 * A diff over the read limit offers no Download. A binary diff links to
 * the file tab in place of Download, and the file tab offers Download
 * when the file fits the limit. The header keeps the changed lines of the
 * list of changes while a placeholder shows.
 */
export function DiffPage(props: {
  files: WorkspaceFiles
  tab: DiffTab
  navigation: FilesNavigation
  layout: FilesLayout
  targets?: FileActionTargets
  /**
   * Shows in place of the diff, such as the state of a sandbox that starts.
   * The page then reads nothing and offers no Download.
   */
  placeholder?: ReactNode
}) {
  const { files, tab, placeholder } = props
  const snapshot = useFilesSnapshot(files)
  const changed = snapshot.changes?.files.find((file) => file.path === tab.path)
  const { state, retry } = useFollowed(
    files,
    readDiff,
    placeholder ? null : tab.path,
  )
  const actions = useFileActions(files.client, tab.path, props.targets)
  const diff = state?.status === 'ready' ? state.value : null
  const label = pageLabel(snapshot, tab.path, 'diff', diff)
  const rows = useMemo(() => (diff ? parsePatch(diff.patch) : []), [diff])
  const failed = state?.status === 'failed' ? state.error.kind : null
  const deleted =
    changed?.change === 'deleted' ||
    (diff !== null && diff.newContent === null && !diff.binary)
  const download =
    placeholder ||
    failed === 'not-found' ||
    failed === 'too-large' ||
    deleted ||
    diff?.binary
      ? undefined
      : actions.download
  const newText = diff && !diff.binary ? diff.newContent : null
  let body: ReactNode = <Loading label="Opening the diff" />
  if (placeholder) {
    body = placeholder
  } else if (state?.status === 'failed' && state.error.kind !== 'aborted') {
    body = <ReadError error={state.error} onRetry={retry} subject="diff" />
  } else if (diff?.binary) {
    body = (
      <EmptyState
        action={
          deleted ? undefined : (
            <ActionLink
              navigation={props.navigation}
              to={{ kind: 'file', path: tab.path, mode: 'preview' }}
            >
              Open the file
            </ActionLink>
          )
        }
        icon={FileBox}
        title="This binary file changed"
      />
    )
  } else if (diff && rows.length === 0) {
    body = <EmptyState icon={FileDiff} title="The lines did not change" />
  } else if (diff) {
    body = <DiffView rows={rows} />
  }
  return (
    <LayoutRoot
      className={styles.page}
      label={labelName(label)}
      layout={props.layout}
    >
      <PageHeader
        back={
          props.layout === 'phone'
            ? { label: 'Changes', to: { kind: 'list', list: 'changes' } }
            : undefined
        }
        downloading={actions.downloading}
        diff
        meta={
          changed ? (
            <DiffStat added={changed.added} removed={changed.removed} />
          ) : undefined
        }
        navigation={props.navigation}
        onCopy={newText === null ? undefined : () => actions.copy(newText)}
        label={label}
        onDownload={download}
        path={tab.path}
        status={actions.status}
      />
      <div className={styles.body}>{body}</div>
    </LayoutRoot>
  )
}
