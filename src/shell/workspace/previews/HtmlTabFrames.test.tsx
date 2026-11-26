// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, onTestFinished, test, vi } from 'vitest'
import { HeldRequests } from '../../../app/test-kit'
import { followPath } from '../../../files/model/follow-path'
import { ResourceLoader } from '../../../files/model/resource-loader'
import type { FileResponse } from '../../../shared/generated/FileResponse'
import { filePaths } from '../../../shared/files'
import { previewLaunchUrl } from '../../../shared/previews'
import type { FakeApiServer } from '../../../test-support/fake-api'
import {
  FAKE_IDS,
  FAKE_TIME,
  fakeUser,
} from '../../../test-support/fixtures/core'
import { toolFixtures } from '../../../test-support/fixtures/tools'
import {
  deferred,
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../../test-support/mount'
import { nextEnvelope } from '../../../test-support/recorded-repairs'
import { Shell } from '../../Shell'
import { mountScreen, settle } from '../../test-mount'
import { startedApp } from '../../test-render'
import { filesHref } from '../files/files-address'
import { recordingSocket } from '../kept-test-kit'
import { shownWorkspaces } from '../tab-memory'
import { openTab } from '../wiring-test-kit'
import {
  frameAddresses,
  frameOf,
  opened,
  reportHref,
  reportPath,
  serverWithReport,
} from './html-tab-test-kit'
import { PageFrames } from './page-frames'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS

/** The text of an HTML file, with the label of the Worker when it differs. */
function htmlRead(path: string, displayPath?: string): FileResponse {
  const content = '<!doctype html>\n<script>parent.postMessage(1)</script>\n'
  return {
    path,
    ...(displayPath ? { displayPath } : {}),
    mediaType: 'text/html',
    encoding: 'utf-8',
    content,
    sizeBytes: new TextEncoder().encode(content).byteLength,
  }
}

/**
 * The tabs of another HTML file B that may not show its page: Source, a
 * label that hides a secret value, and a label that no record gives yet,
 * because its read waits.
 */
const tabsOfB: {
  name: string
  path: string
  mode: 'preview' | 'source'
  prepare: (server: FakeApiServer) => void
}[] = [
  {
    name: 'Source of another HTML file',
    path: 'reports/summary.html',
    mode: 'source',
    prepare: (server) =>
      server.json(
        'GET',
        filePaths.content(org, id, 'reports/summary.html'),
        htmlRead('reports/summary.html'),
      ),
  },
  {
    name: 'an HTML file whose label hides a secret value',
    path: 'reports/acme-7f3k.html',
    mode: 'preview',
    prepare: (server) =>
      server.json(
        'GET',
        filePaths.content(org, id, 'reports/acme-7f3k.html'),
        htmlRead('reports/acme-7f3k.html', 'reports/[redacted].html'),
      ),
  },
  {
    name: 'an HTML file with no label yet',
    path: 'reports/draft.html',
    mode: 'preview',
    prepare: (server) => {
      const path = 'reports/draft.html'
      const reply = deferred<FileResponse>()
      server.json('GET', filePaths.content(org, id, path), reply.promise)
      onTestFinished(() => reply.resolve(htmlRead(path)))
    },
  },
]

describe('the kept frames of the tabs of HTML files', () => {
  test.each(tabsOfB)(
    'start no frame for $name after the page of another file',
    async ({ path, mode, prepare }) => {
      holdAnimationFrames()
      const server = serverWithReport()
      prepare(server)
      const shows = vi.spyOn(PageFrames.prototype, 'show')
      onTestFinished(() => shows.mockRestore())
      const { view, navigation } = await openTab(server, reportHref)
      await waitFor(() => frameOf(view), 'the page of the report')

      act(() =>
        navigation.push(filesHref(org, id, { kind: 'file', path, mode })),
      )
      await settle()
      const shown = shows.mock.calls.map(([page]) => page.path)
      expect({
        report: shown.includes(reportPath),
        other: shown.filter((each) => each === path),
        frames: frameAddresses(view).filter(
          (address) => address === previewLaunchUrl(opened, path),
        ),
      }).toEqual({ report: true, other: [], frames: [] })
    },
  )
})

test('refreshes an open HTML page and diff when a late Changes read replaces replayed state', async () => {
  holdAnimationFrames()
  const server = serverWithReport()
  const held = new HeldRequests(server)
  const changesPath = filePaths.changes(org, id)
  const diffPath = filePaths.diff(org, id, reportPath)
  const data = toolFixtures()
  held.hold('GET', changesPath)
  onTestFinished(() => held.release('GET', changesPath))
  server.json(
    'GET',
    filePaths.tree(org, id),
    { error: { code: 'file_unavailable' } },
    503,
  )
  const original = {
    ...data.diff,
    path: reportPath,
    newContent: '<h1>Old report</h1>\n',
  }
  server.json('GET', diffPath, original)

  const app = await startedApp(server, {
    fetch: held.fetch,
    events: recordingSocket(server).source,
  })
  const files = shownWorkspaces(app, fakeUser).files(org, id)
  const view = mountScreen(app, <Shell />, { href: reportHref })
  const diff = new ResourceLoader((path, signal) =>
    files.client.readDiff(path, signal),
  )
  onTestFinished(followPath(files, diff, reportPath))
  const frame = await waitFor(() => frameOf(view), 'the open HTML page')
  const diffContent = () => {
    const read = diff.getSnapshot()
    return read?.status === 'ready' && !read.refreshing
      ? read.value.newContent
      : null
  }
  const before = await waitFor(diffContent, 'the first diff')
  const replayed = files.getSnapshot().changes?.unpushedCommits

  const updated = '<h1>New report</h1>\n'
  server.json('GET', diffPath, {
    ...original,
    newContent: updated,
    patch: '@@ -1 +1 @@\n-<h1>Old report</h1>\n+<h1>New report</h1>\n',
  })
  server.events.store(
    nextEnvelope(
      server.events,
      {
        type: 'changes.updated',
        changes: { ...data.changes, unpushedCommits: 9 },
      },
      FAKE_TIME,
    ),
  )
  held.release('GET', changesPath)
  await waitFor(
    () => files.getSnapshot().changes?.unpushedCommits === 9,
    'the newer Changes list',
  )
  await settle()
  const after = await waitFor(diffContent, 'the diff after the list read')
  const currentFrame = frameOf(view)

  expect({
    replayed,
    before,
    after,
    refreshedFrame: currentFrame !== frame && currentFrame?.getAttribute('src'),
  }).toEqual({
    replayed: 2,
    before: original.newContent,
    after: updated,
    refreshedFrame: previewLaunchUrl(opened, reportPath),
  })
})
