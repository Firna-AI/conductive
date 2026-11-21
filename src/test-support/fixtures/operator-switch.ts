import type { OperatorOrgDetail } from '../../shared/operator'
import type {
  OperatorOrgSwitchDetail,
  OperatorProviderSwitch,
  OperatorSwitchJob,
  OperatorSwitchWaitReason,
} from '../../shared/operator-switch'
import { fakeUser } from './core'

const MINUTE = 60_000

/** The page of a sample org, which its switch fields follow. */
type SwitchSource = Omit<OperatorOrgDetail, keyof OperatorOrgSwitchDetail>

/**
 * The build of a sample org that runs, which its first admin who is not
 * suspended started 6 minutes before `now`.
 */
function runningBuild(
  org: SwitchSource,
  now: number,
): OperatorSwitchJob | null {
  if (org.running.builds === 0) return null
  const admin = org.members.find(
    (member) => member.role === 'admin' && !member.suspended,
  )
  return {
    id: `${org.id}-build-1`,
    kind: 'build',
    startedAt: now - 6 * MINUTE,
    starter: admin ? { githubId: admin.githubId, login: admin.login } : null,
  }
}

/**
 * Why the build of a new switch would wait, in the order of the Worker: a
 * job that runs, the deletion, the suspension, then no active admin.
 */
function waitOf(
  org: SwitchSource,
  job: OperatorSwitchJob | null,
): OperatorSwitchWaitReason | null {
  if (job) return 'job'
  if (org.deletion) return 'deleted'
  if (org.suspension) return 'suspended'
  const admin = org.members.some(
    (member) => member.role === 'admin' && !member.suspended,
  )
  return admin ? null : 'admin'
}

/**
 * The page of a sample org with the switch fields of the Worker: no
 * switch, the build that runs, why a new switch build would wait, and
 * every workspace on the account of the org, Removed included.
 */
export function withSampleSwitch(
  org: SwitchSource,
  now: number,
): OperatorOrgDetail {
  return { ...org, ...sampleSwitchDetail(org, now) }
}

function sampleSwitchDetail(
  org: SwitchSource,
  now: number,
): OperatorOrgSwitchDetail {
  const { running, stopped, failed, archived } = org.workspaceStates
  const workspaces = running + stopped + failed + archived
  const job = runningBuild(org, now)
  return {
    switchAvailable: true,
    providerSwitch: null,
    lastProviderSwitch: null,
    runningJob: job,
    switchWaitReason: waitOf(org, job),
    workspacesByAccount:
      workspaces === 0 ? [] : [{ id: org.providerAccount, workspaces }],
  }
}

/**
 * A switch of a sample org from `boat` to `e2b` by the operator of the
 * samples, the person signed in, which `change` puts in the state of a test.
 */
export function sampleSwitch(
  orgId: string,
  requestedAt: number,
  change: Partial<OperatorProviderSwitch> = {},
): OperatorProviderSwitch {
  return {
    id: `${orgId}-switch-1`,
    orgId,
    fromAccount: 'boat',
    toAccount: 'e2b',
    requestedAt,
    operator: { githubId: fakeUser.githubId, login: fakeUser.githubLogin },
    endRunningJob: false,
    endRunningJobId: null,
    state: 'waiting',
    waitReason: null,
    waitingJob: null,
    buildId: null,
    buildStartedAt: null,
    buildCompletedAt: null,
    failure: null,
    accountChangedAt: null,
    stoppedAt: null,
    stoppedBy: null,
    ...change,
  }
}
