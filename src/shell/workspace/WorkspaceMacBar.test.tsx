// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { Store } from '../../app/store'
import { requestLines } from '../../app/test-kit'
import {
  DEVICE_CURRENT_PATH,
  DEVICE_SETTINGS_PATH,
  deviceCommandsPath,
} from '../../shared/device'
import { queryByLabel } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  fakeMacSettings,
  fakeSettingsReply,
} from '../../test-support/fixtures/devices'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../test-support/mount'
import { MacApp, type MacWindow, type MacWindowState } from '../mac/mac-app'
import { Shell } from '../Shell'
import { mountScreen, settle } from '../test-mount'
import { startedApp, textOf } from '../test-render'
import { emit, here, id, org, recordingSocket } from './kept-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const window: MacWindow = {
  state: new Store<MacWindowState>({
    mode: 'window',
    canGoBack: false,
    canGoForward: false,
  }),
  back: () => undefined,
  forward: () => undefined,
}

const barLabel = 'Commands that run without asking'

/** The whole app at the open workspace, over the stream of the fake API. */
async function openWorkspace(server: FakeApiServer, mac: boolean) {
  const socket = recordingSocket(server)
  const app = await startedApp(server, { events: socket.source })
  const shell = (
    <NavigationContext.Provider value={memoryNavigation(here)}>
      <Shell />
    </NavigationContext.Provider>
  )
  const page: ReactNode = mac ? <MacApp window={window}>{shell}</MacApp> : shell
  const view = mountScreen(app, page)
  await waitFor(() => view.querySelector('header h1'), 'the open workspace')
  return view
}

/** The number of the requests so far that are this line. */
function count(server: FakeApiServer, line: string): number {
  return requestLines(server).filter((item) => item === line).length
}

/** The reads of the settings of this Mac so far. */
function settingsReads(server: FakeApiServer): number {
  return count(server, `GET ${DEVICE_SETTINGS_PATH}`)
}

describe('the bar of the 15 minutes of the Mac app', () => {
  test('shows the time left, and reads the Mac once again after a burst of workspace updates', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ onMac: true })
    const view = await openWorkspace(server, true)
    const bar = await waitFor(
      () => queryByLabel(barLabel, view),
      'the bar of the 15 minutes',
    )
    const shown = textOf(bar.innerHTML)
    const before = settingsReads(server)
    // Another window stopped the 15 minutes. The Worker records a workspace
    // update with the change, here two in one burst.
    server.json(
      'GET',
      DEVICE_SETTINGS_PATH,
      fakeSettingsReply({ ...fakeMacSettings(), workspaceWindows: [] }),
    )
    const { workspace } = workspaceFixtures().detail
    emit(server, { type: 'workspace.updated', workspace })
    emit(server, { type: 'workspace.updated', workspace })
    await waitFor(
      () => queryByLabel(barLabel, view) === null,
      'the end of the bar',
    )
    await settle()
    expect({ shown, reads: settingsReads(server) - before }).toEqual({
      shown:
        'Every command from this workspace runs on this Mac without asking. 14:32 left Keep until I stop Stop',
      reads: 1,
    })
  })

  test('a browser shows no bar and asks no Mac', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const view = await openWorkspace(server, false)
    await settle()
    // The chat reads the pairing with each read of the Mac commands, so the
    // pairing reads beyond those would be the bar's.
    const pairings =
      count(server, `GET ${DEVICE_CURRENT_PATH}`) -
      count(server, `GET ${deviceCommandsPath(org, id)}`)
    expect({
      bar: queryByLabel(barLabel, view),
      settings: settingsReads(server),
      pairings,
    }).toEqual({ bar: null, settings: 0, pairings: 0 })
  })
})
