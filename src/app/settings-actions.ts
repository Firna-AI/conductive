import {
  repositoryPath,
  repositoryPositionPath,
  type MoveRepositoryRequest,
  type Repository,
} from '../shared/org-settings'
import { readRepositories, readRepositoryOrder } from './api/read-settings'
import type { OrgModel } from './org-model'

/**
 * Adds or removes one repository of the org. Queued changes keep their
 * order. An add starts a build, and each change changes the repositories
 * that the org image lacks or still holds, so the builds read again after
 * the save: the new build and the repository notice show at once.
 */
export async function setRepositorySelected(
  org: OrgModel,
  repository: Repository,
  selected: boolean,
): Promise<void> {
  await org.resources.repositories.save(() =>
    org.services.api.send(
      selected ? 'PUT' : 'DELETE',
      repositoryPath(org.orgId, repository.id),
      {},
      readRepositories,
    ),
  )
  void org.reload('builds')
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
