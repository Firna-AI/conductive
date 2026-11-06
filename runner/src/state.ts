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
}

export interface FileRevisions {
  tree: number
  changes: number
}

export interface StateStorage {
  read(): Promise<unknown | null>
  write(value: RunnerState): Promise<void>
}

export class DiskStorage implements StateStorage {
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

/** Only events and conversation references enter this store. Never commands. */
export class EventStore {
  private state: RunnerState
  private committed: RunnerState
  private readonly storage: StateStorage
  private writes: Promise<void> = Promise.resolve()

  private constructor(storage: StateStorage, state: RunnerState) {
    this.storage = storage
    this.state = state
    this.committed = structuredClone(state)
  }

  static async open(storage: StateStorage): Promise<EventStore> {
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
  ): Promise<RunnerEventEnvelope | null> {
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
    await this.save()
  }

  async remember(session: SavedSession): Promise<void> {
    this.state.sessions = this.state.sessions.filter(
      (item) => item.sessionId !== session.sessionId,
    )
    this.state.sessions.push(structuredClone(session))
    await this.save()
  }

  private save(): Promise<void> {
    const snapshot = structuredClone(this.state)
    this.writes = this.writes.then(async () => {
      await this.storage.write(snapshot)
      this.committed = structuredClone(snapshot)
    })
    return this.writes
  }
}
