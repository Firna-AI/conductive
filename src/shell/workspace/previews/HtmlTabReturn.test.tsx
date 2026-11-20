// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { previewLaunchUrl } from '../../../shared/previews'
import { fakeFilesPreview } from '../../../test-support/fake-tool-routes'
import { FAKE_IDS, FAKE_TIME } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../../test-support/mount'
import { settle } from '../../test-mount'
import { emit } from '../kept-test-kit'
import { openTab } from '../wiring-test-kit'
import {
  frameAddresses,
  frameOf,
  opened,
  openCount,
  opensNew,
  pageOf,
  reportHref,
  reportPath as path,
  serverWithReport,
  turnTo,
} from './html-tab-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS
const away = routes.org(org)

describe('a return to the tab of an HTML file', () => {
  test('after the expiry of the files preview opens it again, and shows the page of the new one', async () => {
    holdAnimationFrames()
    let clock = FAKE_TIME
    const server = serverWithReport(true)
    const { view, navigation } = await openTab(server, reportHref, {
      now: () => clock,
    })
    await waitFor(() => frameOf(view), 'the page')
    act(() => navigation.push(away))
    await settle()
    clock = opened.expiresAt + 1
    const renewed = opensNew(server, 'files-preview-2')

    act(() => navigation.push(reportHref))
    await waitFor(
      () =>
        frameOf(view)?.getAttribute('src') === previewLaunchUrl(renewed, path),
      'the page of the new files preview',
    )
    expect({
      opens: openCount(server),
      frames: frameAddresses(view),
    }).toEqual({ opens: 2, frames: [previewLaunchUrl(renewed, path)] })
  })

  test('after a stop shows the state of the cloud computer, not a frame, and opens a new files preview when the workspace is ready', async () => {
    holdAnimationFrames()
    const server = serverWithReport(true)
    const { view, navigation } = await openTab(server, reportHref)
    await waitFor(() => frameOf(view), 'the page')
    act(() => navigation.push(away))
    await settle()
    // The cloud computer stops while no screen shows the workspace, which
    // ends the files preview, and then starts again. The Worker refuses an
    // open until the cloud computer runs.
    emit(server, { type: 'preview.revoked', previewId: opened.id })
    turnTo(server, 'stopped')
    turnTo(server, 'starting')
    fakeFilesPreview(server, 'not-ready')

    act(() => navigation.push(reportHref))
    await settle()
    const starting = {
      frames: frameAddresses(view),
      waits: pageOf(view).textContent?.includes('Waiting for the sandbox'),
    }
    const renewed = opensNew(server, 'files-preview-2')
    turnTo(server, 'ready')
    await waitFor(
      () =>
        frameOf(view)?.getAttribute('src') === previewLaunchUrl(renewed, path),
      'the page of the new files preview',
    )
    expect({ starting, frames: frameAddresses(view) }).toEqual({
      starting: { frames: [], waits: true },
      frames: [previewLaunchUrl(renewed, path)],
    })
  })
})
