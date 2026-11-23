/**
 * The switch of the provider account of Hexwave from boat to e2b, in each
 * state that the page of the org in the operator section draws. Cal, the
 * operator, started the switch. The shapes follow the org detail of the
 * operator route.
 */
import type { AccountWorkspaces } from '../components/operator/AccountSection'
import type {
  LastSwitch,
  SwitchBuild,
} from '../../../../src/ui/components/operator/switchCopy'
import type { OrgMember } from './operatorDirectory'
import type { OrgPage } from './operatorPages'
import {
  createAccounts,
  threeAccountProviders,
  type AccountId,
} from './operatorProviders'
import { account } from './orgs'

/**
 * The switch on the page: none, a switch that waits for a build of the
 * org, for Lift, or for an admin who is not suspended, its build on e2b, a
 * switch build that failed, or Hexwave after the switch.
 */
export const switchStates = [
  'none',
  'waits-for-build',
  'waits-for-lift',
  'waits-for-admin',
  'building',
  'failed',
  'switched',
] as const

export type SwitchKey = (typeof switchStates)[number]

/** The configured accounts: boat and e2b, or also e2b-us. */
export function configuredAccounts(
  accounts: 'two' | 'three',
): readonly AccountId[] {
  if (accounts === 'two') return createAccounts
  return threeAccountProviders.default.accounts.map((item) => item.id)
}

/** The build of Hexwave that its admin @vex-ops started, which runs now. */
const adminBuild = { by: 'vex-ops', since: '6 minutes ago' } as const

/** The new account, and when and by whom the switch started. */
const started = {
  to: 'e2b',
  when: '20 Nov at 14:12',
  by: account.login,
} as const

/** The build of the switch in each state of a switch that did not end. */
const switchBuilds: Readonly<
  Record<Exclude<SwitchKey, 'none' | 'switched'>, SwitchBuild>
> = {
  'waits-for-build': {
    state: 'waiting',
    wait: { kind: 'build', ...adminBuild },
  },
  'waits-for-lift': { state: 'waiting', wait: { kind: 'lift' } },
  'waits-for-admin': { state: 'waiting', wait: { kind: 'admin' } },
  building: { state: 'building', elapsed: '4m 12s' },
  failed: { state: 'failed', duration: '10m 04s', failure: 'account' },
}

/**
 * The switch of Hexwave changed its account at 14:19, when its build on
 * e2b succeeded, 7 minutes after it started.
 */
const lastSwitch: LastSwitch = {
  from: 'boat',
  when: '20 Nov at 14:19',
  by: account.login,
}

/** The 10 workspaces from before the switch stay on boat, and 2 start on e2b. */
const switchedWorkspaces: readonly AccountWorkspaces[] = [
  { id: 'boat', workspaces: 10 },
  { id: 'e2b', workspaces: 2 },
]

/** The members, with each admin suspended, so that no admin is active. */
function withoutActiveAdmin(
  members: readonly OrgMember[],
): readonly OrgMember[] {
  return members.map((member) =>
    member.role === 'Admin' ? { ...member, suspended: true } : member,
  )
}

/**
 * The page of an org in a state of the switch, with the build of its admin
 * that runs, or none. A switch that waits for a build has that build. The
 * builds that run now count the build of the admin and the switch build.
 */
export function withSwitch(
  page: OrgPage,
  key: SwitchKey,
  buildRuns: boolean,
): OrgPage {
  const running = buildRuns || key === 'waits-for-build'
  const counted: OrgPage = {
    ...page,
    runningBuild: running ? adminBuild : undefined,
    builds: (running ? 1 : 0) + (key === 'building' ? 1 : 0),
  }
  switch (key) {
    case 'none':
      return counted
    case 'switched':
      return {
        ...counted,
        account: 'e2b',
        states: { running: 4, stopped: 7, failed: 1, archived: 0, removed: 0 },
        lastSwitch,
        byAccount: switchedWorkspaces,
      }
    case 'waits-for-admin':
      return {
        ...counted,
        members: withoutActiveAdmin(page.members),
        switch: { ...started, build: switchBuilds[key] },
      }
    case 'waits-for-build':
    case 'waits-for-lift':
    case 'building':
    case 'failed':
      return { ...counted, switch: { ...started, build: switchBuilds[key] } }
  }
}
