import { expect, it } from 'vitest'

import type { QueueTurn } from '../chat/queue-turn'
import type { SandboxProvider } from '../sandbox/provider'
import { StartRunTimer } from './start-run-timer'
import { timedDatabase } from './timed-d1'
import { timedProvider } from './timed-provider'

function manualClock(at: number) {
  const clock = { at, now: () => clock.at }
  return clock
}

const META = {
  duration: 0,
  size_after: 0,
  rows_read: 0,
  rows_written: 0,
  last_row_id: 0,
  changed_db: false,
  changes: 0,
}

/** The real binding reads the fields of its own statements in a batch. */
class FakeStatement implements D1PreparedStatement {
  readonly sql: string
  readonly values: unknown[]
  private readonly clock: { at: number }
  constructor(clock: { at: number }, sql: string, values: unknown[] = []) {
    this.clock = clock
    this.sql = sql
    this.values = values
  }
  bind(...values: unknown[]): D1PreparedStatement {
    return new FakeStatement(this.clock, this.sql, values)
  }
  first<T = unknown>(colName: string): Promise<T | null>
  first<T = Record<string, unknown>>(): Promise<T | null>
  async first<T>(): Promise<T | null> {
    this.clock.at += 2
    return null
  }
  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    this.clock.at += 1
    return { success: true, meta: META, results: [] }
  }
  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return { success: true, meta: META, results: [] }
  }
  raw<T = unknown[]>(options: {
    columnNames: true
  }): Promise<[string[], ...T[]]>
  raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>
  async raw<T = unknown[]>(): Promise<T[]> {
    return []
  }
}

class FakeDatabase implements D1Database {
  readonly batches: { sql: string; values: unknown[] }[][] = []
  private readonly clock: { at: number }
  constructor(clock: { at: number }) {
    this.clock = clock
  }
  prepare(query: string): D1PreparedStatement {
    return new FakeStatement(this.clock, query)
  }
  async batch<T = unknown>(
    statements: D1PreparedStatement[],
  ): Promise<D1Result<T>[]> {
    this.batches.push(
      statements.map((statement) =>
        statement instanceof FakeStatement
          ? { sql: statement.sql, values: statement.values }
          : { sql: 'a statement of another binding', values: [] },
      ),
    )
    this.clock.at += 5
    return []
  }
  async exec(): Promise<D1ExecResult> {
    return { count: 0, duration: 0 }
  }
  withSession(): D1DatabaseSession {
    throw new Error('No test uses sessions.')
  }
  async dump(): Promise<ArrayBuffer> {
    return new ArrayBuffer(0)
  }
}

it('counts the D1 calls of the open run, gives a batch views of the real statements, and names the slowest call', async () => {
  const clock = manualClock(1_000)
  const timer = new StartRunTimer(clock.now)
  const fake = new FakeDatabase(clock)
  const db = timedDatabase(fake, timer)
  await db.prepare('SELECT before').first()
  timer.begin(false)
  await db.prepare('SELECT 1 WHERE id = ?').bind(7).first('id')
  await db.batch([
    db.prepare('UPDATE a SET b = ?').bind(1),
    db.prepare('UPDATE c'),
  ])
  await db.prepare('DELETE FROM d').run()
  const closed = timer.end()
  await db.prepare('SELECT after').first()

  expect(fake.batches).toEqual([
    [
      { sql: 'UPDATE a SET b = ?', values: [1] },
      { sql: 'UPDATE c', values: [] },
    ],
  ])
  expect(closed?.totals).toEqual({
    queueWaitMs: 0,
    queueRewaitMs: 0,
    providerCalls: 0,
    providerMs: 0,
    pollCalls: 0,
    pollMs: 0,
    d1Calls: 3,
    d1Ms: 8,
    slowestCall: 'd1.batch',
    slowestMs: 5,
  })
})

it('counts command status reads as polls and leaves computer marks for requests and ready reads', async () => {
  const clock = manualClock(2_000)
  const timer = new StartRunTimer(clock.now)
  const unused = () => Promise.reject(new Error('Not used by this test.'))
  const fake: SandboxProvider = {
    privatePort: unused,
    desktop: unused,
    fileInfo: unused,
    readFile: unused,
    create: async () => {
      clock.at += 3
      return { id: 'bx_1', state: 'provisioning' }
    },
    get: async () => {
      clock.at += 1
      return { id: 'bx_1', state: 'running' }
    },
    stop: unused,
    resume: unused,
    fork: unused,
    delete: unused,
    setAutoStop: unused,
    saveSnapshot: unused,
    getSnapshot: unused,
    deleteSnapshot: unused,
    runCommand: unused,
    startCommand: unused,
    getCommandStatus: async (_sandboxId, processId) => {
      clock.at += 4
      return {
        processId,
        state: 'running',
        running: true,
        exitCode: null,
        timedOut: null,
        stdout: '',
        stderr: '',
        stdoutOffset: 0,
        stderrOffset: 0,
        stdoutNextOffset: 0,
        stderrNextOffset: 0,
        more: false,
      }
    },
  }
  const provider = timedProvider(fake, timer)
  timer.begin(true)
  await provider.create({ ttlSeconds: 60, idempotencyKey: 'attempt' })
  await provider.get('bx_1')
  await provider.getCommandStatus('bx_1', 9, {
    stdoutOffset: 0,
    stderrOffset: 0,
  })
  const closed = timer.end()

  expect(closed?.totals).toMatchObject({
    providerCalls: 2,
    providerMs: 4,
    pollCalls: 1,
    pollMs: 4,
    d1Calls: 0,
    slowestCall: 'provider.getCommandStatus',
    slowestMs: 4,
  })
  expect(closed?.marks).toEqual([
    { kind: 'request-started', at: 2_000 },
    { kind: 'request-ended', at: 2_003 },
    { kind: 'ready', at: 2_004 },
  ])
})

it('counts the wait to enter the queue and each wait to enter it again after an outside call', async () => {
  const clock = manualClock(100)
  const timer = new StartRunTimer(clock.now)
  // Another queue turn holds the queue for 3 ms after each outside call ends.
  const turn: QueueTurn = {
    outside: async (call) => {
      const result = await call()
      clock.at += 3
      return result
    },
  }
  const operation = timer.queued(async (queueTurn) => {
    timer.begin(false)
    for (let call = 0; call < 2; call++)
      await timer.outside(queueTurn, async () => {
        clock.at += 10
      })
    return timer.end()
  })
  clock.at = 107
  const closed = await operation(turn)

  expect(closed?.totals).toMatchObject({ queueWaitMs: 7, queueRewaitMs: 6 })
})
