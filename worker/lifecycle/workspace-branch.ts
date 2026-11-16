import { hash } from '../security/crypto'

const CITIES = [
  'lisbon',
  'oslo',
  'kyoto',
  'perth',
  'lima',
  'riga',
  'bern',
  'seoul',
  'milan',
  'porto',
  'quito',
  'delft',
] as const

/** The longest name part of a branch, in characters. */
const NAME_PART_LIMIT = 40

/**
 * The part of a branch name that a workspace name gives, such as
 * `saved-carts` for "Saved carts". It keeps only `a-z`, `0-9`, and single
 * hyphens, and it is empty when the name has no letter or digit.
 */
export function branchNamePart(name: string | null | undefined): string {
  const part = (name ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (part.length <= NAME_PART_LIMIT) return part
  if (part[NAME_PART_LIMIT] === '-') return part.slice(0, NAME_PART_LIMIT)
  const head = part.slice(0, NAME_PART_LIMIT)
  const end = head.lastIndexOf('-')
  return end > 0 ? head.slice(0, end) : head
}

/**
 * The branch of a new workspace or of a Continue: the GitHub login, the
 * name part or a city, the version of a later task, and four random
 * characters, such as `calummoore/saved-carts-v2-7k2q`.
 */
export async function workspaceBranch(
  login: string,
  randomToken: () => string,
  options: { name?: string | null; task?: number } = {},
) {
  const random = await hash(randomToken())
  const city = CITIES[random.charCodeAt(0) % CITIES.length]
  const suffix = [...random.slice(1, 5)]
    .map(
      (character) =>
        'abcdefghijklmnopqrstuvwxyz0123456789'[character.charCodeAt(0) % 36],
    )
    .join('')
  const version =
    options.task !== undefined && options.task > 1 ? `-v${options.task}` : ''
  const part = branchNamePart(options.name) || city
  return { city, branch: `${login}/${part}${version}-${suffix}` }
}

/**
 * The SQL value of the branch after a name write. While the branch is a
 * placeholder, it takes the name part between its GitHub login and its
 * hyphen with four random characters. `workspaceBranch` gives each new
 * branch that form. An empty part puts back the city of the creation plan.
 * Without a name, or after the placeholder, the branch stays.
 */
export function namedBranchSql(name: string | null | undefined): {
  sql: string
  values: [string | null, string]
} {
  return {
    sql: `CASE WHEN branch_placeholder = 1 AND ? IS NOT NULL
      THEN substr(branch, 1, instr(branch, '/'))
        || COALESCE(
          NULLIF(?, ''),
          (SELECT p.city FROM workspace_creation_plans p WHERE p.workspace_id = workspaces.id),
          substr(branch, instr(branch, '/') + 1, length(branch) - instr(branch, '/') - 5))
        || substr(branch, -5)
      ELSE branch END`,
    values: [name ?? null, branchNamePart(name)],
  }
}

/**
 * Ends the placeholder of the branch before the start uses it in the
 * sandbox, and gives the branch. One statement does both, so no name write
 * changes the branch after this read. It gives null when the branch is no
 * longer a placeholder, because no name write then changes it.
 */
export async function settleWorkspaceBranch(
  db: D1Database,
  workspaceId: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      `UPDATE workspaces SET branch_placeholder = 0
       WHERE id = ? AND branch_placeholder = 1 RETURNING branch`,
    )
    .bind(workspaceId)
    .first<{ branch: string }>()
  return row?.branch ?? null
}
