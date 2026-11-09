// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import type { FetchLike } from '../../app/api/client'
import { HeldRequests, requestLines } from '../../app/test-kit'
import { agentLoginPath } from '../../shared/account'
import {
  byRole,
  queryAllByText,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME, fakeUser } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'
import { AccountScreen } from './AccountScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const path = agentLoginPath('claude')
const sharedHint = 'Their messages in your sessions use this login.'
const keptHint =
  'Their messages in your sessions start a new session on their own login.'
const notSaved = 'Not saved. The request failed. Try again.'

/** The Claude login of the fixtures after other members may use it. */
const sharedClaude = {
  agent: 'claude',
  connected: true,
  kind: 'token',
  noReuse: false,
  updatedAt: FAKE_TIME,
}

function shareSwitch(agent: 'Claude' | 'Codex'): HTMLElement {
  return byRole('switch', `${agent} Let other members use this login`)
}

/** What a share switch shows: its value, and whether it takes a change. */
function shown(agent: 'Claude' | 'Codex') {
  const control = shareSwitch(agent)
  return {
    on: control.getAttribute('aria-checked') === 'true',
    locked: control.getAttribute('aria-disabled') === 'true',
  }
}

/**
 * The account of the fixtures: a Claude token and a Codex API key. `fetch`
 * can hold the replies of the server, as `HeldRequests` does.
 */
async function account(server: FakeApiServer, fetch?: FetchLike) {
  holdAnimationFrames()
  const app = await startedApp(server, { fetch })
  mountScreen(app, <AccountScreen connect={null} user={fakeUser} />)
  return app
}

describe('the share setting of an agent login', () => {
  test('a change shows at once, saves the opposite no-reuse value, and shows the saved value', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    server.json('PATCH', path, sharedClaude)
    held.holdAnswer('PATCH', path)
    const app = await account(server, held.fetch)
    const before = {
      claude: shown('Claude'),
      codex: shown('Codex'),
      hints: [queryAllByText(keptHint), queryAllByText(sharedHint)].map(
        (found) => found.length,
      ),
    }
    await press(shareSwitch('Claude'))
    const saving = shown('Claude')
    held.release('PATCH', path)
    await waitFor(() => !shown('Claude').locked, 'the saved switch')
    expect({
      before,
      saving,
      request: requestLines(server).at(-1),
      body: await server.requests.at(-1)?.json(),
      after: shown('Claude'),
      hints: queryAllByText(sharedHint).length,
      login: app.account.login('claude'),
    }).toEqual({
      before: {
        claude: { on: false, locked: false },
        codex: { on: true, locked: false },
        hints: [1, 1],
      },
      saving: { on: true, locked: true },
      request: `PATCH ${path}`,
      body: { noReuse: false },
      after: { on: true, locked: false },
      hints: 2,
      login: sharedClaude,
    })
  })

  test('a failed change shows its cause under the switch, with the saved value, until a later change saves', async () => {
    const server = new FakeApiServer()
    const failure = {
      code: 'internal_error',
      message: 'The request failed. Try again.',
    }
    server.json('PATCH', path, { error: failure }, 500)
    await account(server)
    await press(shareSwitch('Claude'))
    await waitFor(() => queryByText(notSaved), 'the cause of the failed save')
    const failed = shown('Claude')
    server.json('PATCH', path, sharedClaude)
    await press(shareSwitch('Claude'))
    await waitFor(() => shown('Claude').on, 'the saved switch')
    expect({ failed, cause: queryByText(notSaved) }).toEqual({
      failed: { on: false, locked: false },
      cause: null,
    })
  })

  test('a reply that says the login is gone shows Connect in place of the login', async () => {
    const server = new FakeApiServer()
    server.json('PATCH', path, { agent: 'claude', connected: false })
    await account(server)
    await press(shareSwitch('Claude'))
    await waitFor(
      () => queryByRole('button', 'Connect Claude'),
      'Connect of Claude',
    )
    expect(
      queryByRole('switch', 'Claude Let other members use this login'),
    ).toBeNull()
  })
})
