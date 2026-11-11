// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
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
})
