import { useLayoutEffect, useMemo, type ReactNode } from 'react'
import type { MarkedLines } from '../code/CodeView'
import type { FilesClient } from '../api/files-client'
import { labelName, pageLabel, tabHidesSecret } from '../model/file-labels'
import type { WorkspaceFiles } from '../model/files-store'
import { splitLines } from '../model/file-text'
import type { FileTab, FilesLayout, FilesNavigation } from '../navigation'
import { isMarkdown, showsAsPage } from '../code/file-kind'
import { useFilesSnapshot } from '../panel/FilesPanel'
import { classes } from '../ui/classes'
import { LoadingFile, ReadError } from '../ui/FileStates'
import { LayoutRoot } from '../ui/layout'
import type { FileActionTargets } from './file-actions'
import { FileContent } from './FileBody'
import { fileView } from './file-view'
import type { HtmlPreview } from './html-preview'
import { HtmlPageActions, HtmlPageBody } from './HtmlPagePreview'
import { PageHeader } from './PageHeader'
import { useFileActions } from './use-file-actions'
import { useFollowed } from './use-followed'
import { ViewSwitch } from './ViewSwitch'
import styles from './FilePage.module.css'

const readFile = (client: FilesClient, path: string, signal: AbortSignal) =>
  client.readFile(path, signal)

/** The line count of a text in the header of a page, such as "24 lines". */
export function lineCount(lines: number): string {
  return `${lines} ${lines === 1 ? 'line' : 'lines'}`
}

/**
 * One file as a page: a tab of the centre column on desktop, and a page
 * of the Files tab on a phone, with a way back to All files. Markdown
 * shows rendered, and an HTML file shows its page in a frame, each with a
 * switch to its source. Other text shows with line numbers. An image file
 * shows as a picture, by its name. The page reads the file again when an
 * event changes it.
 *
 * The view and the line count use the view text. Copy takes the original
 * text, with each byte order mark, and is off for a picture and for each
 * other file that is not text. Download reads the file with the same
 * limit as the page, so the page offers it only after a read that fits.
 * The header and the picture show the label of the path, and each read,
 * view, Copy, and Download uses the real path.
 *
 * The page of an HTML file has no read limit, so only a read that finds no
 * file takes its place. A label that hides a secret value, or that no
 * record gives yet, shows no page, because the address of the page holds
 * the real path.
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
  /**
   * Keeps a file that the page already shows, in place of the placeholder,
   * and so a page of an HTML file that shows in its frame.
   */
  keepShown?: boolean
  /** The lines that the text of the file shows in view and marked. */
  lines?: MarkedLines | null
  /**
   * The page of an HTML file, from the shell. Without it, an HTML file shows
   * its source, with no switch.
   */
  htmlPreview?: HtmlPreview
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
  const html =
    props.htmlPreview !== undefined &&
    showsAsPage(tab.path) &&
    !tabHidesSecret(tab.path, label)
  const rendered = (markdown || html) && tab.mode === 'preview'
  const view = useMemo(
    () => (reply ? fileView(tab.path, reply) : null),
    [tab.path, reply],
  )
  const text = view?.kind === 'text' ? view : null
  const shownAsCode = text !== null && !rendered
  const download =
    state?.status === 'ready' && !placeholder ? actions.download : undefined
  const page = html && tab.mode === 'preview' ? props.htmlPreview : undefined
  const missing = state?.status === 'failed' && state.error.kind === 'not-found'
  const keptPage = props.keepShown === true && page?.view.kind === 'page'
  const showsPage = page !== undefined && (!placeholder || keptPage) && !missing
  const show = page?.show
  useLayoutEffect(
    () => (showsPage && show ? show() : undefined),
    [showsPage, show],
  )
  const below = showsPage && page.view.kind === 'page' && page.view.kept
  let body: ReactNode = <LoadingFile />
  if (showsPage) {
    body = <HtmlPageBody preview={page} />
  } else if (placeholder && (page !== undefined || !state)) {
    // A page of an HTML file that shows nothing yet gives way to the
    // placeholder too, also while the page keeps the text of its read.
    body = placeholder
  } else if (state?.status === 'failed' && state.error.kind !== 'aborted') {
    body = <ReadError error={state.error} onRetry={retry} subject="file" />
  } else if (view) {
    body = (
      <FileContent
        lines={props.lines}
        mode={tab.mode}
        name={labelName(label)}
        onDownload={download}
        path={tab.path}
        view={view}
      />
    )
  }
  const opens = page?.view.kind === 'opening' || page?.view.kind === 'page'
  return (
    <LayoutRoot
      className={classes(styles.page, below && styles.headerOnly)}
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
        pageActions={
          showsPage && opens ? <HtmlPageActions preview={page} /> : undefined
        }
        path={tab.path}
        status={actions.status}
        viewSwitch={
          markdown || html ? (
            <ViewSwitch
              mode={tab.mode}
              onChange={(mode) =>
                navigation.navigate({ kind: 'file', path: tab.path, mode })
              }
            />
          ) : undefined
        }
      />
      {/* A kept frame draws nothing in place, but it must still render. */}
      {below ? body : <div className={styles.body}>{body}</div>}
    </LayoutRoot>
  )
}
