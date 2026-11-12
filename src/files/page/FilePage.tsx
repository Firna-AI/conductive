import { useMemo, type ReactNode } from 'react'
import type { FilesClient } from '../api/files-client'
import { labelName, pageLabel } from '../model/file-labels'
import type { WorkspaceFiles } from '../model/files-store'
import { splitLines } from '../model/file-text'
import type { FileTab, FilesLayout, FilesNavigation } from '../navigation'
import { isMarkdown } from '../code/file-kind'
import { useFilesSnapshot } from '../panel/FilesPanel'
import { LoadingFile, ReadError } from '../ui/FileStates'
import { LayoutRoot } from '../ui/layout'
import type { FileActionTargets } from './file-actions'
import { FileContent } from './FileBody'
import { fileView } from './file-view'
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
 * numbers. An image file shows as a picture, by its name. The page reads
 * the file again when an event changes it.
 *
 * The view and the line count use the view text. Copy takes the original
 * text, with each byte order mark, and is off for a picture and for each
 * other file that is not text. Download reads the file with the same
 * limit as the page, so the page offers it only after a read that fits.
 * The header and the picture show the label of the path, and each read,
 * view, Copy, and Download uses the real path.
 */
export function FilePage(props: {
  files: WorkspaceFiles
  tab: FileTab
  navigation: FilesNavigation
  layout: FilesLayout
  targets?: FileActionTargets
  /**
   * Shows in place of the file, such as the state of a sandbox that does not
   * run. The page then reads nothing and offers no Download.
   */
  placeholder?: ReactNode
  /** Keeps a file that the page already shows, in place of the placeholder. */
  keepShown?: boolean
}) {
  const { files, tab, navigation, placeholder } = props
  const snapshot = useFilesSnapshot(files)
  const { state: read, retry } = useFollowed(
    files,
    readFile,
    tab.path,
    !placeholder,
  )
  const kept = props.keepShown === true && read?.status === 'ready'
  const state = !placeholder || kept ? read : null
  const actions = useFileActions(files.client, tab.path, props.targets)
  const reply = state?.status === 'ready' ? state.value : null
  const label = pageLabel(snapshot, tab.path, 'file', reply)
  const markdown = isMarkdown(tab.path)
  const view = useMemo(
    () => (reply ? fileView(tab.path, reply) : null),
    [tab.path, reply],
  )
  const text = view?.kind === 'text' ? view : null
  const shownAsCode = text !== null && !(markdown && tab.mode === 'preview')
  const download =
    state?.status === 'ready' && !placeholder ? actions.download : undefined
  let body: ReactNode = <LoadingFile />
  if (placeholder && !state) {
    body = placeholder
  } else if (state?.status === 'failed' && state.error.kind !== 'aborted') {
    body = <ReadError error={state.error} onRetry={retry} subject="file" />
  } else if (view) {
    body = (
      <FileContent
        mode={tab.mode}
        name={labelName(label)}
        onDownload={download}
        path={tab.path}
        view={view}
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
          shownAsCode ? lineCount(splitLines(text.viewText).length) : undefined
        }
        navigation={navigation}
        onCopy={text ? () => actions.copy(text.text) : undefined}
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
