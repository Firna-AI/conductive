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

/** The labels of the tabs of the account, and the label of the open tab. */
function tabs(view: HTMLElement): { all: string[]; open: string[] } {
  const links = Array.from(
    view.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Account"] a'),
  )
  return {
    all: links.map((link) => String(link.textContent)),
    open: links
      .filter((link) => link.getAttribute('aria-current') === 'page')
      .map((link) => String(link.textContent)),
  }
}

/** The requests to the Mac of this window: its pairing and its settings. */
function macRequests(server: FakeApiServer): string[] {
  return requestLines(server).filter((line) =>
    line.includes(DEVICE_CURRENT_PATH),
  )
}

describe('This Mac in the account', () => {
  test('the Mac app shows This Mac as the last tab, with the name and the state of the Mac', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ onMac: true })
    const app = await startedApp(server)
    const view = mountScreen(
      app,
      <MacApp window={window}>
        <AccountScreen connect={null} tab="this-mac" user={fakeUser} />
      </MacApp>,
    )
    await waitFor(
      () => queryByText("Cal's MacBook Pro", view),
      'the name of this Mac',
    )
    expect({
      tabs: tabs(view),
      sections: sections(view),
      state: queryByText('Available', view)?.textContent,
      requests: macRequests(server),
    }).toEqual({
      tabs: {
        all: [
          'General',
          'Agents',
          'Preferences',
          'Keyboard shortcuts',
          'This Mac',
        ],
        open: ['This Mac'],
      },
      sections: ['This Mac'],
      state: 'Available',
      requests: [`GET ${DEVICE_CURRENT_PATH}`, `GET ${DEVICE_SETTINGS_PATH}`],
    })
  })

  test('the General tab of the Mac app shows no This Mac and asks no Mac', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ onMac: true })
    const app = await startedApp(server)
    const view = mountScreen(
      app,
      <MacApp window={window}>
        <AccountScreen connect={null} tab="general" user={fakeUser} />
      </MacApp>,
    )
    await settle()
    expect({
      sections: sections(view),
      requests: macRequests(server),
    }).toEqual({
      sections: ['GitHub', 'Invite code'],
      requests: [],
    })
  })

  test('a browser has no This Mac tab, shows General at its address, and asks no Mac', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const app = await startedApp(server)
    const view = mountScreen(
      app,
      <AccountScreen connect={null} tab="this-mac" user={fakeUser} />,
    )
    await settle()
    expect({
      tabs: tabs(view),
      sections: sections(view),
      requests: macRequests(server),
    }).toEqual({
      tabs: {
        all: ['General', 'Agents', 'Preferences', 'Keyboard shortcuts'],
        open: ['General'],
      },
      sections: ['GitHub', 'Invite code'],
      requests: [],
    })
  })
})
