// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { accountWithDefaults } from '../../app/default-logins.test-support'
import { routes } from '../../app/router'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { chatGptLogin, kindChoices } from '../account/sign-in-test-kit'
import { click, settle } from '../test-mount'
import { isOff, org } from '../workspace/kept-test-kit'
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
          fast: false,
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
        { kind: 'Own endpoint', selected: false },
      ],
      getCode: true,
    })
  })

  test('the dialog and the page of a member with no login of their own name the org login that the server names, with no Connect notice, and ask to connect when no login serves', async () => {
    const shown = []
    for (const claude of ['org', null] as const) {
      const server = serverWith('dialog', {
        role: 'member',
        account: (account) => ({
          ...accountWithDefaults('member', { claude, codex: null }),
          newWorkspaceView: account.newWorkspaceView,
        }),
      })
      const tab = await openTab(server)
      click(newWorkspaceRow(sidebarOf(tab.view)))
      await settle()
      const dialog = openDialog(tab.view)
      const page = await openTab(server, { at: routes.newWorkspace(org) })
      shown.push({
        case: claude,
        dialogLabel: queryByText("Acme's login", dialog) !== null,
        dialogNotice:
          queryByText('Connect Claude to use Opus 5.5', dialog) !== null,
        pageLabel: queryByText("Acme's login", page.view) !== null,
        pageNotice:
          queryByText('Connect Claude to use Opus 5.5', page.view) !== null,
      })
    }
    expect(shown).toEqual([
      {
        case: 'org',
        dialogLabel: true,
        dialogNotice: false,
        pageLabel: true,
        pageNotice: false,
      },
      {
        case: null,
        dialogLabel: false,
        dialogNotice: true,
        pageLabel: false,
        pageNotice: true,
      },
    ])
  })
})
