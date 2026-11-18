import type { FileResponse } from '../../../shared/generated/FileResponse'
import type { Preview } from '../../../shared/generated/Preview'
import type { WorkspaceState } from '../../../shared/generated/WorkspaceState'
import { requestLines } from '../../../app/test-kit'
import { filePaths } from '../../../shared/files'
import { filesPreviewPath } from '../../../shared/previews'
import { byLabel, byRole, queryByRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { toolFixtures } from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import { filesHref } from '../files/files-address'
import { bodiesOf, emit } from '../kept-test-kit'

// The helpers of the tests of the tabs of HTML files on the workspace screen.

const { org, workspace: id } = FAKE_IDS
export const reportPath = '.context/report.html'
export const reportHref = filesHref(org, id, {
  kind: 'file',
  path: reportPath,
  mode: 'preview',
})
/** The files preview that the fake API opens. */
export const opened = toolFixtures().filesPreview.preview
export const opensPath = filesPreviewPath(org, id)
export const rowOf = (view: HTMLElement) => byLabel('Sessions and files', view)
export const pageOf = (view: HTMLElement) =>
  byRole('region', 'report.html', view)
export const frameOf = (view: HTMLElement) =>
  view.querySelector<HTMLIFrameElement>(
    'iframe[title="Preview of report.html"]',
  )
export const openLink = (view: HTMLElement) =>
  queryByRole('link', 'Open in new tab', pageOf(view))
/** The bodies of the opens of the files preview. */
export const opens = (server: FakeApiServer) =>
  bodiesOf(server, 'POST', opensPath, 0)
/** The count of the opens of the files preview, for a wait. */
export const openCount = (server: FakeApiServer) =>
  requestLines(server).filter((line) => line === `POST ${opensPath}`).length
/** The address of each frame of the view. */
export const frameAddresses = (view: HTMLElement) =>
  [...view.querySelectorAll('iframe')].map((frame) => frame.getAttribute('src'))

/**
 * The fake API with the text of the report, and of each of `others`. By
 * default no list names them. `listed` puts them into All files, with no
 * recorded report of the lists, so their labels are known before their
 * reads, as for the files of the branch.
 */
export function serverWithReport(
  listed = false,
  others: readonly string[] = [],
): FakeApiServer {
  const server = new FakeApiServer(listed ? { savedLists: false } : {})
  const paths = [reportPath, ...others]
  if (listed) {
    const tree = toolFixtures().files
    server.json('GET', filePaths.tree(org, id), {
      ...tree,
      entries: [
        ...tree.entries,
        ...paths.map((path) => ({
          path,
          name: path.slice(path.lastIndexOf('/') + 1),
          kind: 'file' as const,
          change: null,
        })),
      ],
    })
  }
  const content = '<!doctype html>\n<h1>Checkout report</h1>\n'
  for (const path of paths) {
    const file: FileResponse = {
      path,
      mediaType: 'text/html',
      encoding: 'utf-8',
      content,
      sizeBytes: new TextEncoder().encode(content).byteLength,
    }
    server.json('GET', filePaths.content(org, id, path), file)
  }
  return server
}

/** The next open of the files preview answers a new files preview. */
export function opensNew(server: FakeApiServer, previewId: string): Preview {
  const preview: Preview = {
    ...opened,
    id: previewId,
    url: opened.url.replace(opened.id, previewId),
  }
  server.json('POST', opensPath, { preview }, 201)
  return preview
}

/** The workspace turns to `state`, as the stream of the Worker says. */
export function turnTo(server: FakeApiServer, state: WorkspaceState): void {
  const { workspace } = workspaceFixtures().detail
  emit(server, {
    type: 'workspace.updated',
    workspace: { ...workspace, state },
  })
}
