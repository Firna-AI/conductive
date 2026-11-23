import type {
  JobWait,
  LastSwitch,
  OrgSwitch,
  SwitchBuild,
  SwitchFailure,
  SwitchWait,
} from '../../ui/components/operator/switchCopy'
import { formatDuration, formatElapsed, whenOf } from '../../app/time'
import type { OperatorOrgDetail } from '../../shared/operator'
import type {
  OperatorProviderSwitch,
  OperatorSwitchFailure,
  OperatorSwitchJob,
  OperatorSwitchWaitReason,
} from '../../shared/operator-switch'
import { formatMoment } from './format'

/** The clock and the time zone that the words of a page use. */
export type Clock = { now: number; timeZone?: string }

/** When a job started, as words inside a sentence: "6 minutes ago", "on 3 Nov". */
function sinceWords(time: number, clock: Clock): string {
  const when = whenOf(clock.now, time, clock.timeZone)
  return when.kind === 'relative' ? when.text : `on ${when.text}`
}

/** A build or a refresh that runs, as the words of a wait name it. */
function jobWait(job: OperatorSwitchJob, clock: Clock): JobWait {
  const since = sinceWords(job.startedAt, clock)
  return job.kind === 'refresh'
    ? { kind: 'refresh', since }
    : { kind: 'build', by: job.starter?.login ?? null, since }
}

/** A wait of the org that names no job: Lift, Restore, or an admin. */
function stateWait(
  reason: Exclude<OperatorSwitchWaitReason, 'job'>,
): SwitchWait {
  switch (reason) {
    case 'suspended':
      return { kind: 'lift' }
    case 'deleted':
      return { kind: 'restore' }
    case 'admin':
      return { kind: 'admin' }
  }
}

/**
 * Why the build of a new switch would wait now, for the question before a
 * switch, or undefined when it would start at once. A job that runs gets
 * the offer to end it.
 */
export function newSwitchWait(
  org: OperatorOrgDetail,
  clock: Clock,
): SwitchWait | undefined {
  const reason = org.switchWaitReason ?? null
  if (reason === null) return undefined
  if (reason !== 'job') return stateWait(reason)
  return org.runningJob ? jobWait(org.runningJob, clock) : undefined
}

/**
 * Why the switch build of a waiting switch waits, from its record. A wait
 * for a job whose record the reply lost names the job that runs now. A
 * switch with no reason starts on its own.
 */
function recordWait(
  item: OperatorProviderSwitch,
  org: OperatorOrgDetail,
  clock: Clock,
): SwitchWait {
  const reason = item.waitReason
  if (reason === null) return { kind: 'start' }
  if (reason !== 'job') return stateWait(reason)
  const job = item.waitingJob ?? org.runningJob ?? null
  return job ? jobWait(job, clock) : { kind: 'start' }
}

/**
 * The cause of a failed switch build in the words for the operator. The
 * Worker saves `script` for a failure of no other cause, so a record
 * without a cause reads the same.
 */
function failureOf(failure: OperatorSwitchFailure | null): SwitchFailure {
  switch (failure) {
    case 'provider':
      return 'account'
    case 'time-limit':
      return 'time-limit'
    case 'script':
    case null:
      return 'script'
  }
}

/** The state of the switch build, or null for a switch that ended. */
function buildOf(
  item: OperatorProviderSwitch,
  org: OperatorOrgDetail,
  clock: Clock,
): SwitchBuild | null {
  const started = item.buildStartedAt ?? item.requestedAt
  switch (item.state) {
    case 'waiting':
      return { state: 'waiting', wait: recordWait(item, org, clock) }
    case 'building':
      return { state: 'building', elapsed: formatElapsed(clock.now - started) }
    case 'failed':
      return {
        state: 'failed',
        duration: formatDuration(
          (item.buildCompletedAt ?? clock.now) - started,
        ),
        failure: failureOf(item.failure),
      }
    case 'stopped':
    case 'completed':
      return null
  }
}

/**
 * The switch that the Provider account box gives: one that waits, builds,
 * or failed, with its new account, its start, and its operator. A stopped
 * or a completed switch is no switch of the box.
 */
export function orgSwitchOf(
  org: OperatorOrgDetail,
  clock: Clock,
): OrgSwitch | undefined {
  const item = org.providerSwitch
  if (!item) return undefined
  const build = buildOf(item, org, clock)
  if (!build) return undefined
  return {
    to: item.toAccount,
    when: formatMoment(item.requestedAt, clock.now, clock.timeZone),
    by: item.operator?.login ?? null,
    build,
  }
}

/**
 * The last switch that changed the account of the org: the old account,
 * when the account changed, and the operator. A record without that time
 * gives no line.
 */
export function lastSwitchOf(
  org: OperatorOrgDetail,
  clock: Clock,
): LastSwitch | undefined {
  const item = org.lastProviderSwitch
  if (!item || item.accountChangedAt === null) return undefined
  return {
    from: item.fromAccount,
    when: formatMoment(item.accountChangedAt, clock.now, clock.timeZone),
    by: item.operator?.login ?? null,
  }
}

/** Whether a switch waits or builds, so that Stop switch takes its place. */
export function switchRuns(item: OrgSwitch | undefined): boolean {
  const state = item?.build.state
  return state === 'waiting' || state === 'building'
}

/** The configured accounts that the org can switch to, in their order. */
export function switchTargets(
  accounts: readonly string[],
  current: string,
): readonly string[] {
  return accounts.filter((id) => id !== current)
}
