import type { OperatorDirectoryQuery } from '../shared/operator'
import type { ApiError } from './api/client'
import type { DirectoryReply } from './api/read-operator'
import type { AppModel } from './app-model'
import { RowChanges } from './operator-row-changes'
import { operatorFailure } from './operator-read'
import type { Change } from './resource'
import { Store, type Readable } from './store'

/** The rows of the answers of one search, as the server sent them. */
interface DirectoryAnswer<Row> extends DirectoryReply<Row> {
  search: string
}

/** The rows that show, and the search that found them. */
export interface DirectoryResult<Row> extends DirectoryAnswer<Row> {
  /**
   * The rows that the list still counts: `total`, less each row that shows
   * a change that leaves the count, such as a person approved in this visit.
   */
  remaining: number
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
 * A tab of the operator that lists and searches: the orgs, the users, the
 * people who wait, or the codes, 20 at a time, with Show more. An empty
 * search lists them all. The rows of a search stay until the answer of the
 * next one, so typing does not flash the table. An answer after the tab
 * closed, the search changed, or the list loaded again changes nothing.
 *
 * The rows that the server sent stay apart from the changes of the writes,
 * such as Disable. Each answer shows under the changes that the server
 * confirmed, so the answer of a read that started before a write cannot
 * put the old row back.
 */
export class OperatorDirectory<Row> {
  private readonly shown = new Store<DirectoryState<Row>>({
    result: null,
    reading: null,
    failure: null,
  })
  readonly state: Readable<DirectoryState<Row>> = this.shown
  /** The key of a row, which stays the same in each answer. */
  readonly rowKey: (row: Row) => string
  private readonly app: AppModel
  private readonly path: (query: OperatorDirectoryQuery) => string
  private readonly read: (body: unknown) => DirectoryReply<Row>
  private readonly changes: RowChanges<Row>
  /** The rows of the first page and of each Show more, or `null`. */
  private answer: DirectoryAnswer<Row> | null = null
  /** Each search and each close counts one up, so an older answer is obsolete. */
  private generation = 0
  /**
   * Each read of the first rows counts one up, so the answer of an older
   * read, or of Show more before it, is obsolete.
   */
  private reads = 0
  /** The writes that take a row out of the count and still run. */
  private leavingWrites = 0
  private search = ''
  private open = false

  constructor(
    app: AppModel,
    path: (query: OperatorDirectoryQuery) => string,
    read: (body: unknown) => DirectoryReply<Row>,
    rowKey: (row: Row) => string,
  ) {
    this.app = app
    this.path = path
    this.read = read
    this.rowKey = rowKey
    this.changes = new RowChanges(rowKey)
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

  /** Show more: the next rows of the search, under the rows that show. */
  async more(): Promise<void> {
    const cursor = this.answer?.nextCursor
    if (!this.open || this.shown.get().reading !== null || !cursor) return
    const current = this.current()
    this.update({ reading: 'more', failure: null })
    try {
      const next = await this.get(cursor)
      const answer = this.answer
      if (!current() || !answer) return
      const rows = [...answer.rows, ...next.rows]
      const keep = this.leavingWrites > 0 || this.changes.outOfCount(rows) > 0
      this.answer = {
        ...answer,
        rows,
        total: keep ? answer.total : next.total,
        nextCursor: next.nextCursor,
      }
      this.show({ reading: null, failure: null })
    } catch (error) {
      const failure = operatorFailure(this.app, error)
      if (!current()) return
      this.update({ reading: null, failure: { read: 'more', error: failure } })
    }
  }

  /**
   * Reads the first rows of the search again, such as after New code. The
   * rows stay until the answer.
   */
  reload(): Promise<void> {
    if (!this.open) return Promise.resolve()
    return this.first(this.generation)
  }

  /**
   * Sends a write that changes one row, such as Disable or Approve. After
   * its answer, the row shows `change` over the rows of each answer, until
   * the answer of a first read that started after that answer. With
   * `leavesCount`, the changed row leaves the count, as an approved person
   * does. While such a row shows or its write runs, Show more keeps the
   * total that still counts the row, because a newer total may already
   * leave it out. A failed write changes nothing, and its error goes to
   * the caller.
   */
  async write<A>(
    row: Row,
    send: () => Promise<A>,
    change: (answer: A) => Change<Row>,
    options: { leavesCount?: boolean } = {},
  ): Promise<void> {
    const leavesCount = options.leavesCount === true
    if (leavesCount) this.leavingWrites += 1
    try {
      const answer = await send()
      const at = this.reads
      this.changes.confirm(row, { change: change(answer), leavesCount, at })
      this.show()
    } finally {
      if (leavesCount) this.leavingWrites -= 1
    }
  }

  /** Try again: the read that failed runs again. */
  retry(): Promise<void> {
    const { failure, reading } = this.shown.get()
    if (!this.open || !failure || reading !== null) return Promise.resolve()
    return failure.read === 'more' ? this.more() : this.first(this.generation)
  }

  /** Whether the answer of a read that starts now still counts. */
  private current(): () => boolean {
    const run = this.generation
    const read = this.reads
    return () => run === this.generation && read === this.reads
  }

  private update(change: Partial<DirectoryState<Row>>): void {
    this.shown.change((current) => ({ ...current, ...change }))
  }

  /** Shows the rows of the answers with their changes, and `change`. */
  private show(change: Partial<DirectoryState<Row>> = {}): void {
    const answer = this.answer
    const result = answer && {
      ...answer,
      rows: this.changes.apply(answer.rows),
      remaining: answer.total - this.changes.outOfCount(answer.rows),
    }
    this.update({ ...change, result })
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
    this.reads += 1
    const read = this.reads
    const current = () => run === this.generation && read === this.reads
    this.update({ reading: 'first', failure: null })
    try {
      const reply = await this.get()
      if (!current()) return
      this.changes.end(read)
      this.answer = { search, ...reply }
      this.show({ reading: null, failure: null })
    } catch (error) {
      const failure = operatorFailure(this.app, error)
      if (!current()) return
      this.answer = null
      this.show({ reading: null, failure: { read: 'first', error: failure } })
    }
  }
}
