import type { Change } from './resource'

/** A change of one row that the server confirmed, such as a disabled code. */
export interface RowChange<Row> {
  change: Change<Row>
  /** The row then leaves the count of the list, as an approved person does. */
  leavesCount: boolean
  /** The number of the newest first read when the change arrived. */
  at: number
}

/**
 * The changes of the rows of one list that the server confirmed, by the key
 * of the row. Each change shows over its row in every answer, also in the
 * answer of a read that started before the change. The answer of a first
 * read that started after the change ends it, because the server had the
 * change then. A newer change of a row replaces the older one.
 */
export class RowChanges<Row> {
  private readonly changes = new Map<string, RowChange<Row>>()
  private readonly key: (row: Row) => string

  constructor(key: (row: Row) => string) {
    this.key = key
  }

  /** Keeps the change of `row` that a write confirmed. */
  confirm(row: Row, change: RowChange<Row>): void {
    this.changes.set(this.key(row), change)
  }

  /** The answer of the first read `read` ends each change from before it. */
  end(read: number): void {
    for (const [key, change] of this.changes) {
      if (change.at < read) this.changes.delete(key)
    }
  }

  /** The rows, each with its change. */
  apply(rows: readonly Row[]): Row[] {
    return rows.map((row) => this.changeOf(row)?.change(row) ?? row)
  }

  /** How many of the rows have a change that takes them out of the count. */
  outOfCount(rows: readonly Row[]): number {
    return rows.filter((row) => this.changeOf(row)?.leavesCount === true).length
  }

  private changeOf(row: Row): RowChange<Row> | undefined {
    return this.changes.get(this.key(row))
  }
}
