// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { AppModel } from '../../app/app-model'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { testServices } from '../../app/test-kit'
import { agentLoginPath } from '../../shared/account'
import {
  byRole,
  focusedElement,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { Shell } from '../Shell'
import { mountScreen, settle } from '../test-mount'
import { fieldNamed } from '../workspace/kept-test-kit'
import { openAccount, serveAccount } from './sign-in-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** Presses a button that has the focus, as the keyboard does. */
async function pressFocused(button: HTMLElement): Promise<void> {
  act(() => button.focus())
  await press(button)
}

describe('the keyboard focus of the Connect form', () => {
  test('a form that opens with the page takes no focus, Cancel gives it to Connect, Connect gives it to the switch, and a connect gives it to the name of the agent', async () => {
    const server = new FakeApiServer()
    serveAccount(server, [{ agent: 'claude', connected: false }])
    server.json('PUT', agentLoginPath('claude'), {
      agent: 'claude',
      connected: true,
      kind: 'token',
      noReuse: true,
      updatedAt: FAKE_TIME,
    })
    const { view } = await openAccount(server, {}, 'claude')
    const withPage = focusedElement()
    await pressFocused(byRole('button', 'Cancel', view))
    const cancelled = focusedElement()
    await pressFocused(byRole('button', 'Connect Claude', view))
    const opened = focusedElement()
    await typeText(fieldNamed(view, 'Subscription token'), 'claude-token')
    await pressFocused(byRole('button', 'Connect', view))
    await waitFor(
      () => queryByRole('button', 'Remove Claude', view),
      'the connected Claude login',
    )
    expect({
      withPage,
      cancelled,
      opened,
      connected: focusedElement(),
    }).toEqual({
      withPage: 'the page',
      cancelled: 'button Connect Claude',
      opened: 'radio Subscription token',
      connected: 'span Claude',
    })
  })

  test('a link to another form on the open account opens it without the focus, and a link that closes it gives the focus to its Connect', async () => {
    const server = new FakeApiServer()
    serveAccount(server)
    const navigation = memoryNavigation(routes.account())
    const view = mountScreen(
      new AppModel(testServices(server)),
      <NavigationContext.Provider value={navigation}>
        <Shell />
      </NavigationContext.Provider>,
      { viewport: 'desktop' },
    )
    await settle()
    act(() => navigation.push(routes.account('codex')))
    await settle()
    const opened = focusedElement()
    act(() => byRole('radio', 'API key', view).focus())
    act(() => navigation.push(routes.account()))
    await settle()
    expect({ opened, closed: focusedElement() }).toEqual({
      opened: 'the page',
      closed: 'button Connect Codex',
    })
  })
})
