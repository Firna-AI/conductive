// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, onTestFinished, test, vi } from 'vitest'
import { previewLaunchUrl } from '../../../shared/previews'
import { byRole } from '../../../test-support/dom-queries'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../../test-support/mount'
import { settle } from '../../test-mount'
import type { Viewport } from '../../ui/viewport'
import { filesHref } from '../files/files-address'
import { openTab } from '../wiring-test-kit'
import {
  frameAddresses,
  frameOf,
  opened,
  openCount,
  reportHref,
  reportPath,
  serverWithReport,
  turnTo,
} from './html-tab-test-kit'
import { PageFrames } from './page-frames'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
/** A listed HTML file whose tab never showed its page. */
const other = '.context/summary.html'
const tabOf = (path: string, mode: 'preview' | 'source') =>
  filesHref(org, id, { kind: 'file', path, mode })
const pageNamed = (view: HTMLElement, name: string) =>
  byRole('region', name, view)

/** Records each page that a tab puts into the kept frames of the desktop. */
function recordedShows() {
  const shows = vi.spyOn(PageFrames.prototype, 'show')
  onTestFinished(() => shows.mockRestore())
  return () => shows.mock.calls.map(([page]) => page.path)
}

describe('the tab of an HTML file while the cloud computer starts', () => {
  test.each<Viewport>(['desktop', 'phone'])(
    'on the %s, a tab that never showed its page shows the state of the cloud computer during a Restart, and its page once the workspace is ready',
    async (viewport) => {
      holdAnimationFrames()
      const server = serverWithReport(true, [other])
      const shown = recordedShows()
      const { view, navigation } = await openTab(server, reportHref, {
        viewport,
      })
      await waitFor(() => frameOf(view), 'the page of the report')
      turnTo(server, 'starting')
      await settle()

      act(() => navigation.push(tabOf(other, 'preview')))
      await settle()
      const starting = {
        waits: pageNamed(view, 'summary.html').textContent?.includes(
          'Waiting for the sandbox',
        ),
        frames: frameAddresses(view).filter(
          (address) => address === previewLaunchUrl(opened, other),
        ),
        kept: shown().filter((path) => path === other),
        opens: openCount(server),
      }
      turnTo(server, 'ready')
      await waitFor(
        () => frameAddresses(view).includes(previewLaunchUrl(opened, other)),
        'the page of the other file',
      )
      expect({ starting, opens: openCount(server) }).toEqual({
        starting: { waits: true, frames: [], kept: [], opens: 1 },
        opens: 2,
      })
    },
  )

  test('on a phone, a tab that shows Source when a Restart starts shows the state of the cloud computer at Preview, and its page once the workspace is ready', async () => {
    holdAnimationFrames()
    const server = serverWithReport(true)
    const { view, navigation } = await openTab(server, reportHref, {
      viewport: 'phone',
    })
    await waitFor(() => frameOf(view), 'the page of the report')
    act(() => navigation.push(tabOf(reportPath, 'source')))
    await settle()
    turnTo(server, 'starting')
    await settle()

    act(() => navigation.push(tabOf(reportPath, 'preview')))
    await settle()
    const starting = {
      waits: pageNamed(view, 'report.html').textContent?.includes(
        'Waiting for the sandbox',
      ),
      frames: frameAddresses(view),
      opens: openCount(server),
    }
    turnTo(server, 'ready')
    await waitFor(() => frameOf(view), 'the page after Starting')
    expect({
      starting,
      frames: frameAddresses(view),
      opens: openCount(server),
    }).toEqual({
      starting: { waits: true, frames: [], opens: 1 },
      frames: [previewLaunchUrl(opened, reportPath)],
      opens: 2,
    })
  })
})
