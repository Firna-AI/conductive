// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { HeldRequests, requestLines } from '../../app/test-kit'
import { chatHistoryPath } from '../../shared/events'
import { sessionPaths, sessionsPath } from '../../shared/sessions'
import { byLabel } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { Shell } from '../Shell'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { emit, here, id, org, recordingSocket } from './kept-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const saved = 'Address autocomplete'
const debounce = 'Debounce the address lookups to 250 ms'
const freshTitle = 'Check a restored address'
const newerTitle = 'Write the restore test'

/** The titles of the session tabs that show as the current one. */
const currentTabs = (root: HTMLElement) =>
  Array.from(
    byLabel('Sessions and files', root).querySelectorAll(
      'button[aria-current="page"]',
    ),
    (tab) => tab.textContent,
  )

/** The titles of all session tabs, in the order of the alphabet. */
const tabTitles = (root: HTMLElement) =>
  Array.from(
    byLabel('Sessions and files', root).querySelectorAll('button'),
    (tab) => tab.textContent ?? '',
  )
    .filter((title) => title !== '')
    .sort()

/** The session tab with this title, for a press. */
function tabNamed(root: HTMLElement, title: string): HTMLElement {
  const tabs = byLabel('Sessions and files', root).querySelectorAll('button')
  const tab = Array.from(tabs).find((item) => item.textContent === title)
  if (!tab) throw new Error(`No session tab ${title}.`)
  return tab
}

/** The whole app in a tab at `href`, over the fake API, with held requests. */
async function openAt(href: string) {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const app = await startedApp(server, {
    events: recordingSocket(server).source,
    fetch: held.fetch,
  })
  const navigation = memoryNavigation(href)
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
  )
  await settle()
  return { server, held, navigation, view }
}

/**
 * Leaves the workspace for another page, so its kept chat hides, and then
 * starts a session that the hidden chat hears nothing of.
 */
async function startWhileHidden(
  server: FakeApiServer,
  navigation: ReturnType<typeof memoryNavigation>,
) {
  act(() => navigation.push(routes.accountTab('general')))
  await settle()
  const { sessions } = workspaceFixtures()
  const fresh = { ...sessions.sessions[1], id: 'fresh', title: freshTitle }
  server.json('GET', sessionsPath(org, id), {
    ...sessions,
    sessions: [...sessions.sessions, fresh],
  })
  server.json('GET', chatHistoryPath(org, id, 'fresh'), {
    events: [],
    throughEventNumber: 0,
  })
}

describe('session addresses', () => {
  test('an address of an open session shows that session, and the workspace address takes its place', async () => {
    const { navigation, view } = await openAt(
      routes.session(org, id, 'debounce'),
    )
    expect({ shown: currentTabs(view), history: navigation.history }).toEqual({
      shown: [debounce],
      history: [here],
    })
  })

  test('an address of a closed or unknown session keeps the shown tab and reopens nothing', async () => {
    for (const session of ['postcode', 'missing']) {
      const { server, navigation, view } = await openAt(
        routes.session(org, id, session),
      )
      const reopens = requestLines(server).filter(
        (line) => line === `POST ${sessionPaths.reopen(org, id, session)}`,
      )
      expect(
        { shown: currentTabs(view), at: navigation.href(), reopens },
        session,
      ).toEqual({ shown: [saved], at: here, reopens: [] })
      view.remove()
    }
  })

  test('a session that started while the kept chat was hidden shows from its address', async () => {
    const { server, navigation, view } = await openAt(here)
    await startWhileHidden(server, navigation)
    act(() => navigation.push(routes.session(org, id, 'fresh')))
    await settle()
    expect({ shown: currentTabs(view), at: navigation.href() }).toEqual({
      shown: [freshTitle],
      at: here,
    })
  })

  test('a tab press during the lookup of an address keeps the pressed tab', async () => {
    const { server, held, navigation, view } = await openAt(here)
    await startWhileHidden(server, navigation)
    held.holdAnswer('GET', sessionsPath(org, id))
    act(() => navigation.push(routes.session(org, id, 'fresh')))
    await settle()
    click(tabNamed(view, debounce))
    await settle()
    held.release('GET', sessionsPath(org, id))
    await settle()
    expect({ shown: currentTabs(view), at: navigation.href() }).toEqual({
      shown: [debounce],
      at: here,
    })
  })

  test('a session that the stream brings during the lookup stays when the older list comes', async () => {
    const { server, held, navigation, view } = await openAt(here)
    await startWhileHidden(server, navigation)
    held.holdAnswer('GET', sessionsPath(org, id))
    act(() => navigation.push(routes.session(org, id, 'fresh')))
    await settle()
    const { sessions } = workspaceFixtures()
    const newer = { ...sessions.sessions[1], id: 'newer', title: newerTitle }
    emit(server, { type: 'session.updated', session: newer })
    await settle()
    held.release('GET', sessionsPath(org, id))
    await settle()
    expect({ tabs: tabTitles(view), shown: currentTabs(view) }).toEqual({
      tabs: [saved, freshTitle, debounce, newerTitle],
      shown: [freshTitle],
    })
  })
})
