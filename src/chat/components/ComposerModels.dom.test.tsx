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
import { mount, MOUNTED_TEST_TIMEOUT, press } from '../../test-support/mount'
import {
  accountWithDefaults,
  orgListWithout,
} from '../../app/default-logins.test-support'
import { loginPrivate, withSessions } from '../state/linked-kit'
import { newSessionRecord } from '../state/test-kit'
import { spokenChoices } from './model-picker-test-kit'
import { renderChat, TestClock } from './render-kit'
import { SessionChat } from './SessionChat'
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

/** The labels of the models of the open menu `label`, in their order. */
function modelsOf(label: string): string[] {
  const menu = byRole('menu', label)
  return Array.from(menu.querySelectorAll('[role="menuitemradio"]')).flatMap(
    (item) => labels.filter((label) => item.textContent?.startsWith(label)),
  )
}

/**
 * The models of the picker of the composer, in their order. Its menu lists
 * the favourites of the account first, so the models are in All models.
 */
async function pickedModels(): Promise<string[]> {
  await press(byRole('button', 'Model and effort: Opus 5.5, High'))
  await press(byRole('menuitem', 'All models'))
  return modelsOf('All models')
}

/** The models that the picker of the composer offers, in their order. */
async function offeredModels(server: FakeApiServer): Promise<string[]> {
  await mountChat({ server, tabs: [first, second], viewport: 'desktop' })
  return pickedModels()
}

describe('the models of the composer of a session', () => {
  it("hide in the reader's own session each model that the reader's own endpoint does not list, with each favourite on it, and keep the current model of the session", async () => {
    await mountChat({
      server: serverWith('admin'),
      tabs: [first, second],
      viewport: 'desktop',
    })
    await press(byRole('button', 'Model and effort: Opus 5.5, High'))
    // The starting favourites of the account hold Sonnet 5.5 Medium too.
    const favourites = spokenChoices().filter((words) =>
      labels.some((label) => words.startsWith(label)),
    )
    await press(byRole('menuitem', 'All models'))
    expect({ favourites, models: modelsOf('All models') }).toEqual({
      favourites: [
        'Opus 5.5 High',
        'Opus 5.5 Max',
        'GPT-6.1 Sol High New session',
        'GPT-6 Astra Medium New session',
      ],
      models: ['Opus 5.5', 'Fable 5.1', 'GPT-6.1 Sol', 'GPT-6 Astra'],
    })
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

  it('follow the default login that the record names in an empty session of another member, and the label names it: the org login, with the last list of the org endpoint', async () => {
    const rendered = await renderChat({
      role: 'member',
      setup: (server) =>
        server.json('GET', ACCOUNT_PATHS.account, {
          ...accountWithDefaults(
            'member',
            { claude: 'own', codex: null },
            { orgModelList: orgListWithout('Fable 5.1') },
          ),
          agentLogins: endpointLogins,
        } satisfies AccountResponse),
    })
    // Cal, the starter of the fixtures, opened the session and sent nothing.
    rendered.chat.emit({
      type: 'session.updated',
      session: newSessionRecord(
        'started',
        { agent: 'claude', model: 'Opus 5.5', effort: 'high', fast: false },
        null,
        { defaultLogin: { type: 'org', orgId: FAKE_IDS.org } },
      ),
    })
    await rendered.chat.controller.select('started')
    const { container } = await mount(
      <TestClock>
        <SessionChat
          controller={rendered.chat.controller}
          mobile={false}
          onConnectAgent={() => {}}
          snapshot={rendered.chat.controller.getSnapshot()}
        />
      </TestClock>,
    )
    const label = Array.from(container.querySelectorAll('span'), (span) =>
      span.textContent?.trim(),
    ).find((text) => text?.endsWith("'s login"))
    expect({ label, models: await pickedModels() }).toEqual({
      label: "Acme's login",
      models: ['Opus 5.5', 'Sonnet 5.5', 'GPT-6.1 Sol', 'GPT-6 Astra'],
    })
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
