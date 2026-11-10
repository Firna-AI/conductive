import {
  repositoryBranchesPath,
  type WorkspaceBranchOption,
  type WorkspaceBranchesResponse,
} from '../../shared/workspace-branches'
import { branchFixtures } from '../../test-support/fixtures/branches'
import { requireOrg, type DevBackend } from './backend'
import { ID, json, RouteError, type Route } from './router'

/**
 * What a read of the branch list of the dev fake does: `ready` answers at
 * once, `wait` never answers, so the picker keeps loading, and `fail`
 * refuses the first read of the page once, so Try again then works.
 */
export type DevBranchMode = 'ready' | 'wait' | 'fail'

/** The rows of one page. The rows of the mockups fill two pages. */
const PAGE_SIZE = 4

/**
 * Whether a row matches a search, as the Worker reads it: a branch by its
 * name, and a pull request by its number, its title, or its branch. A pull
 * request from another repository has no branch in the repository, so its
 * branch does not count.
 */
function matches(row: WorkspaceBranchOption, query: string): boolean {
  if (row.type === 'branch') return row.name.toLowerCase().includes(query)
  return (
    row.title.toLowerCase().includes(query) ||
    `#${row.number}`.includes(query) ||
    (row.availability === 'available' &&
      row.branch.toLowerCase().includes(query))
  )
}

/**
 * The branch list of the dev fake: the rows of the mockups for each chosen
 * repository, searched as the Worker searches them, four to a page. Its
 * cursor is the place of the next row.
 */
export function branchRoutes(
  backend: DevBackend,
  mode: DevBranchMode,
): Route[] {
  let failed = false
  return [
    {
      method: 'GET',
      path: repositoryBranchesPath(ID.org, ID.repository),
      answer: ({ params, query }) => {
        const org = requireOrg(backend.state, params.org)
        const repository = org.repositories.find(
          (item) => item.id === params.repository && item.selected,
        )
        if (!repository) {
          throw new RouteError(
            404,
            'repository_not_found',
            'The repository is not available.',
          )
        }
        if (mode === 'wait') return new Promise<Response>(() => {})
        if (mode === 'fail' && !failed) {
          failed = true
          throw new RouteError(
            502,
            'github_unavailable',
            'GitHub is not available. Try again.',
          )
        }
        const search = (query.get('query') ?? '').trim().toLowerCase()
        const rows = branchFixtures(repository).filter((row) =>
          matches(row, search),
        )
        const start = Number(query.get('cursor') ?? '0')
        const end = start + PAGE_SIZE
        return json({
          rows: rows.slice(start, end),
          nextCursor: end < rows.length ? String(end) : null,
        } satisfies WorkspaceBranchesResponse)
      },
    },
  ]
}
