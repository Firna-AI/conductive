// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { HeldRequests } from '../../../app/test-kit'
import { previewLaunchUrl } from '../../../shared/previews'
import { workspacePath } from '../../../shared/workspaces'
import { fakeFilesPreview } from '../../../test-support/fake-tool-routes'
import { FAKE_IDS, FAKE_TIME } from '../../../test-support/fixtures/core'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
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
  opensPath,
  pageOf,
  reportHref,
  reportPath as path,
  serverWithReport,
  turnTo,
} from './html-tab-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
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

  test('after a stop waits for confirmed Ready and shows the current page when an early refusal arrives after Ready returns', async () => {
    holdAnimationFrames()
    const server = serverWithReport(true)
    const held = new HeldRequests(server)
    const { view, navigation } = await openTab(server, reportHref, {
      fetch: held.fetch,
    })
    await waitFor(() => frameOf(view), 'the page')
    act(() => navigation.push(away))
    await settle()
    emit(server, { type: 'preview.revoked', previewId: opened.id })
    turnTo(server, 'stopped')
    turnTo(server, 'starting')
    const readPath = workspacePath(org, id)
    server.json('GET', readPath, workspaceFixtures('starting').detail)
    held.holdAnswer('GET', readPath)
    fakeFilesPreview(server, 'not-ready')
    held.holdAnswer('POST', opensPath)

    act(() => navigation.push(reportHref))
    await settle()
    const opensBeforeConfirmation = openCount(server)
    await act(async () => held.release('GET', readPath))
    await waitFor(
      () => pageOf(view).textContent?.includes('Waiting for the sandbox'),
      'the confirmed Starting state',
    )
    const starting = {
      frames: frameAddresses(view),
      opens: openCount(server),
    }
    const renewed = opensNew(server, 'files-preview-2')
    turnTo(server, 'ready')
    await settle()
    await act(async () => held.release('POST', opensPath))
    await waitFor(
      () =>
        frameOf(view)?.getAttribute('src') ===
          previewLaunchUrl(renewed, path) ||
        pageOf(view).textContent?.includes("The preview couldn't open"),
      'the page or failure after the delayed open reply',
    )

    expect({
      opensBeforeConfirmation,
      starting,
      failed: pageOf(view).textContent?.includes("The preview couldn't open"),
      frames: frameAddresses(view),
    }).toEqual({
      opensBeforeConfirmation: 1,
      starting: { frames: [], opens: 1 },
      failed: false,
      frames: [previewLaunchUrl(renewed, path)],
    })
  })

  test('keeps the current page when an old refusal arrives after a new running period opens', async () => {
    holdAnimationFrames()
    const server = serverWithReport(true)
    const held = new HeldRequests(server)
    fakeFilesPreview(server, 'not-ready')
    held.holdAnswer('POST', opensPath)
    const { view } = await openTab(server, reportHref, { fetch: held.fetch })
    await waitFor(() => openCount(server) === 1, 'the confirmed Ready open')

    turnTo(server, 'starting')
    await waitFor(
      () => pageOf(view).textContent?.includes('Waiting for the sandbox'),
      'the Starting state after the first open',
    )
    const renewed = opensNew(server, 'files-preview-2')
    turnTo(server, 'ready')
    await waitFor(
      () =>
        frameOf(view)?.getAttribute('src') === previewLaunchUrl(renewed, path),
      'the page of the current running period',
    )

    await act(async () => held.release('POST', opensPath))
    await settle()
    expect({
      failed: pageOf(view).textContent?.includes("The preview couldn't open"),
      frames: frameAddresses(view),
      opens: openCount(server),
    }).toEqual({
      failed: false,
      frames: [previewLaunchUrl(renewed, path)],
      opens: 2,
    })
  })
})
