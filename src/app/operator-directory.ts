import type { OperatorDirectoryQuery } from '../shared/operator'
import type { ApiError } from './api/client'
import type { DirectoryReply } from './api/read-operator'
import type { AppModel } from './app-model'
import { operatorFailure } from './operator-read'
import { Store, type Readable } from './store'

/** The rows that show, and the search that found them. */
export interface DirectoryResult<Row> extends DirectoryReply<Row> {
  search: string
}

/** A read of a list: the first page of a search, or the next page. */
type DirectoryRead = 'first' | 'more'

export interface DirectoryState<Row> {
  /** The rows of the last search that answered, or `null` before. */
  result: DirectoryResult<Row> | null
  /** The read that runs, or `null`. */
  reading: DirectoryRead | null
  /** The failure of the last read, until the next read starts. */
  failure: { read: DirectoryRead; error: ApiError } | null
}

/**
 * The Orgs or the Users tab of the operator: a search over every org or user,
 * newest first, 20 at a time, with Show more. An empty search lists them all.
 * The rows of a search stay until the answer of the next one, so typing does
 * not flash the table. An answer after the tab closed or the search changed
 * changes nothing.
 */
export class OperatorDirectory<Row> {
  private readonly shown = new Store<DirectoryState<Row>>({
    result: null,
    reading: null,
    failure: null,
  })
  readonly state: Readable<DirectoryState<Row>> = this.shown
  private readonly app: AppModel
  private readonly path: (query: OperatorDirectoryQuery) => string
  private readonly read: (body: unknown) => DirectoryReply<Row>
  /** Each search and each close counts one up, so an older answer is obsolete. */
  private generation = 0
  private search = ''
  private open = false

  constructor(
    app: AppModel,
    path: (query: OperatorDirectoryQuery) => string,
    read: (body: unknown) => DirectoryReply<Row>,
  ) {
    this.app = app
    this.path = path
    this.read = read
  }

  /** A tab shows the rows of `search`. The result closes the tab. */
  watch(search: string): () => void {
    this.generation += 1
    const run = this.generation
    this.search = search
    this.open = true
    void this.first(run)
    return () => {
      if (run !== this.generation) return
      this.generation += 1
      this.open = false
      this.update({ reading: null })
    }
  }

  /** Show more: the next rows of the search. */
  async more(): Promise<void> {
    const { result, reading } = this.shown.get()
    if (!this.open || reading !== null || !result?.nextCursor) return
    const run = this.generation
    this.update({ reading: 'more', failure: null })
    try {
      const next = await this.get(result.nextCursor)
      if (run !== this.generation) return
      this.shown.set({
        result: {
          search: result.search,
          rows: [...result.rows, ...next.rows],
          total: next.total,
          nextCursor: next.nextCursor,
        },
        reading: null,
        failure: null,
      })
    } catch (error) {
      const failure = operatorFailure(this.app, error)
      if (run !== this.generation) return
      this.update({ reading: null, failure: { read: 'more', error: failure } })
    }
  }

  /** Try again: the read that failed runs again. */
  retry(): Promise<void> {
    const { failure, reading } = this.shown.get()
    if (!this.open || !failure || reading !== null) return Promise.resolve()
    return failure.read === 'more' ? this.more() : this.first(this.generation)
  }

  private update(change: Partial<DirectoryState<Row>>): void {
    this.shown.change((current) => ({ ...current, ...change }))
  }

  private get(cursor?: string): Promise<DirectoryReply<Row>> {
    const query: OperatorDirectoryQuery = {
      ...(this.search === '' ? {} : { q: this.search }),
      ...(cursor === undefined ? {} : { cursor }),
    }
    return this.app.services.api.get(this.path(query), this.read)
  }

  private async first(run: number): Promise<void> {
    const search = this.search
    this.update({ reading: 'first', failure: null })
    try {
      const reply = await this.get()
      if (run !== this.generation) return
      this.shown.set({
        result: { search, ...reply },
        reading: null,
        failure: null,
      })
    } catch (error) {
      const failure = operatorFailure(this.app, error)
      if (run !== this.generation) return
      this.shown.set({
        result: null,
        reading: null,
        failure: { read: 'first', error: failure },
      })
    }
  }
}
