import {
  repositoryBranchesPath,
  type WorkspaceBranchOption,
} from '../shared/workspace-branches'
import type { ApiError } from './api/client'
import { readWorkspaceBranches } from './api/read-workspace-branches'
import { optionKey } from './branch-options'
import type { AppServices } from './services'
import { asApiError, Store, type Readable } from './store'

/** The pause after the last key before a search runs, in ms. */
export const BRANCH_SEARCH_PAUSE_MS = 300

/** Show more of loaded rows: no page waits, one can load, loads, or failed. */
type MoreBranches =
  | { state: 'none' }
  | { state: 'ready' }
  | { state: 'reading' }
  | { state: 'failed'; error: ApiError }

/** The rows of the search that the field holds. */
export type BranchRows =
  /** The search waits for its pause, or its first rows load. */
  | { state: 'loading' }
  /** The first rows did not load. Try again loads them again. */
  | { state: 'failed'; error: ApiError }
  | {
      state: 'ready'
      /** The trimmed search that found the rows. Empty lists them all. */
      query: string
      /** The rows of the pages that loaded, each once, in their order. */
      rows: readonly WorkspaceBranchOption[]
      more: MoreBranches
    }

export interface BranchListState {
  /** The text of the search field, as the person typed it. */
  text: string
  rows: BranchRows
}

/** The pages of one search that loaded, and the cursor of the next one. */
interface Pages {
  query: string
  rows: readonly WorkspaceBranchOption[]
  next: string | null
}

/**
 * The address of one page of the list: the rows that match `query`, after
 * `cursor`. An empty search and the first page leave their part out.
 */
export function branchPagePath(
  orgId: string,
  repositoryId: string,
  query: string,
  cursor: string | null,
): string {
  const search = new URLSearchParams()
  if (query !== '') search.set('query', query)
  if (cursor !== null) search.set('cursor', cursor)
  const path = repositoryBranchesPath(orgId, repositoryId)
  const tail = search.toString()
  return tail === '' ? path : `${path}?${tail}`
}

/** `rows`, then each row of `added` that is not in the list yet. */
function merged(
  rows: readonly WorkspaceBranchOption[],
  added: readonly WorkspaceBranchOption[],
): WorkspaceBranchOption[] {
  const seen = new Set(rows.map(optionKey))
  const result = [...rows]
  for (const row of added) {
    if (seen.has(optionKey(row))) continue
    seen.add(optionKey(row))
    result.push(row)
  }
  return result
}

/**
 * The branches and the open pull requests of a repository on GitHub, as
 * the branch picker of a New workspace form searches and pages them. The
 * server finds the rows of a search and leaves out the default branch. A
 * page that a search leaves empty does not end the list while its cursor
 * goes on, so the list follows that cursor before it shows no match.
 *
 * The search and the rows stay while the picker closes and opens again,
 * until another repository opens it. An answer after another search,
 * another repository, or a close changes nothing, and no search or page
 * runs after a close.
 */
export class BranchList {
  private readonly shown = new Store<BranchListState>({
    text: '',
    rows: { state: 'loading' },
  })
  readonly state: Readable<BranchListState> = this.shown
  private readonly services: Pick<AppServices, 'api' | 'delay'>
  private readonly orgId: string
  private repositoryId: string | null = null
  /** The search that the rows show or load: the trimmed text. */
  private query = ''
  /** The pages of the last search that answered. */
  private pages: Pages | null = null
  /**
   * Each search, each repository, and each stop counts one up, so the
   * answer of an older read is obsolete.
   */
  private generation = 0
  /** The read that runs, with the generation that started it. */
  private reading: { generation: number; page: 'first' | 'more' } | null = null
  private cancelPause: (() => void) | null = null

  constructor(services: Pick<AppServices, 'api' | 'delay'>, orgId: string) {
    this.services = services
    this.orgId = orgId
  }

  /**
   * The picker opens on the rows of `repositoryId`. Another repository
   * starts an empty search. The first rows load, unless they show, load,
   * or wait for the pause of a search. So a reopen keeps the search and
   * its rows, and a reopen after a failure loads them again.
   */
  open(repositoryId: string): void {
    if (repositoryId !== this.repositoryId) {
      this.repositoryId = repositoryId
      this.obsolete()
      this.query = ''
      this.pages = null
      this.shown.set({ text: '', rows: { state: 'loading' } })
    }
    if (this.cancelPause !== null || this.reading?.page === 'first') return
    if (this.shown.get().rows.state !== 'ready') void this.first()
  }

  /**
   * The text of the search field. A new search runs after a pause in the
   * typing, and the rows of another search do not show meanwhile. A search
   * back to the search of the last answer shows its rows again at once.
   */
  search(text: string): void {
    this.shown.change((state) => ({ ...state, text }))
    const query = text.trim()
    if (query === this.query) return
    this.query = query
    this.obsolete()
    if (this.pages?.query === query) {
      this.showPages(this.pages)
      return
    }
    this.setRows({ state: 'loading' })
    this.cancelPause = this.services.delay(BRANCH_SEARCH_PAUSE_MS, () => {
      this.cancelPause = null
      void this.first()
    })
  }

  /** Enter in the search field: a search that waits for its pause runs now. */
  searchNow(): void {
    if (this.cancelPause === null) return
    void this.first()
  }

  /** Show more: the next rows of the search, under the rows that show. */
  async more(): Promise<void> {
    const { pages, repositoryId } = this
    const { rows } = this.shown.get()
    if (rows.state !== 'ready' || pages === null || pages.next === null) return
    if (repositoryId === null || this.reading !== null) return
    const generation = this.generation
    this.reading = { generation, page: 'more' }
    this.setRows({ ...rows, more: { state: 'reading' } })
    try {
      const page = await this.follow(repositoryId, pages, generation)
      if (page === null) return
      this.pages = { ...page, rows: merged(pages.rows, page.rows) }
      this.showPages(this.pages)
    } catch (error) {
      if (generation !== this.generation) return
      const failed = { state: 'failed', error: asApiError(error) } as const
      this.setRows({ ...rows, more: failed })
    } finally {
      this.ended(generation)
    }
  }

  /** Try again: the read that failed runs again. */
  retry(): Promise<void> {
    const { rows } = this.shown.get()
    if (rows.state === 'failed') return this.first()
    if (rows.state === 'ready' && rows.more.state === 'failed') {
      return this.more()
    }
    return Promise.resolve()
  }

  /**
   * The picker closes. A search that waits for its pause does not run, the
   * answer of a read that runs changes nothing, and no later page loads.
   * The search and the rows that show stay, and a later open reads only
   * what did not load.
   */
  stop(): void {
    this.obsolete()
    const { rows } = this.shown.get()
    if (rows.state === 'ready' && rows.more.state === 'reading') {
      this.setRows({ ...rows, more: { state: 'ready' } })
    }
  }

  /** Reads the first rows of the search. */
  private async first(): Promise<void> {
    const { repositoryId, query } = this
    if (repositoryId === null) return
    this.obsolete()
    const generation = this.generation
    this.reading = { generation, page: 'first' }
    this.setRows({ state: 'loading' })
    try {
      const start = { query, rows: [], next: null }
      const page = await this.follow(repositoryId, start, generation)
      if (page === null) return
      this.pages = { ...page, rows: merged([], page.rows) }
      this.showPages(this.pages)
    } catch (error) {
      if (generation !== this.generation) return
      this.setRows({ state: 'failed', error: asApiError(error) })
    } finally {
      this.ended(generation)
    }
  }

  /**
   * The rows after the cursor of `from`, page by page, until a page has
   * rows or the list ends. `null` says that the answer is obsolete.
   */
  private async follow(
    repositoryId: string,
    from: Pages,
    generation: number,
  ): Promise<Pages | null> {
    const rows: WorkspaceBranchOption[] = []
    let next = from.next
    do {
      const path = branchPagePath(this.orgId, repositoryId, from.query, next)
      const page = await this.services.api.get(path, readWorkspaceBranches)
      if (generation !== this.generation) return null
      rows.push(...page.rows)
      next = page.nextCursor
    } while (rows.length === 0 && next !== null)
    return { query: from.query, rows, next }
  }

  /** Ends the pause of a search, and makes each read that runs obsolete. */
  private obsolete(): void {
    this.cancelPause?.()
    this.cancelPause = null
    this.generation += 1
    this.reading = null
  }

  private ended(generation: number): void {
    if (this.reading?.generation === generation) this.reading = null
  }

  private showPages(pages: Pages): void {
    const more = pages.next === null ? 'none' : 'ready'
    this.setRows({
      state: 'ready',
      query: pages.query,
      rows: pages.rows,
      more: { state: more },
    })
  }

  private setRows(rows: BranchRows): void {
    this.shown.change((state) => ({ ...state, rows }))
  }
}
