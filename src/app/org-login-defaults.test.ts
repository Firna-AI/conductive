import { describe, expect, test } from 'vitest'
import {
  ACCOUNT_PATHS,
  type AccountResponse,
  type EndpointModelList,
} from '../shared/account'
import type { OrgAgentLoginStatus } from '../shared/org-agent-logins'
import {
  orgAgentLoginPath,
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
  ManualFocus,
  requestLines,
  testServices,
} from './test-kit'

const userId = coreFixtures('admin').account.user.id

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

/**
 * The app over `server`, after its first load, with held requests, a manual
 * timer, and a manual page focus.
 */
async function started(server: FakeApiServer, account: AccountResponse) {
  server.json('GET', ACCOUNT_PATHS.account, account)
  const held = new HeldRequests(server)
  const timer = new ManualDelay()
  const focus = new ManualFocus()
  const app = new AppModel(
    testServices(server, {
      fetch: held.fetch,
      delay: timer.delay,
      onFocus: focus.onFocus,
    }),
  )
  await app.start()
  return { app, held, timer, focus }
}

/**
 * The account of Cal after he connected a Claude login of his own in
 * another tab: his new Claude sessions in Acme take that login.
 */
const withOwnLogin = accountWithDefaults(
  'admin',
  { claude: 'own', codex: null },
  { ownLogins: true },
)

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

describe('the default logins of the account and the org logins of an org', () => {
  test('a Refresh of an org endpoint shows its new model list in the model pickers on the org login, with one read of the account', async () => {
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
    server.json(
      'GET',
      ACCOUNT_PATHS.account,
      accountWithDefaults(
        'admin',
        { claude: 'org', codex: null },
        { orgModelList: listAt(FAKE_TIME) },
      ),
    )
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
      accountReads: 1,
    })
  })

  test('a return to the Agents tab shows a Claude login that the person connected in another tab, also when the reply of the org logins comes before the reply of the account', async () => {
    const server = new FakeApiServer()
    const { app, held, focus } = await started(
      server,
      accountWithDefaults('admin', { claude: 'org', codex: null }),
    )
    serveOrgRead(server, listAt(FAKE_TIME))
    const stop = app.org(acme.id).watch('agentLogins')
    await flushMicrotasks()
    server.json('GET', ACCOUNT_PATHS.account, withOwnLogin)
    serveOrgRead(server, listAt(FAKE_TIME), { claude: 'own', codex: null })
    held.holdAnswer('GET', ACCOUNT_PATHS.account)
    // The return reads the account first, then the org logins of the tab.
    focus.focus()
    await flushMicrotasks()
    held.release('GET', ACCOUNT_PATHS.account)
    await app.account.refreshLogins()
    stop()
    expect({
      connected: app.account.login('claude').connected,
      login: newSessionLogin(account(app), acme.id, 'claude'),
    }).toEqual({ connected: true, login: 'own' })
  })

  test('a save of the org login of Acme keeps the Claude login of the person that a read of the account brings meanwhile', async () => {
    const server = new FakeApiServer()
    const { app, held } = await started(
      server,
      accountWithDefaults('admin', { claude: 'org', codex: null }),
    )
    server.json('GET', ACCOUNT_PATHS.account, withOwnLogin)
    held.holdAnswer('GET', ACCOUNT_PATHS.account)
    const read = app.account.refreshLogins()
    await flushMicrotasks()
    server.json('PUT', orgAgentLoginPath(acme.id, 'claude'), {
      agent: 'claude',
      connected: true,
      kind: 'api-key',
      useForEveryMember: false,
      updatedAt: FAKE_TIME,
    })
    serveOrgRead(server, listAt(FAKE_TIME), { claude: 'own', codex: null })
    const save = app.org(acme.id).agentLogins.save({
      agent: 'claude',
      kind: 'api-key',
      secret: 'sk-ant-acme',
    })
    held.release('GET', ACCOUNT_PATHS.account)
    await Promise.all([read, save])
    expect({
      connected: app.account.login('claude').connected,
      login: newSessionLogin(account(app), acme.id, 'claude'),
    }).toEqual({ connected: true, login: 'own' })
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
