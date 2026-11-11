import type { BuildState, OrgBuilds } from '../components/settings/BuildSection'
import type { JobKind } from '../components/settings/buildCopy'
import {
  buildHistory,
  failedBuild,
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

/** The jobs of Acme when its newest job is a build. */
function builds(image: SoftwareImage): OrgBuilds {
  return {
    lastGood: lastBuild,
    history: buildHistory,
    logs: {
      building: image === 'ready' ? buildLog : fallbackBuildLog,
      failed: failedBuildLog,
      'time-limit': timedOutBuildLog,
    },
    failed: { failed: failedBuild, 'time-limit': timedOutBuild },
    running: { kind: 'build', elapsed: runningBuild.elapsed },
  }
}

/** The refresh that ended as the newest job in a state, if one did. */
function endedRefresh(kind: RefreshKind, build: BuildState): Build | undefined {
  switch (build) {
    case 'ready':
      return goodRefresh(kind)
    case 'failed':
      return failedRefresh(kind)
    case 'time-limit':
      return timedOutRefresh(kind)
    case 'building':
    case 'none':
      return undefined
  }
}

/**
 * The jobs of Acme when its newest job is a refresh of the kind, after the
 * last build. A refresh that succeeded is the job that new workspaces start
 * from. While a refresh runs, and after it failed, they start from the last
 * build.
 */
function refreshes(
  kind: RefreshKind,
  build: BuildState,
  image: SoftwareImage,
): OrgBuilds {
  const ended = endedRefresh(kind, build)
  return {
    lastGood: build === 'ready' ? ended : lastBuild,
    history: ended ? [ended, ...buildHistory] : buildHistory,
    logs: {
      building: image === 'ready' ? refreshLog : fallbackRefreshLog,
      failed: failedRefreshLog,
      'time-limit': timedOutBuildLog,
    },
    failed: {
      failed: failedRefresh(kind),
      'time-limit': timedOutRefresh(kind),
    },
    running: { kind, elapsed: runningRefresh.elapsed },
  }
}

/**
 * The jobs of Acme whose newest job has the kind, in the state, with or
 * without a ready software image.
 */
export function acmeJobs(
  job: JobKind,
  build: BuildState,
  image: SoftwareImage,
): OrgBuilds {
  return job === 'build' ? builds(image) : refreshes(job, build, image)
}
