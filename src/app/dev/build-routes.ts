import {
  buildPath,
  orgSettingsPaths,
  type BuildLogEvent,
  type BuildResponse,
  type BuildsResponse,
  type ImageBuild,
} from '../../shared/org-settings'
import { requireOrg, type DevBackend } from './backend'
import { ID, json, RouteError, type Params, type Route } from './router'
import { uniqueId, type OrgState } from './state'

/** A build adds one log line at each tick, and it ends at the fourth tick. */
const TICK_MS = 1_500
const LAST_TICK = 4
const SUCCESS = 'The cloud computer is ready.'
const FAILURE = 'The install script stopped with exit code 1.'

function requireBuild(org: OrgState, buildId: string): BuildResponse {
  const build = org.builds.find((item) => item.build.id === buildId)
  if (!build) {
    throw new RouteError(404, 'build_not_found', 'The build is not available.')
  }
  return build
}

/** The commands of an install script, up to an `exit 1` that stops it. */
function commands(script: string): string[] {
  const lines = script
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
  const stop = lines.findIndex((line) => line.includes('exit 1'))
  return stop === -1 ? lines : lines.slice(0, stop + 1)
}

function withLines(
  build: BuildResponse,
  lines: readonly string[],
  at: number,
): BuildResponse {
  const added = lines.map((line, index): BuildLogEvent => ({
    eventNumber: build.log.length + index + 1,
    occurredAt: at,
    text: `${line}\n`,
  }))
  return { ...build, log: [...build.log, ...added] }
}

function putBuild(org: OrgState, build: BuildResponse): void {
  org.builds = org.builds.map((item) =>
    item.build.id === build.build.id ? build : item,
  )
}

/** What a build does: the script that it runs, its log, and its result. */
interface BuildPlan {
  id: string
  script: string
  fails: boolean
  /** The log lines after the first one. */
  lines: readonly string[]
}

/** The end of a build: the rest of its log and its result. */
function endBuild(
  backend: DevBackend,
  org: OrgState,
  plan: BuildPlan,
  shown: number,
): void {
  const build = org.builds.find((item) => item.build.id === plan.id)
  if (!build) return
  const at = backend.now()
  const rest = [...plan.lines.slice(shown), plan.fails ? FAILURE : SUCCESS]
  putBuild(org, {
    ...withLines(build, rest, at),
    build: {
      ...build.build,
      state: plan.fails ? 'failed' : 'succeeded',
      completedAt: at,
      durationMs: at - build.build.startedAt,
      error: plan.fails ? FAILURE : null,
    },
  })
  if (plan.fails) return
  org.currentImageBuildId = plan.id
  // A script that changed while the build ran still needs a build.
  org.settings = {
    ...org.settings,
    needsBuild: org.settings.installScript !== plan.script,
  }
}

/** Adds one log line at each tick, and ends the build at the last tick. */
function runBuild(
  backend: DevBackend,
  org: OrgState,
  plan: BuildPlan,
  tick = 1,
): void {
  setTimeout(() => {
    if (tick === LAST_TICK) {
      endBuild(backend, org, plan, tick - 1)
      return
    }
    const build = org.builds.find((item) => item.build.id === plan.id)
    if (!build) return
    const line = plan.lines.slice(tick - 1, tick)
    putBuild(org, withLines(build, line, backend.now()))
    runBuild(backend, org, plan, tick + 1)
  }, TICK_MS)
}

/**
 * Build computer. The build adds a log line about every 1.5 s and ends
 * after about 6 s. It fails when the install script contains `exit 1`. A
 * good build becomes the image of new workspaces. While a build runs, a
 * second start gets the build that runs.
 */
function startBuild(backend: DevBackend, org: OrgState): BuildResponse {
  const busy = org.builds.find((item) => item.build.state === 'running')
  if (busy) return busy
  const script = org.settings.installScript
  const plan: BuildPlan = {
    id: uniqueId(
      `build-${org.builds.length + 1}`,
      org.builds.map((item) => item.build.id),
    ),
    script,
    fails: script.includes('exit 1'),
    lines: [
      'Running the install script',
      ...commands(script).map((command) => `$ ${command}`),
    ],
  }
  const chosen = org.repositories.filter((item) => item.selected).length
  const repositories = chosen === 1 ? '1 repository' : `${chosen} repositories`
  const startedAt = backend.now()
  const image: ImageBuild = {
    id: plan.id,
    orgId: org.org.id,
    kind: 'build',
    state: 'running',
    startedAt,
    completedAt: null,
    durationMs: null,
    error: null,
  }
  const build = withLines(
    { build: image, log: [] },
    [`Cloning ${repositories} into ~/code`],
    startedAt,
  )
  org.builds = [build, ...org.builds]
  runBuild(backend, org, plan)
  return build
}

/** The builds of the cloud computer, each build, and its log. */
export function buildRoutes(backend: DevBackend): Route[] {
  const orgOf = (params: Params) => requireOrg(backend.state, params.org)
  return [
    {
      method: 'GET',
      path: orgSettingsPaths.builds(ID.org),
      answer: ({ params }) => {
        const org = orgOf(params)
        return json({
          builds: org.builds.map((item) => item.build),
          currentImageBuildId: org.currentImageBuildId,
        } satisfies BuildsResponse)
      },
    },
    {
      method: 'POST',
      path: orgSettingsPaths.builds(ID.org),
      answer: ({ params }) =>
        json(startBuild(backend, orgOf(params)) satisfies BuildResponse, 202),
    },
    {
      method: 'GET',
      path: buildPath(ID.org, ID.build),
      answer: ({ params }) =>
        json(requireBuild(orgOf(params), params.build) satisfies BuildResponse),
    },
  ]
}
