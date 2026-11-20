import {
  compareRepositoryNames,
  type Repository,
} from '../../src/shared/org-settings'

/**
 * The repository order of an org, as an `ORDER BY` list of the
 * `repositories` table. The chosen repositories come first, by
 * `position`. A chosen row without a position, which the previous Worker
 * can add during a deploy, follows the rows with one. The name order of
 * `compareRepositoryNames` breaks each tie. The repositories that are not
 * chosen come last, in the name order. The position of a row that is not
 * chosen counts for nothing, because the previous Worker keeps it at a
 * Remove.
 */
export const REPOSITORY_ORDER = `selected = 0,
  CASE WHEN selected = 1 THEN position END IS NULL,
  CASE WHEN selected = 1 THEN position END,
  lower(full_name), full_name, id`

type NamedRepository = Pick<Repository, 'id' | 'fullName'>

/**
 * Sorts the repositories of `chosenIds` first, in the order of that list,
 * and every other repository after them in the name order.
 */
export function compareInRepositoryOrder(
  chosenIds: readonly string[],
): (a: NamedRepository, b: NamedRepository) => number {
  const ranks = new Map(chosenIds.map((id, rank) => [id, rank]))
  return (a, b) => {
    const left = ranks.get(a.id)
    const right = ranks.get(b.id)
    if (left !== undefined && right !== undefined) return left - right
    if (left !== undefined) return -1
    if (right !== undefined) return 1
    return compareRepositoryNames(a, b)
  }
}

/** The IDs of the chosen repositories of an org, in the repository order. */
export async function chosenRepositoryIds(
  db: D1Database,
  orgId: string,
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT id FROM repositories WHERE org_id = ? AND selected = 1
       ORDER BY ${REPOSITORY_ORDER}`,
    )
    .bind(orgId)
    .all<{ id: string }>()
  return results.map((row) => row.id)
}
