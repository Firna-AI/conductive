// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { requestLines } from '../../app/test-kit'
import { ACCOUNT_PATHS, agentLoginPath } from '../../shared/account'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_TIME,
  fakeUser,
} from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { mountScreen } from '../test-mount'
import { startedApp, textOf } from '../test-render'
import { fieldNamed } from '../workspace/kept-test-kit'
import { AccountScreen } from './AccountScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const path = agentLoginPath('codex')

/** The kinds of the switch of the open form, in their order. */
function kindChoices(view: HTMLElement) {
  const group = byRole('radiogroup', 'Connect with', view)
  return Array.from(group.querySelectorAll('[role="radio"]'), (choice) => ({
    kind: choice.textContent,
    selected: choice.getAttribute('aria-checked') === 'true',
  }))
}

/** The visible text of the row of an agent, with its share setting. */
function agentRow(view: HTMLElement, index: number): string {
  const item = byRole('list', 'Agents', view).children.item(index)
  return textOf(item?.outerHTML ?? '')
}

describe('the Connect form of Codex', () => {
  test('starts on API key, and a save of an access token sends the kind token and shows Codex connected by an access token that other members do not use', async () => {
    const server = new FakeApiServer()
    const { account } = coreFixtures()
    server.json('GET', ACCOUNT_PATHS.account, {
      ...account,
      agentLogins: account.agentLogins.map((login) =>
        login.agent === 'codex' ? { agent: 'codex', connected: false } : login,
      ),
    })
    server.json('PUT', path, {
      agent: 'codex',
      connected: true,
      kind: 'token',
      noReuse: true,
      updatedAt: FAKE_TIME,
    })
    holdAnimationFrames()
    const app = await startedApp(server)
    const view = mountScreen(
      app,
      <AccountScreen connect="codex" tab="general" user={fakeUser} />,
    )
    const first = kindChoices(view)
    await press(byRole('radio', 'Access token', view))
    await typeText(fieldNamed(view, 'Codex access token'), 'codex-token')
    await press(byRole('button', 'Connect', view))
    await waitFor(
      () => queryByRole('button', 'Remove Codex', view),
      'the connected Codex login',
    )
    const saves = server.requests.filter(({ method }) => method === 'PUT')
    const share = byRole('switch', 'Codex Let other members use this login')
    expect({
      first,
      saves: requestLines(server).filter((line) => line.startsWith('PUT')),
      body: await saves[0]?.json(),
      row: agentRow(view, 1),
      shared: share.getAttribute('aria-checked'),
    }).toEqual({
      first: [
        { kind: 'API key', selected: true },
        { kind: 'Access token', selected: false },
      ],
      saves: [`PUT ${path}`],
      body: { agent: 'codex', kind: 'token', secret: 'codex-token' },
      row: 'Codex Connected Access token Remove Let other members use this login Their messages in your sessions start a new session on their own login.',
      shared: 'false',
    })
  })
})
