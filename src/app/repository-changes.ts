import type { RepositoryWait } from '../ui/components/settings/repositoryChangeCopy'
import type { BuildsResponse, Repository } from '../shared/org-settings'
import { latestBuild } from './latest-build'

/**
 * How the saved repository changes wait for the org image, from the builds
 * of the org. `waits` says that a repository waits. The first state that
 * applies wins: the newest build failed, so no build runs; a build runs
 * while a repository waits; else the changes wait for a build, such as
 * after a removal, during a refresh, or after a start that failed. The
 * newest build is the newest run of the install script, so a refresh never
 * counts as a build that runs.
 */
function repositoryWaitOf(
  builds: BuildsResponse,
  waits: boolean,
): RepositoryWait {
  const newest = latestBuild(builds)
  if (newest?.state === 'failed') return 'failed'
  return newest?.state === 'running' && waits ? 'building' : 'waiting'
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
    wait: repositoryWaitOf(builds, addedRepositories.length > 0),
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

/**
 * Whether a repository waits for a build before a workspace can start in
 * it. The readiness of the repositories reply wins, because the Worker
 * takes it from the same org image as the create. A reply of an older
 * Worker has no readiness. Then the repository waits while the builds list
 * it as added, and while the builds load, it does not wait.
 */
export function waitsForBuild(
  repository: Repository,
  builds: BuildsResponse | undefined,
): boolean {
  if (repository.ready !== undefined) return !repository.ready
  const added = builds?.changes.addedRepositories ?? []
  return added.some(({ id }) => id === repository.id)
}

/**
 * Whether the repositories reply shows that the org has a good image that
 * a workspace can start from, as the Worker reads it for the create:
 * `true` when the reply says so, or when the image holds one of its
 * repositories, also one that the org no longer chose. `false` when the
 * reply says that the org has no image yet. `undefined` when the reply says
 * nothing, as a reply of an older Worker. Builds that disagree are older
 * than the reply.
 */
export function imageReadyOf(
  repositories: readonly Repository[] | undefined,
): boolean | undefined {
  const list = repositories ?? []
  const ready = (item: Repository) => item.ready || item.imageReady
  if (list.some(ready)) return true
  if (list.some((item) => item.imageReady === false)) return false
  return undefined
}

/** The chosen repositories that wait for a build, as New workspace shows them. */
export interface WaitingRepositories {
  /** The IDs of the chosen repositories that the org image does not hold yet. */
  ids: ReadonlySet<string>
  /** How they wait, which gives the note of each one and the notice. */
  wait: RepositoryWait
}

/**
 * The waiting repositories of New workspace among the `chosen` ones, as
 * `waitsForBuild` says. Before the first good build (`noImage`), no
 * repository that says its readiness counts as waiting, because the first
 * build covers that time. A repository of an older reply waits only when
 * the builds list it, as before. How they wait comes from the builds, and
 * while they load, the waiting repositories wait for the next build.
 */
export function waitingRepositoriesOf(
  chosen: readonly Repository[],
  builds: BuildsResponse | undefined,
  noImage: boolean,
): WaitingRepositories {
  const waits = (item: Repository) =>
    noImage && item.ready !== undefined ? false : waitsForBuild(item, builds)
  const ids = new Set(chosen.filter(waits).map((item) => item.id))
  return {
    ids,
    wait: builds ? repositoryWaitOf(builds, ids.size > 0) : 'waiting',
  }
}
