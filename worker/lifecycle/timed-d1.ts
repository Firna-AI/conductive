import type { StartRunTimer } from './start-run-timer'

type CallTimer = Pick<StartRunTimer, 'time'>

/**
 * Times each call of a D1 binding for the open start run. A statement keeps
 * its original, and a batch passes only originals to the real binding,
 * because the binding reads the internal fields of its own statements.
 */
export function timedDatabase(db: D1Database, timer: CallTimer): D1Database {
  return new TimedDatabase(db, timer)
}

class TimedStatement implements D1PreparedStatement {
  readonly original: D1PreparedStatement
  private readonly timer: CallTimer

  constructor(original: D1PreparedStatement, timer: CallTimer) {
    this.original = original
    this.timer = timer
  }

  bind(...values: unknown[]): D1PreparedStatement {
    return new TimedStatement(this.original.bind(...values), this.timer)
  }

  first<T = unknown>(colName: string): Promise<T | null>
  first<T = Record<string, unknown>>(): Promise<T | null>
  first<T>(colName?: string): Promise<T | null> {
    return this.timer.time('d1', 'd1.first', () =>
      colName === undefined
        ? this.original.first<T>()
        : this.original.first<T>(colName),
    )
  }

  run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return this.timer.time('d1', 'd1.run', () => this.original.run<T>())
  }

  all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return this.timer.time('d1', 'd1.all', () => this.original.all<T>())
  }

  raw<T = unknown[]>(options: {
    columnNames: true
  }): Promise<[string[], ...T[]]>
  raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>
  raw<T = unknown[]>(options?: {
    columnNames?: boolean
  }): Promise<[string[], ...T[]] | T[]> {
    return this.timer.time<[string[], ...T[]] | T[]>('d1', 'd1.raw', () =>
      options?.columnNames
        ? this.original.raw<T>({ columnNames: true })
        : this.original.raw<T>(),
    )
  }
}

class TimedDatabase implements D1Database {
  private readonly original: D1Database
  private readonly timer: CallTimer

  constructor(original: D1Database, timer: CallTimer) {
    this.original = original
    this.timer = timer
  }

  prepare(query: string): D1PreparedStatement {
    return new TimedStatement(this.original.prepare(query), this.timer)
  }

  batch<T = unknown>(
    statements: D1PreparedStatement[],
  ): Promise<D1Result<T>[]> {
    const originals = statements.map((statement) =>
      statement instanceof TimedStatement ? statement.original : statement,
    )
    return this.timer.time('d1', 'd1.batch', () =>
      this.original.batch<T>(originals),
    )
  }

  exec(query: string): Promise<D1ExecResult> {
    return this.timer.time('d1', 'd1.exec', () => this.original.exec(query))
  }

  /** No code uses sessions. A session and its statements are not timed. */
  withSession(
    constraintOrBookmark?: D1SessionBookmark | D1SessionConstraint,
  ): D1DatabaseSession {
    return this.original.withSession(constraintOrBookmark)
  }

  dump(): Promise<ArrayBuffer> {
    return this.original.dump()
  }
}
