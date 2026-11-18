// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { testServices } from '../../app/test-kit'
import { sessionLink } from '../../shared/session-link'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_ORIGIN } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import {
  debounce,
  first,
  layOut,
  mountChat,
  second,
  shownTab,
} from './tab-drag-test-kit'
import { menuItems, rightClick } from './tab-row-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The second session of the fixtures, which no test shows. */
const sessionId = workspaceFixtures('ready').sessions.sessions[1].id

/** The services of the app, whose clipboard keeps or refuses each text. */
function clipboard(server: FakeApiServer, refuse = false) {
  const copied: string[] = []
  const services = testServices(server, {
    copy: async (text) => {
      if (refuse) throw new Error('The clipboard refused the text.')
      copied.push(await text)
    },
  })
  return { copied, services }
}

/** The titles of the toasts that show. */
function toasts(): string[] {
  const region = queryByRole('region', 'Notifications')
  if (!region) return []
  return Array.from(
    region.querySelectorAll('[role="status"], [role="alert"]'),
    (toast) => toast.textContent ?? '',
  )
}

const toastShows = () => toasts().length > 0

/** Mounts the chat with two session tabs, and opens the menu of the second. */
async function openMenu(server: FakeApiServer, refuse = false) {
  const { copied, services } = clipboard(server, refuse)
  await mountChat({
    server,
    tabs: [first, second],
    viewport: 'desktop',
    copy: services,
  })
  const tab = byRole('button', debounce)
  layOut(byRole('button', 'Address autocomplete'), tab)
  rightClick(tab, { clientX: 150, clientY: 12 })
  return copied
}

describe('Copy link in the tab menu', () => {
  it('copies the link of a session that does not show, says "Link copied", closes the menu, and keeps the shown tab without a request', async () => {
    const server = new FakeApiServer()
    const copied = await openMenu(server)
    const requests = server.requests.length

    await press(byRole('menuitem', 'Copy link'))
    await waitFor(toastShows, 'the toast of the copy')

    expect({
      copied,
      toasts: toasts(),
      menu: menuItems(debounce),
      shown: shownTab(),
      requests: server.requests.length - requests,
    }).toEqual({
      copied: [
        sessionLink(FAKE_ORIGIN, FAKE_IDS.org, FAKE_IDS.workspace, sessionId),
      ],
      toasts: ['Link copied'],
      menu: [],
      shown: 'Address autocomplete',
      requests: 0,
    })
  })

  it('says "The link didn\'t copy. Try again." when the clipboard refuses the link', async () => {
    const server = new FakeApiServer()
    const copied = await openMenu(server, true)

    await press(byRole('menuitem', 'Copy link'))
    await waitFor(toastShows, 'the toast of the copy')

    expect({ copied, toasts: toasts() }).toEqual({
      copied: [],
      toasts: ["The link didn't copy. Try again."],
    })
  })
})
