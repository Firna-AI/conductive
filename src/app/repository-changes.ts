import type { RepositoryWait } from '../../docs/mockups/src/components/settings/repositoryChangeCopy'
import type { BuildsResponse } from '../shared/org-settings'
import { latestBuild } from './org-model'

/**
 * How the saved repository changes wait for the org image, from the builds
 * of the org. The first state that applies wins: the newest build failed,
 * so no build runs; a build runs while an added repository waits; else the
 * changes wait for a build, such as after a removal, during a refresh, or
 * after a start that failed. The newest build is the newest run of the
 * install script, so a refresh never counts as a build that runs.
 */
export function repositoryWaitOf(builds: BuildsResponse): RepositoryWait {
  const newest = latestBuild(builds)
  if (newest?.state === 'failed') return 'failed'
  const added = builds.changes.addedRepositories.length > 0
  return newest?.state === 'running' && added ? 'building' : 'waiting'
}

/**
 * The saved repository changes that the org image does not hold yet, by
 * full name, and how they wait.
 */
export interface RepositoryChanges {
  wait: RepositoryWait
  /** The chosen repositories that the org image does not hold yet. */
  added: readonly string[]
  /** The repositories that the org image holds and the org no longer chose. */
  removed: readonly string[]
}

/**
 * The changes that the repository notice of the Repositories and Cloud
 * computer tabs names, or `null` while the org image holds every saved
 * change of the repositories. The Worker lists no change while the org has
 * no image, so the notice shows only once the org has one, and the notices
 * of the first build cover the time before.
 */
export function repositoryChangesOf(
  builds: BuildsResponse,
): RepositoryChanges | null {
  const { addedRepositories, removedRepositories } = builds.changes
  if (addedRepositories.length === 0 && removedRepositories.length === 0) {
    return null
  }
  return {
    wait: repositoryWaitOf(builds),
    added: addedRepositories.map((item) => item.fullName),
    removed: removedRepositories.map((item) => item.fullName),
  }
}

/**
 * Whether a saved change waits for a build: a change of the install script
 * or of the repositories. The build history then stays closed.
 */
export function changeWaits(builds: BuildsResponse): boolean {
  const { changes } = builds
  return (
    changes.installScript ||
    changes.addedRepositories.length > 0 ||
    changes.removedRepositories.length > 0
  )
}

/** The chosen repositories that wait for a build, as New workspace shows them. */
export interface WaitingRepositories {
  /** The IDs of the chosen repositories that the org image does not hold yet. */
  ids: ReadonlySet<string>
  /** How they wait, which gives the note of each one and the notice. */
  wait: RepositoryWait
}

/**
 * The waiting repositories, from the builds of the org. While the builds
 * load, no repository waits.
 */
export function waitingRepositoriesOf(
  builds: BuildsResponse | undefined,
): WaitingRepositories {
  if (!builds) return { ids: new Set(), wait: 'waiting' }
  return {
    ids: new Set(builds.changes.addedRepositories.map((item) => item.id)),
    wait: repositoryWaitOf(builds),
  }
}
