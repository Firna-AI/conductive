import type { FileResponse } from '../../../shared/generated/FileResponse'
import type { Preview } from '../../../shared/generated/Preview'
import type { WorkspaceState } from '../../../shared/generated/WorkspaceState'
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

/** The fake API with the text of the report, which no list names. */
export function serverWithReport(): FakeApiServer {
  const server = new FakeApiServer()
  const content = '<!doctype html>\n<h1>Checkout report</h1>\n'
  const file: FileResponse = {
    path: reportPath,
    mediaType: 'text/html',
    encoding: 'utf-8',
    content,
    sizeBytes: new TextEncoder().encode(content).byteLength,
  }
  server.json('GET', filePaths.content(org, id, reportPath), file)
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
