import { useEffect } from 'react'
import type { BuildsResponse, ImageBuild } from '../shared/org-settings'
import { currentBuild, latestBuild, type OrgModel } from './org-model'
import { ready, useStore, type Loadable } from './store'

/**
 * The first build of an org, as Get started and New workspace show it.
 * Create org starts it. Until a build succeeds, the org has no image that
 * a workspace can start from, and the newest build says why: it runs, it
 * failed, or none runs, such as after a start that failed. Once a build
 * succeeded, a later build or a failed later build changes nothing,
 * because new workspaces start from the last good image.
 */
export type FirstBuild =
  | { state: 'succeeded' }
  | { state: 'running'; build: ImageBuild }
  | { state: 'failed'; build: ImageBuild }
  | { state: 'none' }

/** The state of the first build of an org, from its builds. */
export function firstBuildOf(builds: BuildsResponse): FirstBuild {
  if (currentBuild(builds)) return { state: 'succeeded' }
  const newest = latestBuild(builds)
  if (!newest) return { state: 'none' }
  switch (newest.state) {
    case 'running':
      return { state: 'running', build: newest }
    case 'failed':
      return { state: 'failed', build: newest }
    case 'succeeded':
      return { state: 'succeeded' }
  }
}

/** The notice under an install script that changed after a build started. */
export interface ChangedScriptNotice {
  title: string
  body: string
  /**
   * Whether the notice of an admin offers Build computer: only once the org
   * has a good build. A member never gets the button.
   */
  offersBuild: boolean
}

/**
 * The words of the notice of a changed install script, which every viewer
 * of the Cloud computer tab reads, from the builds of the org. Until the
 * org has a good build, the notice asks for no build: while the first build
 * runs, one more build runs the script when that build succeeds, and else
 * the head of the builds offers the next build.
 */
export function changedScriptNotice(
  builds: BuildsResponse,
): ChangedScriptNotice {
  const title = 'The install script changed'
  switch (firstBuildOf(builds).state) {
    case 'succeeded':
      return {
        title,
        body: 'It runs at the next build. Workspaces keep the current build until then.',
        offersBuild: true,
      }
    case 'running':
      return {
        title,
        body: 'One more build runs it when this build succeeds.',
        offersBuild: false,
      }
    case 'failed':
    case 'none':
      return { title, body: 'It runs at the next build.', offersBuild: false }
  }
}

/**
 * The first build of an org while a screen shows it. The builds read as
 * `OrgModel.watch` says, and their load state passes through.
 */
export function useFirstBuild(org: OrgModel): Loadable<FirstBuild> {
  const builds = useStore(org.builds)
  useEffect(() => org.watch('builds'), [org])
  return builds.state === 'ready' ? ready(firstBuildOf(builds.value)) : builds
}
