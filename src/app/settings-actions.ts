import { automationsPath } from '../shared/automations'
import {
  repositoryPath,
  repositoryPositionPath,
  type MoveRepositoryRequest,
  type Repository,
  type RepositoryChangeRequest,
} from '../shared/org-settings'
import { readAutomations, type ListedAutomation } from './api/read-automations'
import { readRepositories, readRepositoryOrder } from './api/read-settings'
import type { OrgModel } from './org-model'
import { load, loading, Store, type Loadable, type Readable } from './store'

/**
 * Adds or removes one repository of the org, and starts no build. Queued
 * changes keep their order. Each change changes the repositories that the
 * org image lacks or still holds, so the builds read again after the save:
 * the repository notice shows at once.
 */
export async function setRepositorySelected(
  org: OrgModel,
  repository: Repository,
  selected: boolean,
): Promise<void> {
  const body: RepositoryChangeRequest = { build: false }
  await org.resources.repositories.save(() =>
    org.services.api.send(
      selected ? 'PUT' : 'DELETE',
      repositoryPath(org.orgId, repository.id),
      body,
      readRepositories,
    ),
  )
  void org.reload('builds')
}

/**
 * A read of the automations of the org that only its caller shows, such as
 * one opening of the question before Remove of a repository. `store` loads
 * until `read` answers, and shows the error of a failed read. It never
 * shows the shared list of the model, which can be older than the caller.
 */
export function freshAutomations(org: OrgModel): {
  store: Readable<Loadable<readonly ListedAutomation[]>>
  read: () => Promise<void>
} {
  const store = new Store<Loadable<readonly ListedAutomation[]>>(loading)
  return {
    store,
    read: () =>
      load(store, () =>
        org.services.api.get(automationsPath(org.orgId), readAutomations),
      ),
  }
}

/**
 * The repositories after a move of the chosen repository `repositoryId` to
 * `index`, which counts the chosen repositories without the moved one. The
 * chosen ones come first, in the repository order, then the others, as the
 * server lists them. A repository that is not chosen moves nothing.
 */
export function repositoryMoved(
  list: readonly Repository[],
  repositoryId: string,
  index: number,
): readonly Repository[] {
  const moved = list.find((item) => item.id === repositoryId && item.selected)
  if (!moved) return list
  const others = list.filter((item) => item.selected && item !== moved)
  const place = Math.max(0, Math.min(index, others.length))
  const chosen = [...others.slice(0, place), moved, ...others.slice(place)]
  return [...chosen, ...list.filter((item) => !item.selected)]
}

/**
 * The repositories in the saved repository `order`: the chosen ones in that
 * order, then the others as they were. A chosen repository that the order
 * does not name keeps its place after the named ones.
 */
function repositoriesInOrder(
  list: readonly Repository[],
  order: readonly string[],
): readonly Repository[] {
  const rank = new Map(order.map((id, index) => [id, index]))
  const chosen = list
    .filter((item) => item.selected)
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        (rank.get(a.item.id) ?? order.length + a.index) -
        (rank.get(b.item.id) ?? order.length + b.index),
    )
    .map(({ item }) => item)
  return [...chosen, ...list.filter((item) => !item.selected)]
}

/**
 * Moves a chosen repository of the org to `index` of the repository order
 * (repository-order decision 1 F). The move shows at once. The answer is
 * the saved order, which the list then follows, and a failure takes back
 * only this move. A move starts no build, so the builds do not read again.
 */
export async function moveRepository(
  org: OrgModel,
  repositoryId: string,
  index: number,
): Promise<void> {
  const body: MoveRepositoryRequest = { index }
  await org.resources.repositories.write(
    (list) => repositoryMoved(list, repositoryId, index),
    () =>
      org.services.api.send(
        'PUT',
        repositoryPositionPath(org.orgId, repositoryId),
        body,
        readRepositoryOrder,
      ),
    (answer) => (list) => repositoriesInOrder(list, answer.order),
  )
}

/**
 * The changes of one open edit of the Repositories tab, which Done saves:
 * the chosen state that the edit wants for each repository, by its ID.
 * The edit holds only the repositories whose wanted state differs from
 * the saved one.
 */
export type RepositoryChanges = ReadonlyMap<string, boolean>

export const noRepositoryChanges: RepositoryChanges = new Map()

/**
 * The changes after one Add or Remove. A repository that goes back to its
 * saved state leaves the changes, so an add and a removal of the same
 * repository save nothing.
 */
export function changeRepository(
  changes: RepositoryChanges,
  repository: Repository,
  selected: boolean,
): RepositoryChanges {
  const next = new Map(changes)
  if (selected === repository.selected) next.delete(repository.id)
  else next.set(repository.id, selected)
  return next
}

/** The repositories as the open edit shows them, with its changes. */
export function withRepositoryChanges(
  repositories: readonly Repository[],
  changes: RepositoryChanges,
): Repository[] {
  return repositories.map((repository) => {
    const selected = changes.get(repository.id)
    return selected === undefined ? repository : { ...repository, selected }
  })
}

/** The full names of the repositories that the open edit adds. */
export function addedRepositoryNames(
  repositories: readonly Repository[],
  changes: RepositoryChanges,
): string[] {
  return repositories
    .filter((repository) => changes.get(repository.id) === true)
    .map((repository) => repository.fullName)
}

/** What Done saved, and what it could not save. */
export interface SavedRepositoryChanges {
  /** Done saved at least one add, so it starts a build. */
  added: boolean
  /** The changes that did not save. They stay in the edit. */
  failed: RepositoryChanges
  /** The first error of a change that did not save. */
  failure: unknown
}

/**
 * Done. Saves each change of the edit, the removals first and then the
 * adds, and starts no build. A failed change does not stop the others.
 * Its caller starts one build when Done saved an add.
 */
export async function saveRepositoryChanges(
  org: OrgModel,
  repositories: readonly Repository[],
  changes: RepositoryChanges,
): Promise<SavedRepositoryChanges> {
  const ordered = repositories
    .filter((repository) => changes.has(repository.id))
    .sort(
      (a, b) =>
        Number(changes.get(a.id) === true) - Number(changes.get(b.id) === true),
    )
  const failed = new Map<string, boolean>()
  let added = false
  let failure: unknown = null
  for (const repository of ordered) {
    const selected = changes.get(repository.id) === true
    try {
      await setRepositorySelected(org, repository, selected)
      if (selected) added = true
    } catch (cause) {
      failed.set(repository.id, selected)
      failure ??= cause
    }
  }
  return { added, failed, failure }
}
