// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { previewLaunchUrl } from '../../../shared/previews'
import { byRole } from '../../../test-support/dom-queries'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../../test-support/mount'
import { click, settle } from '../../test-mount'
import { filesHref } from '../files/files-address'
import { emit } from '../kept-test-kit'
import { linkTo, openTab } from '../wiring-test-kit'
import {
  frameOf,
  openLink,
  opened,
  opens,
  opensNew,
  pageOf,
  reportHref,
  reportPath as path,
  rowOf,
  serverWithReport,
  turnTo,
} from './html-tab-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS

describe('the kept page of an HTML file', () => {
  test('keeps the page loaded while another tab shows, and a return shows the same page with no new open', async () => {
    holdAnimationFrames()
    const server = serverWithReport()
    const { view, navigation } = await openTab(server, reportHref)
    const frame = await waitFor(() => frameOf(view), 'the page')

    click(byRole('button', 'Address autocomplete', rowOf(view)))
    await settle()
    const away = {
      at: navigation.href(),
      kept: frame.isConnected,
      hidden: frame.closest('[hidden]') !== null,
    }
    click(linkTo(rowOf(view), reportHref))
    await settle()
    expect({
      away,
      back: frameOf(view) === frame,
      hidden: frame.closest('[hidden]') !== null,
      opens: (await opens(server)).length,
    }).toEqual({
      away: { at: routes.workspace(org, id), kept: true, hidden: true },
      back: true,
      hidden: false,
      opens: 1,
    })
  })

  test('keeps the page that shows after a revoke of its files preview, with no Open, and the next show of the tab opens a new one', async () => {
    holdAnimationFrames()
    const server = serverWithReport()
    const { view } = await openTab(server, reportHref)
    const frame = await waitFor(() => frameOf(view), 'the page')

    emit(server, { type: 'preview.revoked', previewId: opened.id })
    await settle()
    const revoked = { kept: frameOf(view) === frame, open: openLink(view) }
    const renewed = opensNew(server, 'files-preview-2')
    // A second click on the shown tab is a new show.
    click(linkTo(rowOf(view), reportHref))
    await waitFor(
      () =>
        frameOf(view)?.getAttribute('src') === previewLaunchUrl(renewed, path),
      'the page of the new files preview',
    )
    expect({
      revoked,
      open: openLink(view)?.getAttribute('href'),
      opens: (await opens(server)).length,
    }).toEqual({
      revoked: { kept: true, open: null },
      open: previewLaunchUrl(renewed, path),
      opens: 2,
    })
  })

  test('keeps the page while the cloud computer stops and starts, and opens a new files preview when the workspace leaves Starting', async () => {
    holdAnimationFrames()
    const server = serverWithReport()
    const { view } = await openTab(server, reportHref)
    const frame = await waitFor(() => frameOf(view), 'the page')

    turnTo(server, 'stopped')
    await settle()
    const stopped = { kept: frameOf(view) === frame, open: openLink(view) }
    const renewed = opensNew(server, 'files-preview-2')
    turnTo(server, 'starting')
    await settle()
    const starting = frameOf(view) === frame
    turnTo(server, 'ready')
    await waitFor(
      () =>
        frameOf(view)?.getAttribute('src') === previewLaunchUrl(renewed, path),
      'the page of the new files preview',
    )
    expect({ stopped, starting, opens: (await opens(server)).length }).toEqual({
      stopped: { kept: true, open: null },
      starting: true,
      opens: 2,
    })
  })

  test('shows the source of a tab that opens at lines, and opens no files preview', async () => {
    holdAnimationFrames()
    const server = serverWithReport()
    const atLines = filesHref(
      org,
      id,
      { kind: 'file', path, mode: 'source' },
      { start: 2, end: 2 },
    )
    const { view } = await openTab(server, atLines)
    await waitFor(
      () => pageOf(view).querySelector('[data-marked]'),
      'the marked line',
    )
    expect({
      marked: pageOf(view).querySelector('[data-marked]')?.textContent,
      frame: frameOf(view),
      opens: await opens(server),
    }).toEqual({
      marked: '2<h1>Checkout report</h1>',
      frame: null,
      opens: [],
    })
  })
})
