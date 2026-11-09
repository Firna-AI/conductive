// @vitest-environment happy-dom

import { act } from 'react'
import { expect, test, vi } from 'vitest'
import frame from '../../../docs/mockups/src/screens/signInFrame.module.css'
import { AppModel } from '../../app/app-model'
import { routes } from '../../app/router'
import { Store } from '../../app/store'
import { testServices } from '../../app/test-kit'
import { queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../test-support/mount'
import { serveWaiting } from '../../test-support/waitlist'
import { MacApp, type MacWindow, type MacWindowState } from '../mac/mac-app'
import mac from '../mac/mac.module.css'
import { Shell } from '../Shell'
import { mountScreen } from '../test-mount'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

test('in the Mac app, the header of the waitlist is the top bar of the window, and it keeps the space of the window buttons free only in a window', async () => {
  holdAnimationFrames()
  const server = new FakeApiServer()
  serveWaiting(server)
  const state = new Store<MacWindowState>({
    mode: 'window',
    canGoBack: false,
    canGoForward: false,
  })
  const macWindow: MacWindow = {
    state,
    back: () => undefined,
    forward: () => undefined,
  }
  const view = mountScreen(
    new AppModel(testServices(server)),
    <MacApp window={macWindow}>
      <Shell />
    </MacApp>,
    { href: routes.home() },
  )
  await waitFor(
    () => queryByRole('region', "You're on the waitlist", view),
    'the waitlist',
  )
  const bar = () => {
    const header = view.querySelector('header')
    return {
      movesWindow: header?.classList.contains(mac.drag) ?? false,
      keepsButtons: header?.classList.contains(frame.windowButtons) ?? false,
      strips: view.querySelectorAll('nav[aria-label="Window controls"]').length,
    }
  }
  const inWindow = bar()
  await act(async () => {
    state.set({ ...state.get(), mode: 'full-screen' })
  })
  expect({ inWindow, fullScreen: bar() }).toEqual({
    inWindow: { movesWindow: true, keepsButtons: true, strips: 0 },
    fullScreen: { movesWindow: true, keepsButtons: false, strips: 0 },
  })
})
