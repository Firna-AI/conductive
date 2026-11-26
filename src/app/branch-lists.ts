import {
  repositoryBranchesPath,
  type RepositoryBranchesResponse,
} from '../shared/branches'
import type { ApiClient } from './api/client'
import { readRepositoryBranches } from './api/read-branches'
import {
  asApiError,
  loading,
  ready,
  Store,
  type Loadable,
  type Readable,
} from './store'

/**
 * The branches of one repository, as the branch picker of New workspace
 * lists them. The Worker reads them live from GitHub with the GitHub token
 * of the member, and it stores no list, so each open of the picker reads
 * them again, and Try again reads them after a failure. While a read runs,
 * the list loads. Only the answer of the newest read shows.
 */
export class BranchList {
  private readonly shown = new Store<Loadable<RepositoryBranchesResponse>>(
    loading,
  )
  readonly store: Readable<Loadable<RepositoryBranchesResponse>> = this.shown
  private reads = 0
  private readonly fetch: () => Promise<RepositoryBranchesResponse>

  constructor(fetch: () => Promise<RepositoryBranchesResponse>) {
    this.fetch = fetch
  }

  /** Reads the list, as an open of the picker and Try again do. */
  async read(): Promise<void> {
    const at = ++this.reads
    this.shown.set(loading)
    let answer: Loadable<RepositoryBranchesResponse>
    try {
      answer = ready(await this.fetch())
    } catch (error) {
      answer = { state: 'failed', error: asApiError(error) }
    }
    if (at === this.reads) this.shown.set(answer)
  }
}

/**
 * The branch lists of the repositories of one org, which the drafts of
 * every section share. A list belongs to the member who read it, because
 * GitHub shows each member only what that member may read, so a sign-out
 * forgets the lists.
 */
export class BranchLists {
  private readonly lists = new Map<string, BranchList>()
  private readonly api: ApiClient
  private readonly orgId: string

  constructor(api: ApiClient, orgId: string) {
    this.api = api
    this.orgId = orgId
  }

  /** The list of one repository of the org. */
  of(repositoryId: string): BranchList {
    let list = this.lists.get(repositoryId)
    if (!list) {
      list = new BranchList(() =>
        this.api.get(
          repositoryBranchesPath(this.orgId, repositoryId),
          readRepositoryBranches,
        ),
      )
      this.lists.set(repositoryId, list)
    }
    return list
  }

  /**
   * Forgets every list. A read that still runs answers only its own list,
   * which no screen reads any more.
   */
  forget(): void {
    this.lists.clear()
  }
}
