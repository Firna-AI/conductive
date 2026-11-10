import {
  buildPath,
  orgSettingsPaths,
  type BuildResponse,
  type BuildsResponse,
  type ImageBuild,
  type OrgSettingsResponse,
} from '../../shared/org-settings'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../../test-support/fixtures/core'

/**
 * The state of the cloud computer that the dev page draws. `live` gives the
 * controlled view a running build that the dev page changes in place.
 */
export const computerScenes = [
  'history',
  'running',
  'failed',
  'changed',
  'live',
] as const
export type ComputerScene = (typeof computerScenes)[number]

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function finished(
  id: string,
  ago: number,
  seconds: number,
  state: 'succeeded' | 'failed',
): ImageBuild {
  const completedAt = FAKE_TIME - ago
  return {
    id,
    orgId: FAKE_IDS.org,
    kind: 'build',
    state,
    startedAt: completedAt - seconds * 1000,
    completedAt,
    durationMs: seconds * 1000,
    error:
      state === 'failed'
        ? 'The install script stopped with exit code 1.'
        : null,
  }
}

/** Five builds, newest first, at the ages that the mockup draws. */
const history: readonly ImageBuild[] = [
  finished('build-5', 8 * HOUR, 401, 'succeeded'),
  finished('build-4', 26 * HOUR, 362, 'succeeded'),
  finished('build-3', 12 * DAY, 138, 'failed'),
  finished('build-2', 12 * DAY + 2 * HOUR, 357, 'succeeded'),
  finished('build-1', 18 * DAY, 433, 'succeeded'),
]

const runningLog = [
  'Cloning 3 repositories into ~/code',
  ' ✓ acme/storefront at 4f2c9a1',
  ' ✓ acme/billing-service at b81d0e4',
  ' ✓ acme/marketing-site at 07ac5f2',
  'Running the install script',
  'build $ sudo apt-get install -y postgresql-client-16 redis-server',
  'Setting up redis-server (5:7.0.15-1build2) ...',
  'build $ cd ~/code/storefront && npm ci && npx prisma generate',
  'added 1184 packages in 41s',
]

const failedLog = [
  'Running the install script',
  'build $ cd ~/code/storefront && npm ci && npx prisma generate',
  'npm error code ERESOLVE',
  'npm error ERESOLVE unable to resolve dependency tree',
  'npm error peer react@"^18.0.0" from react-day-picker@8.10.1',
  'The install script stopped with exit code 1.',
]

function withLog(build: ImageBuild, lines: readonly string[]): BuildResponse {
  return {
    build,
    log: lines.map((text, index) => ({
      eventNumber: index + 1,
      occurredAt: build.startedAt + index * 1000,
      text: `${text}\n`,
    })),
  }
}

const runningBuild: ImageBuild = {
  ...finished('build-6', 0, 134, 'succeeded'),
  state: 'running',
  completedAt: null,
  durationMs: null,
}

function newestBuild(scene: ComputerScene): BuildResponse | null {
  if (scene === 'running') return withLog(runningBuild, runningLog)
  if (scene === 'failed') {
    return withLog(finished('build-6', 12 * MINUTE, 138, 'failed'), failedLog)
  }
  return null
}

/** The replies that draw the scene, for the routes of an org's cloud computer. */
export function computerReplies(
  scene: ComputerScene,
  org: string,
): { path: string; body: unknown }[] {
  const newest = newestBuild(scene)
  const builds: BuildsResponse = {
    builds: newest ? [newest.build, ...history] : history,
    currentImageBuildId: 'build-5',
    changes: {
      installScript: scene === 'changed',
      addedRepositories: [],
      removedRepositories: [],
    },
  }
  const replies: { path: string; body: unknown }[] = [
    { path: orgSettingsPaths.builds(org), body: builds },
  ]
  if (newest) {
    replies.push({ path: buildPath(org, newest.build.id), body: newest })
  }
  if (scene === 'changed') {
    const { settings } = coreFixtures().settings
    const body: OrgSettingsResponse = {
      settings: { ...settings, needsBuild: true },
    }
    replies.push({ path: orgSettingsPaths.settings(org), body })
  }
  return replies
}

/** The data of the live scene, which the dev page gives the controlled view. */
export type LiveComputer = {
  settings: OrgSettingsResponse['settings']
  builds: BuildsResponse
  log: BuildResponse['log']
}

/** A running build with the first three lines of its log. */
export function liveComputer(): LiveComputer {
  return {
    settings: coreFixtures().settings.settings,
    builds: {
      builds: [runningBuild, ...history],
      currentImageBuildId: 'build-5',
      changes: {
        installScript: false,
        addedRepositories: [],
        removedRepositories: [],
      },
    },
    log: withLog(runningBuild, runningLog.slice(0, 3)).log,
  }
}

/** The live scene with the next line of the running build's log. */
export function withNextLogLine(live: LiveComputer): LiveComputer {
  const next = withLog(runningBuild, runningLog).log.at(live.log.length)
  return next ? { ...live, log: [...live.log, next] } : live
}

/** The live scene after the running build succeeded. */
export function withFinishedBuild(live: LiveComputer): LiveComputer {
  const done: ImageBuild = {
    ...runningBuild,
    state: 'succeeded',
    completedAt: FAKE_TIME,
    durationMs: FAKE_TIME - runningBuild.startedAt,
  }
  return {
    ...live,
    builds: {
      builds: [done, ...history],
      currentImageBuildId: done.id,
      changes: {
        installScript: false,
        addedRepositories: [],
        removedRepositories: [],
      },
    },
  }
}
