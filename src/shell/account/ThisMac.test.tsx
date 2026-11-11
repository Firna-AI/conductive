// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { Store } from '../../app/store'
import { requestLines } from '../../app/test-kit'
import { DEVICE_CURRENT_PATH, DEVICE_SETTINGS_PATH } from '../../shared/device'
import { queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { fakeUser } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../test-support/mount'
import { MacApp, type MacWindow, type MacWindowState } from '../mac/mac-app'
import { mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { AccountScreen } from './AccountScreen'

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

/** The titles of the sections of the account, in their order. */
function sections(view: HTMLElement): string[] {
  return Array.from(view.querySelectorAll('h2'), (title) =>
    String(title.textContent),
  )
}

/** The requests to the Mac of this window: its pairing and its settings. */
function macRequests(server: FakeApiServer): string[] {
  return requestLines(server).filter((line) =>
    line.includes(DEVICE_CURRENT_PATH),
  )
}

describe('This Mac in the account', () => {
  test('the Mac app shows This Mac after the sign-in, with the name and the state of the Mac', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ onMac: true })
    const app = await startedApp(server)
    const view = mountScreen(
      app,
      <MacApp window={window}>
        <AccountScreen connect={null} tab="general" user={fakeUser} />
      </MacApp>,
    )
    await waitFor(
      () => queryByText("Cal's MacBook Pro", view),
      'the name of this Mac',
    )
    expect({
      sections: sections(view),
      state: queryByText('Available', view)?.textContent,
      requests: macRequests(server),
    }).toEqual({
      sections: [
        'This Mac',
        'Import from Conductor',
        'GitHub',
        'Agents',
        'Invite code',
      ],
      state: 'Available',
      requests: [`GET ${DEVICE_CURRENT_PATH}`, `GET ${DEVICE_SETTINGS_PATH}`],
    })
  })

  test('a browser shows no This Mac and asks no Mac', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const app = await startedApp(server)
    const view = mountScreen(
      app,
      <AccountScreen connect={null} tab="general" user={fakeUser} />,
    )
    await settle()
    expect({
      sections: sections(view),
      requests: macRequests(server),
    }).toEqual({
      sections: ['GitHub', 'Agents', 'Invite code'],
      requests: [],
    })
  })
})
