// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { chatGptLogin, kindChoices } from '../account/sign-in-test-kit'
import { click, settle } from '../test-mount'
import { isOff } from '../workspace/kept-test-kit'
import {
  newWorkspaceRow,
  openDialog,
  openTab,
  serverWith,
  sidebarOf,
} from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('the Connect notice of New workspace', () => {
  test('a Codex login that the app can no longer use gets the Connect notice, and Connect opens its ChatGPT sign-in on the account', async () => {
    const server = serverWith('dialog', {
      account: (account) => ({
        ...account,
        defaultChoice: {
          agent: 'codex',
          model: 'GPT-6.1 Sol',
          effort: 'medium',
        },
        agentLogins: account.agentLogins.map((login) =>
          login.agent === 'codex'
            ? { ...chatGptLogin, unusableCause: 'ChatGPT access expired.' }
            : login,
        ),
      }),
    })
    const tab = await openTab(server)
    click(newWorkspaceRow(sidebarOf(tab.view)))
    await settle()
    const dialog = openDialog(tab.view)
    expect({
      notice: queryByText('Connect Codex to use GPT-6.1 Sol', dialog) !== null,
      connect: queryByRole('button', 'Connect Codex', dialog) !== null,
      createOff: isOff(byRole('button', 'Create', dialog)),
    }).toEqual({ notice: true, connect: true, createOff: true })
    click(byRole('button', 'Connect Codex', dialog))
    await settle()
    expect({
      address: tab.address(),
      kinds: kindChoices(tab.view),
      getCode: queryByRole('button', 'Get a code', tab.view) !== null,
    }).toEqual({
      address: routes.account('codex'),
      kinds: [
        { kind: 'API key', selected: false },
        { kind: 'ChatGPT plan', selected: true },
      ],
      getCode: true,
    })
  })
})
