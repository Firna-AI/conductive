import type { BuildsResponse, ImageBuild } from '../shared/org-settings'

/** The build that new workspaces start from, the newest good build. */
export function currentBuild(builds: BuildsResponse): ImageBuild | undefined {
  return (
    builds.builds.find((build) => build.id === builds.currentImageBuildId) ??
    builds.builds.find((build) => build.state === 'succeeded')
  )
}
