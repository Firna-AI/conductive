import {
  isFailed,
  type BuildState,
  type OrgBuilds,
} from '../components/settings/BuildSection'
import {
  buildHistory,
  failedBuild,
  failedBuildBeforeRefresh,
  failedRefresh,
  goodRefresh,
  lastBuild,
  runningBuild,
  runningRefresh,
  timedOutBuild,
  timedOutRefresh,
  type Build,
  type RefreshKind,
} from '../fixtures/computer'
import {
  buildLog,
  failedBuildLog,
  failedRefreshLog,
  fallbackBuildLog,
  fallbackRefreshLog,
  refreshLog,
  timedOutBuildLog,
} from '../fixtures/terminal'
import type { OrgSettingsState } from './OrgSettingsScreen'

/**
 * Whether the software image of the current app version is ready. A job
 * without it installs the agent and terminal software after the clones.
 */
type SoftwareImage = OrgSettingsState['softwareImage']

/** The parts of the settings state that choose the jobs of Acme. */
type JobState = Pick<
  OrgSettingsState,
  'job' | 'build' | 'newestBuild' | 'softwareImage'
>

/** The failed job of the card in each failed state, with its saved message. */
type FailedJobs = OrgBuilds['failed']

/** The failed job of the card in the state, when the newest job failed. */
function failedJob(build: BuildState, failed: FailedJobs): Build | undefined {
  return isFailed(build) ? failed[build] : undefined
}

/**
 * The jobs that ended, newest first: the newest job when it ended, then
 * the earlier jobs. Builds and refreshes both use it, so a newest job that
 * failed tops the history, and the history lists the job of the head.
 */
function historyOf(
  newest: Build | undefined,
  earlier: readonly Build[],
): readonly Build[] {
  return newest ? [newest, ...earlier] : earlier
}

/**
 * The jobs of Acme when its newest job is a build. A failed newest build
 * tops the history. A good one is the last good build, which the history
 * already lists first.
 */
function builds(build: BuildState, image: SoftwareImage): OrgBuilds {
  const failed = { failed: failedBuild, 'time-limit': timedOutBuild }
  return {
    lastGood: lastBuild,
    history: historyOf(failedJob(build, failed), buildHistory),
    logs: {
      building: image === 'ready' ? buildLog : fallbackBuildLog,
      failed: failedBuildLog,
      'time-limit': timedOutBuildLog,
    },
    failed,
    running: { kind: 'build', elapsed: runningBuild.elapsed },
  }
}

/**
 * The jobs of Acme that ended before its newest refresh, newest first: the
 * newest build, when it failed after the last good build, then the earlier
 * jobs.
 */
function earlierJobs(
  newestBuild: OrgSettingsState['newestBuild'],
): readonly Build[] {
  return newestBuild === 'failed'
    ? [failedBuildBeforeRefresh, ...buildHistory]
    : buildHistory
}

/**
 * The jobs of Acme when its newest job is a refresh of the kind, after the
 * jobs that ended before it. A refresh that succeeded is the job that new
 * workspaces start from. While a refresh runs, and after it failed, they
 * start from the last build.
 */
function refreshes(
  kind: RefreshKind,
  build: BuildState,
  image: SoftwareImage,
  earlier: readonly Build[],
): OrgBuilds {
  const failed = {
    failed: failedRefresh(kind),
    'time-limit': timedOutRefresh(kind),
  }
  const good = build === 'ready' ? goodRefresh(kind) : undefined
  return {
    lastGood: good ?? lastBuild,
    history: historyOf(good ?? failedJob(build, failed), earlier),
    logs: {
      building: image === 'ready' ? refreshLog : fallbackRefreshLog,
      failed: failedRefreshLog,
      'time-limit': timedOutBuildLog,
    },
    failed,
    running: { kind, elapsed: runningRefresh.elapsed },
  }
}

/**
 * Whether a good refresh followed a build that failed, which no newer
 * build replaced. A good refresh never hides that build: the head of the
 * card keeps it, with its log and Try again. A refresh runs the install
 * script and the repositories of the newest good build, so it does not
 * prove that the failed build works.
 */
function keepsFailedBuild(state: JobState): boolean {
  return (
    state.job !== 'build' &&
    state.build === 'ready' &&
    state.newestBuild === 'failed'
  )
}

/**
 * The jobs of Acme whose newest job has the kind, in the state, with or
 * without a ready software image. After a good refresh that keeps a failed
 * build, the failed job of the card is that build, with its log, and new
 * workspaces start from the refresh.
 */
export function acmeJobs(state: JobState): OrgBuilds {
  const { job, build, newestBuild, softwareImage } = state
  if (job === 'build') return builds(build, softwareImage)
  const jobs = refreshes(job, build, softwareImage, earlierJobs(newestBuild))
  if (!keepsFailedBuild(state)) return jobs
  return {
    ...jobs,
    logs: { ...jobs.logs, failed: failedBuildLog },
    failed: { ...jobs.failed, failed: failedBuildBeforeRefresh },
  }
}

/**
 * The state of the job on the head of the card of Acme: the state of its
 * newest job, or `failed` when a good refresh keeps a failed build.
 */
export function acmeHead(state: JobState): BuildState {
  return keepsFailedBuild(state) ? 'failed' : state.build
}

/**
 * Whether the Settings link of the sidebar shows its dot for Acme: the
 * newest job failed, or the newest build failed and no newer build
 * replaced it. A refresh never clears the mark of a failed build, so the
 * dot stays while a refresh runs after it, and after a good refresh. A
 * build that runs after a failed build shows no dot. The dot does not read
 * the head of the card.
 */
export function acmeSettingsAlert(state: JobState): boolean {
  const buildStillFailed =
    state.job !== 'build' && state.newestBuild === 'failed'
  return isFailed(state.build) || buildStillFailed
}
