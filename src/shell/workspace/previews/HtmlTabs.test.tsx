// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { HeldRequests } from '../../../app/test-kit'
import { routes } from '../../../app/router'
import { previewLaunchUrl } from '../../../shared/previews'
import { byRole, queryByRole } from '../../../test-support/dom-queries'
import { fakeFilesPreview } from '../../../test-support/fake-tool-routes'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../../test-support/mount'
import { click, settle } from '../../test-mount'
import { emit } from '../kept-test-kit'
import { linkTo, openTab } from '../wiring-test-kit'
import {
  frameOf,
  openLink,
  opened,
  opens,
  opensPath,
  pageOf,
  reportHref,
  reportPath as path,
  serverWithReport,
  turnTo,
} from './html-tab-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS

describe('the tab of an HTML file', () => {
  test('opens the files preview once and shows the look of the launch page with Reload until the open answers, then the page at the path of the file with Open in a new tab', async () => {
    holdAnimationFrames()
    const server = serverWithReport()
    const held = new HeldRequests(server)
    held.holdAnswer('POST', opensPath)
    const { view } = await openTab(server, reportHref, { fetch: held.fetch })
    await waitFor(
      () => pageOf(view).textContent?.includes('Opening preview'),
      'the wait',
    )
    const waiting = {
      reload: queryByRole('button', 'Reload', pageOf(view)) !== null,
      open: openLink(view),
      frame: frameOf(view),
    }

    held.release('POST', opensPath)
    const frame = await waitFor(() => frameOf(view), 'the page')
    const link = openLink(view)
    expect({
      waiting,
      frame: frame.getAttribute('src'),
      open: [link?.getAttribute('href'), link?.getAttribute('target')],
      opens: await opens(server),
    }).toEqual({
      waiting: { reload: true, open: null, frame: null },
      frame: previewLaunchUrl(opened, path),
      open: [previewLaunchUrl(opened, path), '_blank'],
      opens: [{}],
    })
  })

  test('shows the failure of a Preview tab when the open fails, and Try again opens the files preview again', async () => {
    holdAnimationFrames()
    const server = serverWithReport()
    fakeFilesPreview(server, 'failed')
    const { view } = await openTab(server, reportHref)
    await waitFor(
      () => pageOf(view).textContent?.includes("The preview couldn't open"),
      'the failure',
    )
    const failed = {
      message: pageOf(view).textContent?.includes(
        'The cloud computer did not answer. Try again.',
      ),
      reload: queryByRole('button', 'Reload', pageOf(view)),
      open: openLink(view),
    }

    fakeFilesPreview(server, 'open')
    click(byRole('button', 'Try again', pageOf(view)))
    await waitFor(() => frameOf(view), 'the page after Try again')
    expect({ failed, opens: (await opens(server)).length }).toEqual({
      failed: { message: true, reload: null, open: null },
      opens: 2,
    })
  })

  test('shows the notice of older software with no button, and opens the files preview again when the workspace leaves Starting after a Restart', async () => {
    holdAnimationFrames()
    const server = serverWithReport()
    fakeFilesPreview(server, 'older-software')
    const { view } = await openTab(server, reportHref)
    await waitFor(
      () => pageOf(view).textContent?.includes('Restart to preview this file'),
      'the notice',
    )
    const notice = {
      body: pageOf(view).textContent?.includes(
        'The preview needs newer cloud computer software. Select Restart in the workspace header.',
      ),
      buttons: [...pageOf(view).querySelectorAll('button')].filter(
        (button) => button.textContent !== '',
      ).length,
      reload: queryByRole('button', 'Reload', pageOf(view)),
      open: openLink(view),
    }

    fakeFilesPreview(server, 'open')
    turnTo(server, 'starting')
    await settle()
    turnTo(server, 'ready')
    const frame = await waitFor(() => frameOf(view), 'the page after Restart')
    expect({
      notice,
      frame: frame.getAttribute('src'),
      opens: (await opens(server)).length,
    }).toEqual({
      notice: { body: true, buttons: 0, reload: null, open: null },
      frame: previewLaunchUrl(opened, path),
      opens: 2,
    })
  })

  test('loads the page again at Reload and at a change of the file, but not at a change of another file', async () => {
    holdAnimationFrames()
    const server = serverWithReport()
    const { view } = await openTab(server, reportHref)
    const first = await waitFor(() => frameOf(view), 'the page')

    click(byRole('button', 'Reload', pageOf(view)))
    await settle()
    const reloaded = frameOf(view)
    const upsert = (each: string, revision: number) =>
      emit(server, {
        type: 'files.changed',
        delta: {
          revision,
          changes: [
            {
              operation: 'upsert',
              entry: { path: each, name: each, kind: 'file', change: null },
            },
          ],
        },
      })
    upsert(path, 3)
    await settle()
    const changed = frameOf(view)
    upsert('.context/report.css', 4)
    await settle()
    expect({
      reload: reloaded !== null && reloaded !== first,
      change: changed !== null && changed !== reloaded,
      other: frameOf(view) === changed,
      opens: (await opens(server)).length,
    }).toEqual({ reload: true, change: true, other: true, opens: 1 })
  })

  test('on a phone, shows the page in its own frame with Reload and Open, and keeps no frame while the chat shows', async () => {
    holdAnimationFrames()
    const server = serverWithReport()
    const { view, navigation } = await openTab(server, reportHref, {
      viewport: 'phone',
    })
    const frame = await waitFor(() => frameOf(view), 'the page')
    const shown = {
      inPage: pageOf(view).contains(frame),
      reload: queryByRole('button', 'Reload', pageOf(view)) !== null,
      open: openLink(view)?.getAttribute('href'),
    }

    click(linkTo(view, routes.workspace(org, id)))
    await settle()
    expect({ shown, at: navigation.href(), frame: frameOf(view) }).toEqual({
      shown: {
        inPage: true,
        reload: true,
        open: previewLaunchUrl(opened, path),
      },
      at: routes.workspace(org, id),
      frame: null,
    })
  })
})
