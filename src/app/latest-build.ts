import type { BuildsResponse, ImageBuild } from '../shared/org-settings'

/**
 * The newest run of the install script, which the Cloud computer tab shows
 * first. A refresh only fetches commits, so it does not count.
 */
export function latestBuild(builds: BuildsResponse): ImageBuild | undefined {
  return builds.builds
    .filter((build) => build.kind === 'build')
    .sort((a, b) => b.startedAt - a.startedAt)[0]
}

/**
 * The refresh that runs while no build runs, or none. Build computer
 * during it saves a request, and the build starts when the refresh ends.
 */
export function runningRefresh(builds: BuildsResponse): ImageBuild | undefined {
  if (latestBuild(builds)?.state === 'running') return undefined
  return builds.builds.find(
    (build) => build.kind === 'refresh' && build.state === 'running',
  )
}
