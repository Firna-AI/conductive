// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest'
import { ACCOUNT_PATHS, type AccountResponse } from '../../shared/account'
import type { OrgRole } from '../../shared/api'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT, press } from '../../test-support/mount'
import {
  accountWithDefaults,
  orgListWithout,
} from '../../app/default-logins.test-support'
import { loginPrivate, withSessions } from '../state/linked-kit'
import { first, mountChat, second } from './tab-drag-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The labels of the models of the fake, which are also their IDs. */
const labels = coreFixtures().models.models.map((model) => model.label)

/**
 * The logins of a reader who runs Claude on an own endpoint. Its last model
 * list did not name Opus 5.5, the model of the sessions, or Sonnet 5.5.
 */
const endpointLogins: AccountResponse['agentLogins'] = [
  {
    agent: 'claude',
    connected: true,
    kind: 'endpoint',
    host: 'proxy.example.com',
    modelList: {
      missing: ['Opus 5.5', 'Sonnet 5.5'],
      checkedAt: FAKE_TIME,
    },
    noReuse: false,
    updatedAt: FAKE_TIME,
  },
  { agent: 'codex', connected: false },
]

/** The fake API, where the reader of `role` has the `endpointLogins`. */
function serverWith(role: OrgRole): FakeApiServer {
  const server = new FakeApiServer({ role })
  const account = coreFixtures(role).account
  server.json('GET', ACCOUNT_PATHS.account, {
    ...account,
    agentLogins: endpointLogins,
  } satisfies AccountResponse)
  return server
}

/** The models that the picker of the composer offers, in their order. */
async function offeredModels(server: FakeApiServer): Promise<string[]> {
  await mountChat({ server, tabs: [first, second], viewport: 'desktop' })
  await press(byRole('button', 'Model and effort: Opus 5.5, High'))
  const menu = byRole('menu', 'Model and effort')
  return Array.from(menu.querySelectorAll('[role="menuitemradio"]')).flatMap(
    (item) => labels.filter((label) => item.textContent?.startsWith(label)),
  )
}

describe('the models of the composer of a session', () => {
  it("hide in the reader's own session each model that the reader's own endpoint does not list, and keep the current model of the session", async () => {
    expect(await offeredModels(serverWith('admin'))).toEqual([
      'Opus 5.5',
      'Fable 5.1',
      'GPT-6.1 Sol',
      'GPT-6 Astra',
    ])
  })

  it("are every model of the app in a session on another member's login", async () => {
    expect(await offeredModels(serverWith('member'))).toEqual(labels)
  })

  it('follow the last list of the org endpoint in a session on the org login, for a member whose own endpoint lists other models', async () => {
    const server = serverWith('member')
    server.json('GET', ACCOUNT_PATHS.account, {
      ...accountWithDefaults(
        'member',
        { claude: 'own', codex: null },
        { orgModelList: orgListWithout('Fable 5.1') },
      ),
      agentLogins: endpointLogins,
    } satisfies AccountResponse)
    withSessions(server, (session) => ({
      ...session,
      login: { type: 'org', orgId: FAKE_IDS.org },
    }))
    expect(await offeredModels(server)).toEqual([
      'Opus 5.5',
      'Sonnet 5.5',
      'GPT-6.1 Sol',
      'GPT-6 Astra',
    ])
  })

  it("follow the reader's own list when a message starts a linked session on the reader's own login", async () => {
    const server = serverWith('member')
    withSessions(server, loginPrivate)
    expect(await offeredModels(server)).toEqual([
      'Opus 5.5',
      'Fable 5.1',
      'GPT-6.1 Sol',
      'GPT-6 Astra',
    ])
  })
})
