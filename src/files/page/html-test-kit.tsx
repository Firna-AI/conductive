import { act, type ReactNode } from 'react'
import type { FileResponse } from '../../shared/generated/FileResponse'
import type { FileTreeResponse } from '../../shared/generated/FileTreeResponse'
import { filePaths } from '../../shared/files'
import { accessibleName } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { testNavigation } from '../files-test-kit'
import {
  heldFetch,
  mountRoot,
  shownRows,
  startedFiles,
} from '../mount-test-kit'
import type { FileMode } from '../navigation'
import { FilePage } from './FilePage'
import type { HtmlPageView, HtmlPreview } from './html-preview'

/**
 * Test kit of the page of an HTML file, for the mounted tests of the file
 * page with a preview that stands in for the shell. Tests only.
 */

const { org, workspace: id } = FAKE_IDS
export const reportPath = '.context/report.html'
export const reportSource = '<!doctype html>\n<h1>Checkout report</h1>\n'
/** A frame that stands in for the frame of the shell. */
export const pageFrame = <iframe title="Preview of report.html" />

export function htmlFile(filePath: string, content: string): FileResponse {
  return {
    path: filePath,
    mediaType: 'text/html',
    encoding: 'utf-8',
    content,
    sizeBytes: new TextEncoder().encode(content).byteLength,
  }
}

/** The fake API with the report in All files, so its label is known at once. */
export function serverWithReport(read: unknown, status = 200): FakeApiServer {
  const server = new FakeApiServer()
  const tree: FileTreeResponse = {
    revision: 1,
    entries: [
      { path: '.context', name: '.context', kind: 'directory', change: null },
      { path: reportPath, name: 'report.html', kind: 'file', change: null },
    ],
  }
  server.json('GET', filePaths.tree(org, id), tree)
  server.json('GET', filePaths.content(org, id, reportPath), read, status)
  return server
}

/**
 * Stands in for the shell: each preview has the same `show` and `reload`,
 * which record their calls, as the stable callbacks of the shell.
 */
export function standInShell() {
  const calls: string[] = []
  const show = () => {
    calls.push('show')
    return () => {
      calls.push('stop')
    }
  }
  const reload = () => {
    calls.push('reload')
  }
  const preview = (
    view: HtmlPageView,
    open: ReactNode = null,
  ): HtmlPreview => ({
    view,
    open,
    reload,
    expand: null,
    show,
  })
  return { calls, preview }
}

/** What the page shows of its preview: the frame, the switch, and the actions. */
export function seen(container: HTMLElement) {
  const named = (selector: string) =>
    [...container.querySelectorAll(selector)].map(accessibleName)
  return {
    frame: named('iframe').length > 0,
    checked: named('[role="radio"][aria-checked="true"]'),
    buttons: named('button').filter((name) => !name.startsWith('Copy')),
    links: named('a'),
    rows: shownRows(container).length,
  }
}

/**
 * The page of the report, or of the HTML file at `path`, over the fake API,
 * as the shell mounts it.
 */
export async function mountedReport(server: FakeApiServer, path = reportPath) {
  const view = mountRoot()
  const held = heldFetch(server)
  const files = await startedFiles(server, held)
  const navigation = testNavigation()
  const render = (
    preview: HtmlPreview,
    options: { mode?: FileMode; placeholder?: ReactNode } = {},
  ) =>
    view.render(
      <FilePage
        files={files}
        htmlPreview={preview}
        keepShown={options.placeholder !== undefined}
        layout="desktop"
        navigation={navigation}
        placeholder={options.placeholder}
        tab={{
          kind: 'file',
          path,
          mode: options.mode ?? 'preview',
        }}
      />,
    )
  const release = () =>
    act(async () => {
      await held.release()
    })
  return { view, navigation, render, release }
}
