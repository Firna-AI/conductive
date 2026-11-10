import type { ReactNode } from 'react'
import type { FilesClient } from '../api/files-client'
import { labelName, pageLabel } from '../model/file-labels'
import type { WorkspaceFiles } from '../model/files-store'
import { fileText, splitLines } from '../model/file-text'
import type { FileTab, FilesLayout, FilesNavigation } from '../navigation'
import { isMarkdown } from '../code/file-kind'
import { useFilesSnapshot } from '../panel/FilesPanel'
import { LoadingFile, ReadError } from '../ui/FileStates'
import { LayoutRoot } from '../ui/layout'
import type { FileActionTargets } from './file-actions'
import { FileContent } from './FileBody'
import { PageHeader } from './PageHeader'
import { useFileActions } from './use-file-actions'
import { useFollowed } from './use-followed'
import { ViewSwitch } from './ViewSwitch'
import styles from './FilePage.module.css'

const readFile = (client: FilesClient, path: string, signal: AbortSignal) =>
  client.readFile(path, signal)

function lineCount(lines: number): string {
  return `${lines} ${lines === 1 ? 'line' : 'lines'}`
}

/**
 * One file as a page: a tab of the centre column on desktop, and a page
 * of the Files tab on a phone, with a way back to All files. Markdown
 * shows rendered, with a switch to its source. Other text shows with line
 * numbers. The page reads the file again when an event changes it.
 *
 * The view and the line count use the view text. Copy takes the original
 * text, with each byte order mark. Download reads the file with the same
 * limit as the page, so the page offers it only after a read that fits.
 * The header shows the label of the path, and each read, Copy, and
 * Download uses the real path.
 */
export function FilePage(props: {
  files: WorkspaceFiles
  tab: FileTab
  navigation: FilesNavigation
  layout: FilesLayout
  targets?: FileActionTargets
}) {
  const { files, tab, navigation } = props
  const snapshot = useFilesSnapshot(files)
  const { state, retry } = useFollowed(files, readFile, tab.path)
  const actions = useFileActions(files.client, tab.path, props.targets)
  const reply = state?.status === 'ready' ? state.value : null
  const label = pageLabel(snapshot, tab.path, 'file', reply)
  const markdown = isMarkdown(tab.path)
  const text = state?.status === 'ready' ? fileText(state.value) : null
  const shownAsCode =
    text?.kind === 'text' && !(markdown && tab.mode === 'preview')
  const download = state?.status === 'ready' ? actions.download : undefined
  let body: ReactNode = <LoadingFile />
  if (state?.status === 'failed' && state.error.kind !== 'aborted') {
    body = <ReadError error={state.error} onRetry={retry} subject="file" />
  } else if (text) {
    body = (
      <FileContent
        mode={tab.mode}
        onDownload={download}
        path={tab.path}
        text={text}
      />
    )
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
            ? { label: 'All files', to: { kind: 'list', list: 'all' } }
            : undefined
        }
        downloading={actions.downloading}
        meta={
          shownAsCode && text.kind === 'text'
            ? lineCount(splitLines(text.viewText).length)
            : undefined
        }
        navigation={navigation}
        onCopy={
          text?.kind === 'text' ? () => actions.copy(text.text) : undefined
        }
        label={label}
        onDownload={download}
        path={tab.path}
        status={actions.status}
        viewSwitch={
          markdown ? (
            <ViewSwitch
              mode={tab.mode}
              onChange={(mode) =>
                navigation.navigate({ kind: 'file', path: tab.path, mode })
              }
            />
          ) : undefined
        }
      />
      <div className={styles.body}>{body}</div>
    </LayoutRoot>
  )
}
