import { isRecord } from '../http'
import {
  LIFECYCLE_FENCE_KEY,
  type ReceiverFence,
} from '../members/receiver-fence'
import {
  RUNNER_MESSAGE_STAGES,
  RUNNER_WORK_KINDS,
  type RunnerMessageStage,
  type RunnerWorkFields,
} from '../warning-types'
import { warningEventType } from '../warning-runner-work'
import {
  WarningId,
  WarningStreamId,
  warningProcessStartId,
} from '../warning-values'
import { warnWorker } from '../warnings'
import type { parseRunnerTransport } from './runner-input'
import { chatKey } from './storage-keys'
import type { ActiveRunner } from './types'

/** A connection marks its runner work only this long after its hello. */
export const RUNNER_WORK_WATCH_MS = 30_000

export const RUNNER_WORK_MARK_KEY = chatKey('runner-work', 'current')

type RunnerTransport = ReturnType<typeof parseRunnerTransport>

/** The checked connection values and the work, as the mark saves them. */
interface StoredRunnerWork extends RunnerWorkFields {
  workspaceId: string
  connectionId: string
  streamId: string | null
  processStartId: string | null
  protocolVersion: number | null
}

/** The storage of the mark, outside the transactions of the chat. */
export interface RunnerWorkStorage {
  read(): Promise<unknown>
  /** Saves the mark and waits until it is durable. */
  save(record: StoredRunnerWork): Promise<void>
  /** Removes the mark. `durable` waits until the removal is durable. */
  remove(durable: boolean): Promise<void>
}

/**
 * Plain writes outside a transaction, then `sync()`. Without the sync, a
 * reset during work that never waits for I/O loses the mark with its
 * implicit transaction.
 */
export function nativeRunnerWorkStorage(
  storage: Pick<DurableObjectStorage, 'get' | 'put' | 'delete' | 'sync'>,
): RunnerWorkStorage {
  return {
    read: () => storage.get(RUNNER_WORK_MARK_KEY),
    save: async (record) => {
      // A purged workspace keeps no records, so a mark never adds one.
      const fence = await storage.get<ReceiverFence>(LIFECYCLE_FENCE_KEY)
      if (fence?.mode === 'purged') return
      await storage.put(RUNNER_WORK_MARK_KEY, record)
      await storage.sync()
    },
    remove: async (durable) => {
      await storage.delete(RUNNER_WORK_MARK_KEY)
      if (durable) await storage.sync()
    },
  }
}

export interface RunnerWorkMark {
  stage(stage: RunnerMessageStage): Promise<void>
  end(): Promise<void>
}

/** Handling state of one runner message. */
export interface RunnerProgress {
  stage: RunnerMessageStage
  size: number | null
  mark: RunnerWorkMark | null
}

/**
 * Keeps a durable mark of the runner work that runs just after a runner
 * connects. An out-of-memory reset ends the object before it can write a
 * warning, and the runner then resends the same work after it connects
 * again. The next instance finds the mark and reports that work. Each step
 * is best effort, so a failed step never changes the handling of the work.
 */
export class RunnerWorkWatch {
  private checked = false
  private readonly storage: RunnerWorkStorage | undefined
  private readonly now: () => number

  /** Without a storage, the watch marks nothing. */
  constructor(storage: RunnerWorkStorage | undefined, now: () => number) {
    this.storage = storage
    this.now = now
  }

  /** Reports the mark that an earlier instance left, once per instance. */
  async check(): Promise<void> {
    const storage = this.storage
    if (this.checked || !storage) return
    this.checked = true
    await bestEffort(async () => {
      const left = await storage.read()
      if (left === undefined) return
      warnInterrupted(left)
      await storage.remove(false)
    })
  }

  /**
   * Marks one message. A hello starts the window of its connection. The
   * saved connection keeps the end of the window, so a wake keeps it too.
   */
  async begin(
    connection: ActiveRunner,
    message: RunnerTransport | null,
    size: number | null,
  ): Promise<RunnerWorkMark | null> {
    if (message?.type === 'hello')
      connection.state.watchUntil = this.now() + RUNNER_WORK_WATCH_MS
    const { storage } = this
    const until = connection.state.watchUntil
    if (!storage || until === undefined || this.now() >= until) return null
    let record: StoredRunnerWork = {
      ...connectionValues(connection, message),
      ...workValues(message, size),
    }
    if (!(await bestEffort(() => storage.save(record)))) return null
    return {
      stage: async (stage) => {
        record = { ...record, stage }
        await bestEffort(() => storage.save(record))
      },
      end: async () => {
        await bestEffort(() => storage.remove(true))
      },
    }
  }

  /** Runs the flush after a hello under a mark. */
  async flush(connection: ActiveRunner, run: () => Promise<void>) {
    const mark = await this.begin(connection, null, null)
    try {
      await run()
    } finally {
      await mark?.end()
    }
  }
}

/** The size of a raw runner message: text length, or bytes of binary data. */
export function runnerMessageSize(value: unknown): number | null {
  if (typeof value === 'string') return value.length
  return value instanceof ArrayBuffer ? value.byteLength : null
}

function connectionValues(
  connection: ActiveRunner,
  message: RunnerTransport | null,
) {
  const hello = message?.type === 'hello' ? message : null
  const streamId = hello?.streamId ?? connection.state.streamId
  return {
    workspaceId: WarningId.checked(connection.state.workspace.id).text,
    connectionId: WarningId.checked(connection.state.id).text,
    streamId: streamId === null ? null : WarningStreamId.checked(streamId).text,
    processStartId: warningProcessStartId(
      hello ? hello.processStartId : connection.state.processStartId,
    ),
    protocolVersion: hello?.protocolVersion ?? connection.state.protocolVersion,
  }
}

function workValues(
  message: RunnerTransport | null,
  size: number | null,
): RunnerWorkFields {
  const empty = { eventType: null, eventNumber: null, size }
  switch (message?.type) {
    case undefined:
      return { ...empty, work: 'flush', stage: null }
    case 'hello':
      return { ...empty, work: 'hello', stage: 'hello' }
    case 'file.read.result':
    case 'file.diff.result':
      return { ...empty, work: 'file_result', stage: 'file_result' }
    case 'skill.read.result':
      return { ...empty, work: 'skill_result', stage: 'skill_result' }
    case 'repository.move.refused':
      return { ...empty, work: 'move_refused', stage: 'event' }
    case 'event':
      return {
        work: 'event',
        stage: 'event',
        eventType: warningEventType(
          isRecord(message.event) ? message.event.type : null,
        ),
        eventNumber: message.eventNumber,
        size,
      }
  }
}

/** The saved mark is storage data, so each value is read as unknown. */
function warnInterrupted(left: unknown): void {
  if (!isRecord(left)) return
  const text = (value: unknown) => (typeof value === 'string' ? value : '')
  const number = (value: unknown) => (typeof value === 'number' ? value : null)
  const stream = (value: unknown) =>
    value === null || value === undefined
      ? null
      : WarningStreamId.checked(text(value))
  warnWorker({
    kind: 'runner_work_interrupted',
    workspaceId: WarningId.checked(text(left.workspaceId)),
    connectionId: WarningId.checked(text(left.connectionId)),
    streamId: stream(left.streamId),
    processStartId: stream(left.processStartId),
    protocolVersion: number(left.protocolVersion),
    work: RUNNER_WORK_KINDS.find((kind) => kind === left.work) ?? 'unknown',
    stage: RUNNER_MESSAGE_STAGES.find((stage) => stage === left.stage) ?? null,
    eventType: warningEventType(left.eventType),
    eventNumber: number(left.eventNumber),
    size: number(left.size),
  })
}

async function bestEffort(work: () => Promise<void>): Promise<boolean> {
  try {
    await work()
    return true
  } catch {
    return false
  }
}
