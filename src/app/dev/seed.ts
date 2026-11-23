import { waitingEmail } from '../../../docs/mockups/src/fixtures/waitlist'
import type { AgentLoginStatus } from '../../shared/account'
import type { OrgSummary } from '../../shared/orgs'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../../test-support/fixtures/core'
import { waitingUser } from '../../test-support/fixtures/waitlist'
import { AGENTS } from '../api/read-core'
import { getStartedOrder } from '../get-started'
import { acme } from './acme-seed'
import { devEndpointLogins } from './endpoint-logins'
import type { DevOptions } from './options'
import { seededOrgLogins } from './org-login-routes'
import { seedProviders } from './provider-routes'
import { operatorRecords } from './seed-operator'
import { seedSwitches } from './switch-seed'
import { freshOrg, type DevState, type DevWaitlist } from './state'

type CoreFixtures = ReturnType<typeof coreFixtures>

/**
 * The invitation of Acme that waits for Sam, and Acme as Sam joins it: as a
 * member, beside the people of Acme.
 */
function acmeInvitation(
  core: CoreFixtures,
  options: DevOptions,
): DevWaitlist['invitations'][number] {
  const summary: OrgSummary = {
    ...(core.orgs.orgs.find((org) => org.id === FAKE_IDS.org) ??
      core.orgs.orgs[0]),
    role: 'member',
  }
  const org = acme(summary, core, options)
  org.members = {
    ...org.members,
    members: [
      ...org.members.members,
      { user: waitingUser, role: 'member', joinedAt: FAKE_TIME },
    ],
  }
  return {
    invite: {
      id: 'invite-acme',
      email: waitingEmail,
      createdAt: FAKE_TIME - 3_600_000,
      orgId: summary.id,
      orgName: summary.name,
    },
    org,
  }
}

/**
 * The state when the app opens. Get started is done before `firstRun`, and
 * not done from it on. The other recorded orgs start as new orgs, because
 * the recorded server has no replies for them. With `waiting`, the user is
 * Sam, who waits for app access.
 */
export function seedState(options: DevOptions): DevState {
  const core = coreFixtures(options.server.role)
  const waits = options.waiting !== null
  const user = waits ? waitingUser : core.account.user
  const { firstRun } = options
  const noOrg = firstRun === 'github-app' || firstRun === 'org'
  const noLogin = options.noAgentLogin || firstRun !== null
  const done =
    firstRun === null
      ? getStartedOrder.length
      : getStartedOrder.indexOf(firstRun)
  const orgs = core.orgs.orgs.map((org) =>
    org.id === FAKE_IDS.org
      ? acme(org, core, options)
      : freshOrg(org, user, FAKE_TIME),
  )
  return {
    orgLogins: new Map([[FAKE_IDS.org, seededOrgLogins(options.orgLogin)]]),
    account: {
      ...core.account,
      user,
      operator: options.operator,
      agentLogins: noLogin
        ? AGENTS.map((agent): AgentLoginStatus => ({ agent, connected: false }))
        : options.endpointLogins
          ? devEndpointLogins(options.modelList)
          : core.account.agentLogins,
    },
    getStarted: {
      orgId: noOrg ? null : FAKE_IDS.org,
      steps: getStartedOrder.map((step, index) => ({
        step,
        complete: index < done,
      })),
    },
    orgs: noOrg ? [] : orgs,
    githubAppInstalled: firstRun !== 'github-app',
    attachments: new Map(),
    stopAfterMs: options.stopAfterMs,
    operator: operatorRecords(options, user),
    shareSaveFails: options.shareSaveFails,
    skillsSaveFails: options.skillsSaveFails,
    providers: seedProviders(options),
    switches: seedSwitches(options),
    waitlist: {
      appAccess: !waits,
      approvalEmail:
        waits && options.waiting === 'verified' ? waitingEmail : null,
      invitations:
        waits && options.invited ? [acmeInvitation(core, options)] : [],
    },
  }
}
