import { describe, expect, test } from 'vitest'
import { ACCOUNT_PATHS, type AccountResponse } from '../shared/account'
import { API_PATHS } from '../shared/api'
import { acceptOrgInvitePath, type PendingOrgInvite } from '../shared/members'
import type { OrgSummary } from '../shared/orgs'
import { FakeApiServer } from '../test-support/fake-api'
import { coreFixtures, FAKE_TIME } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import { inOrgs, newSessionLogin } from './default-logins'
import {
  accountWithDefaults,
  acme,
  defaultsIn,
} from './default-logins.test-support'
import { flushMicrotasks, requestLines, testServices } from './test-kit'

const userId = coreFixtures('admin').account.user.id
const noLogin = { claude: null, codex: null } as const

/** Acme, as its org summary names it, without a deletion. */
const acmeSummary: OrgSummary = {
  ...acme,
  role: 'admin',
}

/** The login that a new Claude session of the person in `orgId` takes. */
function claudeDefault(app: AppModel, orgId: string) {
  const account = app.account.account.get()
  if (!account) throw new Error('The app has no account.')
  return newSessionLogin(inOrgs(account, app.orgs.get()), orgId, 'claude')
}

/** The reads of the account since the request with the index `from`. */
function accountReads(server: FakeApiServer, from: number): number {
  return requestLines(server)
    .slice(from)
    .filter((line) => line === `GET ${ACCOUNT_PATHS.account}`).length
}

/** The app over `server`, after its first load with `account`. */
async function started(server: FakeApiServer, account: AccountResponse) {
  server.json('GET', ACCOUNT_PATHS.account, account)
  const app = new AppModel(testServices(server))
  await app.start()
  return app
}

describe('an org that joins the orgs of the person', () => {
  test('an accepted invitation reads the account once, so a member with no login of their own takes the org login of the new org at once, and Get started counts it', async () => {
    const server = new FakeApiServer()
    const globex = { id: 'globex', name: 'Globex' }
    const invite: PendingOrgInvite = {
      id: 'invite-globex',
      email: 'cal@example.com',
      createdAt: FAKE_TIME - 3_600_000,
      orgId: globex.id,
      orgName: globex.name,
    }
    const before = accountWithDefaults('admin', noLogin)
    const app = await started(server, before)
    server.json('POST', acceptOrgInvitePath(invite.id), {
      org: { ...globex, role: 'member' },
    })
    // The server names the org login of Globex for the person who joined.
    server.json('GET', ACCOUNT_PATHS.account, {
      ...before,
      defaultLogins: [
        ...(before.defaultLogins ?? []),
        ...defaultsIn(globex, { claude: 'org', codex: null }, userId),
      ],
    })
    const from = server.requests.length
    await app.invitations.accept(invite, () => undefined)
    await flushMicrotasks()
    expect({
      login: claudeDefault(app, globex.id),
      agentStep: app.getStarted
        .get()
        ?.steps.find((step) => step.step === 'agent-login')?.complete,
      accountReads: accountReads(server, from),
    }).toEqual({ login: 'org', agentStep: true, accountReads: 1 })
  })

  test('a restore of a deleted org reads the account once, so its org login serves at once', async () => {
    const server = new FakeApiServer()
    const [, ...others] = coreFixtures().orgs.orgs
    server.json('GET', API_PATHS.orgs, {
      orgs: [
        {
          ...acmeSummary,
          deletion: {
            deletedAt: FAKE_TIME - 60_000,
            deletesAt: FAKE_TIME + 604_800_000,
          },
        },
        ...others,
      ],
    })
    // The server names no default login in a deleted org.
    const app = await started(server, {
      ...accountWithDefaults('admin', noLogin),
      defaultLogins: [],
    })
    server.json(
      'GET',
      ACCOUNT_PATHS.account,
      accountWithDefaults('admin', { claude: 'org', codex: null }),
    )
    const from = server.requests.length
    // The answer of Restore, which the members screens give to the app.
    app.putOrg(acmeSummary)
    await flushMicrotasks()
    expect({
      login: claudeDefault(app, acme.id),
      accountReads: accountReads(server, from),
    }).toEqual({ login: 'org', accountReads: 1 })
  })
})
