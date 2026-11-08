import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { Agent } from '../../src/shared/agents'
import { FILE_EVENT_MAX_BYTES } from '../../src/shared/files'
import {
  RUNNER_EVENT_MAX_BYTES,
  type RunnerEvent,
  type RunnerEventEnvelope,
} from '../../src/shared/runner'
import { jsonBytes } from './event-limits'
import { parseEnvelope, parseEvent } from './stored-events'
import { array, integer, object, oneOf, string } from './parse'
import {
  parseSavedTurn,
  pendingTurnEnd,
  recordTurn,
  turnKey,
  type SavedTurn,
} from './state-turns'
import { SerialQueue } from './serial-queue'
import {
  emptyReports,
  parseReports,
  retainReport,
  type ReportState,
  type RetainedReport,
  type RetainedReportKind,
} from './report-state'

export interface SavedSession {
  sessionId: string
  agent: Agent
  providerSessionId: string | null
}

export interface RunnerState {
  streamId: string
  nextEventNumber: number
  confirmedThrough: number
  outbox: RunnerEventEnvelope[]
  sessions: SavedSession[]
  fileRevisions: FileRevisions
  turns: SavedTurn[]
  reports: ReportState
}

export interface FileRevisions {
  tree: number
  changes: number
}

export class DiskStorage {
  private readonly path: string
  constructor(path: string) {
    this.path = path
  }

  async read(): Promise<unknown | null> {
    try {
      return JSON.parse(await readFile(this.path, 'utf8'))
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        return null
      throw new Error('The saved runner state cannot be read.', {
        cause: error,
      })
    }
  }

  async write(value: RunnerState): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 })
    const temporary = `${this.path}.next`
    await writeFile(temporary, JSON.stringify(value), { mode: 0o600 })
    await rename(temporary, this.path)
  }
}

function parseState(value: unknown): RunnerState {
  const input = object(value)
  const revisions = object(input.fileRevisions)
  const state: RunnerState = {
    streamId: string(input.streamId),
    nextEventNumber: integer(input.nextEventNumber),
    confirmedThrough: integer(input.confirmedThrough),
    fileRevisions: {
      tree: integer(revisions.tree),
      changes: integer(revisions.changes),
    },
    outbox: array(input.outbox, parseEnvelope),
    turns: array(input.turns, parseSavedTurn),
    reports: parseReports(input.reports),
    sessions: array(input.sessions, (value) => {
      const session = object(value)
      return {
        sessionId: string(session.sessionId),
        agent: oneOf(session.agent, ['claude', 'codex']),
        providerSessionId:
          session.providerSessionId === null
            ? null
            : string(session.providerSessionId),
      }
    }),
  }
  let expected = state.confirmedThrough + 1
  for (const item of state.outbox) {
    if (item.streamId !== state.streamId || item.eventNumber !== expected++) {
      throw new Error('The saved runner outbox is not contiguous.')
    }
  }
  if (state.nextEventNumber !== expected)
    throw new Error('The saved runner counter does not match its outbox.')
  return state
}

/** Store events, conversation references, and report receipts. Never logins. */
export class EventStore {
  private state: RunnerState
  private committed: RunnerState
  private readonly storage: DiskStorage
  private readonly writes = new SerialQueue()

  private constructor(storage: DiskStorage, state: RunnerState) {
    this.storage = storage
    this.state = state
    this.committed = structuredClone(state)
  }

  static async open(storage: DiskStorage): Promise<EventStore> {
    const saved = await storage.read()
    const state =
      saved === null
        ? {
            streamId: randomUUID(),
            nextEventNumber: 1,
            confirmedThrough: 0,
            outbox: [],
            sessions: [],
            fileRevisions: { tree: 0, changes: 0 },
            turns: [],
            reports: emptyReports(),
          }
        : parseState(saved)
    const store = new EventStore(storage, state)
    await store.save()
    return store
  }

  get snapshot(): RunnerState {
    return structuredClone(this.committed)
  }

  async append(
    event: RunnerEvent,
    occurredAt: number,
    reportCommandId?: string,
  ): Promise<RunnerEventEnvelope | null> {
    const pendingEnd = pendingTurnEnd(
      this.state.turns,
      this.state.outbox,
      event,
    )
    if (pendingEnd) {
      await this.save()
      return structuredClone(pendingEnd)
    }
    const envelope: RunnerEventEnvelope = {
      type: 'event',
      streamId: this.state.streamId,
      eventNumber: this.state.nextEventNumber,
      occurredAt,
      event: parseEvent(event),
    }
    const file =
      event.type === 'files.snapshot' ||
      event.type === 'files.changed' ||
      event.type === 'changes.updated'
    if (
      jsonBytes(envelope) > RUNNER_EVENT_MAX_BYTES ||
      (file && jsonBytes(envelope.event) > FILE_EVENT_MAX_BYTES)
    )
      return null
    this.state.nextEventNumber++
    if (event.type === 'files.snapshot')
      this.state.fileRevisions.tree = event.tree.revision
    if (event.type === 'files.changed')
      this.state.fileRevisions.tree = event.delta.revision
    if (event.type === 'changes.updated')
      this.state.fileRevisions.changes = event.changes.revision
    this.state.outbox.push(envelope)
    recordTurn(
      this.state.turns,
      envelope.event,
      envelope.eventNumber,
      occurredAt,
    )
    retainReport(this.state.reports, envelope.event)
    if (reportCommandId !== undefined)
      this.state.reports.commands.push(reportCommandId)
    await this.save()
    return structuredClone(envelope)
  }

  async confirm(through: number): Promise<void> {
    if (through < this.state.confirmedThrough) return
    if (through >= this.state.nextEventNumber)
      throw new Error('The confirmation exceeds the runner counter.')
    this.state.confirmedThrough = through
    this.state.outbox = this.state.outbox.filter(
      (item) => item.eventNumber > through,
    )
    this.state.turns = this.state.turns.filter(
      (turn) => turn.endEventNumber === null || turn.endEventNumber > through,
    )
    await this.save()
  }

  async remember(session: SavedSession): Promise<void> {
    this.state.sessions = this.state.sessions.filter(
      (item) => item.sessionId !== session.sessionId,
    )
    this.state.sessions.push(structuredClone(session))
    await this.save()
  }

  async acceptTurn(
    turn: Omit<SavedTurn, 'startEventNumber' | 'endEventNumber'>,
  ): Promise<void> {
    if (!this.state.turns.some((saved) => turnKey(saved) === turnKey(turn)))
      this.state.turns.push({
        ...structuredClone(turn),
        startEventNumber: null,
        endEventNumber: null,
      })
    await this.save()
  }

  persist(): Promise<void> {
    return this.save()
  }

  async rememberReportCommand(commandId: string): Promise<void> {
    this.state.reports.commands.push(commandId)
    await this.save()
  }

  /** Select current pending state and append its filtered copy without yielding. */
  async refreshReport(
    kind: RetainedReportKind,
    commandId: string,
    occurredAt: number,
    prepare: (report: RetainedReport) => RetainedReport,
  ): Promise<RunnerEventEnvelope | null | undefined> {
    const report = this.state.reports.latest[kind]
    if (report === null) {
      await this.rememberReportCommand(commandId)
      return
    }
    return this.append(prepare(structuredClone(report)), occurredAt, commandId)
  }

  private save(): Promise<void> {
    const snapshot = structuredClone(this.state)
    return this.writes.run(async () => {
      await this.storage.write(snapshot)
      this.committed = structuredClone(snapshot)
    })
  }
}
