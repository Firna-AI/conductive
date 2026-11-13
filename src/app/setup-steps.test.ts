import { describe, expect, test } from 'vitest'
import type { AccountResponse } from '../shared/account'
import type { GetStartedResponse } from '../shared/onboarding'
import type { OrgSummary } from '../shared/orgs'
import { coreFixtures, FAKE_TIME } from '../test-support/fixtures/core'
import { setupSteps } from './setup-steps'
import { Store } from './store'

/** The three steps, each done or open. */
function steps(app: boolean, org: boolean, agent: boolean) {
  return [
    { step: 'github-app', complete: app },
    { step: 'org', complete: org },
    { step: 'agent-login', complete: agent },
  ] as const
}

const reply = (
  orgId: string | null,
  app: boolean,
  org: boolean,
  agent: boolean,
): GetStartedResponse => ({ orgId, steps: steps(app, org, agent) })

const acme: OrgSummary = { id: 'acme', name: 'Acme', role: 'admin' }
const deletedLabs: OrgSummary = {
  id: 'labs',
  name: 'Labs',
  role: 'admin',
  deletion: { deletedAt: FAKE_TIME, deletesAt: FAKE_TIME + 1 },
}
const connected = coreFixtures().account
const noLogin: AccountResponse = {
  ...connected,
  agentLogins: [
    { agent: 'claude', connected: false },
    { agent: 'codex', connected: false },
  ],
}
/** Codex is connected, but the app can no longer use its ChatGPT sign-in. */
const signedOut: AccountResponse = {
  ...connected,
  agentLogins: [
    { agent: 'claude', connected: false },
    {
      agent: 'codex',
      connected: true,
      kind: 'token',
      noReuse: true,
      updatedAt: FAKE_TIME,
      unusableCause: 'ChatGPT access expired.',
    },
  ],
}

/** The steps that the app shows for these sources. */
function shown(
  server: GetStartedResponse | null,
  orgs: readonly OrgSummary[],
  account: AccountResponse | null,
) {
  return setupSteps({
    server: new Store(server),
    orgs: new Store(orgs),
    account: new Store(account),
  }).get()
}

describe('setupSteps', () => {
  test('the org step follows the orgs that are not deleted, the agent step follows the logins that can run turns, only the GitHub App step comes from the API, and nothing shows before the account loads', () => {
    expect({
      inUse: shown(reply('acme', true, true, true), [acme], connected),
      leftLastOrg: shown(reply('acme', true, true, true), [], connected),
      deletedFirst: shown(
        reply(null, true, false, true),
        [deletedLabs, acme],
        connected,
      ),
      deletedOnly: shown(
        reply(null, true, false, true),
        [deletedLabs],
        connected,
      ),
      connectedElsewhere: shown(
        reply('acme', true, true, false),
        [acme],
        connected,
      ),
      noLogin: shown(reply('acme', true, true, true), [acme], noLogin),
      signedOut: shown(reply('acme', true, true, true), [acme], signedOut),
      noApp: shown(reply('acme', false, true, true), [acme], connected),
      loading: shown(null, [acme], connected),
      accountLoading: shown(reply('acme', true, true, true), [acme], null),
    }).toEqual({
      inUse: reply('acme', true, true, true),
      leftLastOrg: reply(null, true, false, true),
      deletedFirst: reply('acme', true, true, true),
      deletedOnly: reply(null, true, false, true),
      connectedElsewhere: reply('acme', true, true, true),
      noLogin: reply('acme', true, true, false),
      signedOut: reply('acme', true, true, false),
      noApp: reply('acme', false, true, true),
      loading: null,
      accountLoading: null,
    })
  })

  test('keeps one snapshot until a source changes, as useStore needs', () => {
    const orgs = new Store<readonly OrgSummary[]>([acme])
    const shownSteps = setupSteps({
      server: new Store<GetStartedResponse | null>(
        reply('acme', true, true, true),
      ),
      orgs,
      account: new Store<AccountResponse | null>(connected),
    })
    const first = shownSteps.get()
    const again = shownSteps.get()
    orgs.set([])
    const changed = shownSteps.get()
    expect({
      same: first === again,
      renewed: changed !== first,
      changed,
    }).toEqual({
      same: true,
      renewed: true,
      changed: reply(null, true, false, true),
    })
  })
})
