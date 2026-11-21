import type {
  OperatorOrgSwitchDetail,
  OperatorProviderSwitch,
  OperatorSwitchActor,
  OperatorSwitchFailure,
  OperatorSwitchJob,
  OperatorSwitchState,
  OperatorSwitchWaitReason,
} from '../../shared/operator-switch'
import {
  choice,
  count,
  flag,
  items,
  maybeCount,
  maybeNested,
  maybeText,
  nested,
  record,
  text,
  type JsonObject,
} from './parse'

const SWITCH_STATES: readonly OperatorSwitchState[] = [
  'waiting',
  'building',
  'failed',
  'stopped',
  'completed',
]

const WAIT_REASONS: readonly OperatorSwitchWaitReason[] = [
  'job',
  'suspended',
  'deleted',
  'admin',
]

const FAILURES: readonly OperatorSwitchFailure[] = [
  'provider',
  'script',
  'time-limit',
]

const JOB_KINDS: readonly OperatorSwitchJob['kind'][] = ['build', 'refresh']

function readActor(value: unknown): OperatorSwitchActor {
  const actor = record(value, 'actor')
  return { githubId: count(actor, 'githubId'), login: text(actor, 'login') }
}

/** A build or a refresh of the org image, with its start and its starter. */
function readJob(value: unknown): OperatorSwitchJob {
  const job = record(value, 'job')
  return {
    id: text(job, 'id'),
    kind: choice(job, 'kind', JOB_KINDS),
    startedAt: count(job, 'startedAt'),
    starter: maybeNested(job, 'starter', readActor),
  }
}

/** The value of `key` when it is one of `options`, or null for none. */
function maybeChoice<T extends string>(
  object: JsonObject,
  key: string,
  options: readonly T[],
): T | null {
  return object[key] === null || object[key] === undefined
    ? null
    : choice(object, key, options)
}

/** The record of one switch of the provider account of an org. */
function readProviderSwitch(value: unknown): OperatorProviderSwitch {
  const item = record(value, 'switch')
  return {
    id: text(item, 'id'),
    orgId: text(item, 'orgId'),
    fromAccount: text(item, 'fromAccount'),
    toAccount: text(item, 'toAccount'),
    requestedAt: count(item, 'requestedAt'),
    operator: maybeNested(item, 'operator', readActor),
    endRunningJob: flag(item, 'endRunningJob'),
    endRunningJobId: maybeText(item, 'endRunningJobId'),
    state: choice(item, 'state', SWITCH_STATES),
    waitReason: maybeChoice(item, 'waitReason', WAIT_REASONS),
    waitingJob: maybeNested(item, 'waitingJob', readJob),
    buildId: maybeText(item, 'buildId'),
    buildStartedAt: maybeCount(item, 'buildStartedAt'),
    buildCompletedAt: maybeCount(item, 'buildCompletedAt'),
    failure: maybeChoice(item, 'failure', FAILURES),
    accountChangedAt: maybeCount(item, 'accountChangedAt'),
    stoppedAt: maybeCount(item, 'stoppedAt'),
    stoppedBy: maybeNested(item, 'stoppedBy', readActor),
  }
}

/**
 * The switch fields of the page of an org: the switch that waits, builds,
 * or failed, the last switch that changed the account, the job that runs,
 * why a new switch build would wait, and the workspaces on each account.
 * An older reply has none of them, so each field that the reply leaves out
 * stays out, and the page offers no switch.
 */
export function readOrgSwitchDetail(
  org: JsonObject,
): Partial<OperatorOrgSwitchDetail> {
  const detail: Partial<OperatorOrgSwitchDetail> = {}
  if (org.switchAvailable !== undefined) {
    detail.switchAvailable = flag(org, 'switchAvailable')
  }
  if (org.providerSwitch !== undefined) {
    detail.providerSwitch = maybeNested(
      org,
      'providerSwitch',
      readProviderSwitch,
    )
  }
  if (org.lastProviderSwitch !== undefined) {
    detail.lastProviderSwitch = maybeNested(
      org,
      'lastProviderSwitch',
      readProviderSwitch,
    )
  }
  if (org.runningJob !== undefined) {
    detail.runningJob = maybeNested(org, 'runningJob', readJob)
  }
  if (org.switchWaitReason !== undefined) {
    detail.switchWaitReason = maybeChoice(org, 'switchWaitReason', WAIT_REASONS)
  }
  if (org.workspacesByAccount !== undefined) {
    detail.workspacesByAccount = items(org, 'workspacesByAccount', (row) => {
      const account = record(row, 'account')
      return {
        id: text(account, 'id'),
        workspaces: count(account, 'workspaces'),
      }
    })
  }
  return detail
}

/**
 * The reply of Switch account or Stop switch: the saved switch, or null
 * when no switch was open. The page reads the org again after it, so it
 * keeps nothing of the reply.
 */
export function readSwitchReply(value: unknown): void {
  nested(record(value, 'switch reply'), 'switch', (item) =>
    item === null ? null : readProviderSwitch(item),
  )
}
