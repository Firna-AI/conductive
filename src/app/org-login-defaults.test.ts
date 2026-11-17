import { describe, expect, test } from 'vitest'
import {
  ACCOUNT_PATHS,
  type AccountResponse,
  type EndpointModelList,
} from '../shared/account'
import type { OrgAgentLoginStatus } from '../shared/org-agent-logins'
import {
  orgSettingsPaths,
  refreshOrgAgentLoginModelsPath,
} from '../shared/org-settings'
import { FakeApiServer } from '../test-support/fake-api'
import { coreFixtures, FAKE_TIME } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import {
  loginModels,
  newSessionLogin,
  newSessionModels,
} from './default-logins'
import {
  accountWithDefaults,
  acme,
  defaultsIn,
  type DefaultsOf,
} from './default-logins.test-support'
import { offeredModels } from './endpoint-models'
import {
  flushMicrotasks,
  HeldRequests,
  ManualDelay,
  requestLines,
  testServices,
} from './test-kit'

const userId = coreFixtures('admin').account.user.id
const futex = { id: 'futex', name: 'Futex' }

/** A model list of an org endpoint, read at `checkedAt`. */
function listAt(checkedAt: number, ...missing: string[]): EndpointModelList {
  return { missing, checkedAt }
}

/** The gateway of Acme as its org endpoint of Claude, with its last list. */
function gateway(modelList: EndpointModelList): OrgAgentLoginStatus {
  return {
    agent: 'claude',
    connected: true,
    kind: 'endpoint',
    host: 'llm.acme.example.com',
    useForEveryMember: false,
    updatedAt: FAKE_TIME,
    modelList,
  }
}

/**
 * Serves the read of the org logins of Acme: the gateway with `list`, and
 * the default logins of the person in Acme, when `defaults` names them.
 */
function serveOrgRead(
  server: FakeApiServer,
  list: EndpointModelList,
  defaults?: DefaultsOf,
): void {
  server.json('GET', orgSettingsPaths.agentLogins(acme.id), {
    agentLogins: [gateway(list), { agent: 'codex', connected: false }],
    ...(defaults && {
      defaultLogins: defaultsIn(acme, defaults, userId, list),
    }),
  })
}

/** The app over `server`, after its first load, with held requests and a manual timer. */
async function started(server: FakeApiServer, account: AccountResponse) {
  server.json('GET', ACCOUNT_PATHS.account, account)
  const held = new HeldRequests(server)
  const timer = new ManualDelay()
  const app = new AppModel(
    testServices(server, { fetch: held.fetch, delay: timer.delay }),
  )
  await app.start()
  return { app, held, timer }
}

/** The account of the app, as the screens read it. */
function account(app: AppModel): AccountResponse {
  const shown = app.account.account.get()
  if (!shown) throw new Error('The app has no account.')
  return shown
}

/** The Claude models that the picker of a new session in Acme offers. */
function claudeModels(app: AppModel): string[] {
  return offeredModels(
    app.models.get(),
    newSessionModels(account(app), acme.id),
    undefined,
  )
    .filter((model) => model.agent === 'claude')
    .map((model) => model.model)
}

describe('the default logins that the org logins of an org give the account', () => {
  test('a Refresh of an org endpoint shows its new model list in the model pickers on the org login, with no read of the account', async () => {
    const server = new FakeApiServer()
    const before = listAt(FAKE_TIME - 60_000, 'Fable 5.1')
    const { app } = await started(
      server,
      accountWithDefaults(
        'admin',
        { claude: 'org', codex: null },
        { orgModelList: before },
      ),
    )
    const shown = claudeModels(app)
    server.json('POST', refreshOrgAgentLoginModelsPath(acme.id, 'claude'), {
      modelListReadFailed: false,
    })
    serveOrgRead(server, listAt(FAKE_TIME), { claude: 'org', codex: null })
    const from = server.requests.length
    await app.org(acme.id).agentLogins.refreshModels('claude')
    expect({
      shown,
      refreshed: claudeModels(app),
      accountReads: requestLines(server)
        .slice(from)
        .filter((line) => line === `GET ${ACCOUNT_PATHS.account}`).length,
    }).toEqual({
      shown: ['Opus 5.5', 'Sonnet 5.5'],
      refreshed: ['Opus 5.5', 'Sonnet 5.5', 'Fable 5.1'],
      accountReads: 0,
    })
  })

  test('a read of the org logins of Acme shows the default logins of Acme in their place, and keeps those of another org', async () => {
    const server = new FakeApiServer()
    const list = listAt(FAKE_TIME)
    const { app } = await started(server, {
      ...accountWithDefaults(
        'admin',
        { claude: 'own', codex: 'own' },
        { ownLogins: true },
      ),
      defaultLogins: [
        ...defaultsIn(acme, { claude: 'own', codex: 'own' }, userId),
        ...defaultsIn(futex, { claude: 'org', codex: null }, userId),
      ],
    })
    serveOrgRead(server, list, { claude: 'org', codex: 'own' })
    await app.org(acme.id).reload('agentLogins')
    expect(account(app).defaultLogins).toEqual([
      ...defaultsIn(acme, { claude: 'org', codex: 'own' }, userId, list),
      ...defaultsIn(futex, { claude: 'org', codex: null }, userId),
    ])
  })

  test('a late answer of an older read of the org logins does not take back the default logins of a newer read of the account', async () => {
    const server = new FakeApiServer()
    const { app, held } = await started(
      server,
      accountWithDefaults(
        'admin',
        { claude: 'own', codex: 'own' },
        { ownLogins: true },
      ),
    )
    const path = orgSettingsPaths.agentLogins(acme.id)
    serveOrgRead(server, listAt(FAKE_TIME), { claude: 'own', codex: 'own' })
    held.holdAnswer('GET', path)
    const older = app.org(acme.id).reload('agentLogins')
    await flushMicrotasks()
    // An admin turned the switch of Acme on, and a page return reads it.
    server.json(
      'GET',
      ACCOUNT_PATHS.account,
      accountWithDefaults(
        'admin',
        { claude: 'org', codex: 'own' },
        { ownLogins: true },
      ),
    )
    await app.account.refreshLogins()
    const newer = newSessionLogin(account(app), acme.id, 'claude')
    held.release('GET', path)
    await older
    expect({
      newer,
      after: newSessionLogin(account(app), acme.id, 'claude'),
    }).toEqual({ newer: 'org', after: 'org' })
  })

  test.each([
    {
      serves: 'an org login serves new sessions',
      defaults: { claude: 'org', codex: null },
      kept: undefined,
    },
    {
      serves: 'the account keeps an org endpoint list',
      defaults: { claude: 'own', codex: 'own' },
      kept: listAt(FAKE_TIME - 60_000, 'Fable 5.1'),
    },
  ] as const)(
    'the account reads once a minute while $serves and the person has no own endpoint, so a list that the Worker read in the background reaches the pickers on the org login',
    async ({ defaults, kept }) => {
      const server = new FakeApiServer()
      const ownLogins = defaults.claude === 'own'
      const { app, timer } = await started(
        server,
        accountWithDefaults('admin', defaults, {
          ownLogins,
          orgModelList: kept,
        }),
      )
      const waits = timer.waits
      const read = listAt(FAKE_TIME)
      server.json(
        'GET',
        ACCOUNT_PATHS.account,
        accountWithDefaults('admin', defaults, {
          ownLogins,
          orgModelList: read,
        }),
      )
      await timer.run(60_000)
      expect({
        waits,
        models: loginModels(account(app), acme.id, 'claude', 'org'),
      }).toEqual({
        waits: [60_000],
        models: { agent: 'claude', modelList: read },
      })
    },
  )

  test('the Agents tab reads the org logins again once a minute while an org endpoint is connected, so a list that the Worker read in the background shows', async () => {
    const server = new FakeApiServer()
    const { app, timer } = await started(server, coreFixtures().account)
    serveOrgRead(server, listAt(FAKE_TIME - 60_000, 'Fable 5.1'))
    const org = app.org(acme.id)
    const stop = org.watch('agentLogins')
    await flushMicrotasks()
    const waits = timer.waits
    serveOrgRead(server, listAt(FAKE_TIME))
    await timer.run(60_000)
    const claude = org.agentLogins.login('claude')
    stop()
    expect({ waits, claude }).toEqual({
      waits: [60_000],
      claude: gateway(listAt(FAKE_TIME)),
    })
  })
})
