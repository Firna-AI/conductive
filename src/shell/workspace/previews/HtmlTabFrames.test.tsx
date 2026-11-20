// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, onTestFinished, test, vi } from 'vitest'
import type { FileResponse } from '../../../shared/generated/FileResponse'
import { HeldRequests } from '../../../app/test-kit'
import { filePaths } from '../../../shared/files'
import { previewLaunchUrl } from '../../../shared/previews'
import type { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../../test-support/mount'
import { settle } from '../../test-mount'
import { filesHref } from '../files/files-address'
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
  prepare: (server: FakeApiServer, held: HeldRequests) => void
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
    prepare: (_server, held) =>
      held.hold('GET', filePaths.content(org, id, 'reports/draft.html')),
  },
]

describe('the kept frames of the tabs of HTML files', () => {
  test.each(tabsOfB)(
    'start no frame for $name after the page of another file',
    async ({ path, mode, prepare }) => {
      holdAnimationFrames()
      const server = serverWithReport()
      const held = new HeldRequests(server)
      prepare(server, held)
      const shows = vi.spyOn(PageFrames.prototype, 'show')
      onTestFinished(() => shows.mockRestore())
      const { view, navigation } = await openTab(server, reportHref, {
        fetch: held.fetch,
      })
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
