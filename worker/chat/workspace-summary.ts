import type {
  ChatHistoryResponse,
  WorkspaceEventEnvelope,
} from '../../src/shared/events'
import type { ChatData, StoredTurn } from './types'

export interface ChatWorkspaceSummary {
  throughEventNumber: number
  lastOutputEventNumber: number
  working: boolean
}

interface SummaryProjection {
  lastOutputEventNumber: number
  activeTurns: string[]
  lastTurnEndedAt: number | null
  title: { name: string; occurredAt: number } | null
}

export interface ChatLifecycleRecoverySummary {
  activeTurnIds: readonly string[]
  lastTurnEndedAt: number | null
  title: SummaryProjection['title']
}

type StoredSummary = Pick<
  SummaryProjection,
  'lastOutputEventNumber' | 'activeTurns'
> &
  Partial<Pick<SummaryProjection, 'lastTurnEndedAt' | 'title'>>

const SUMMARY_KEY = 'chat:v1:workspace-summary'

function isOutput({ event }: WorkspaceEventEnvelope): boolean {
  switch (event.type) {
    case 'assistant.delta':
    case 'assistant.completed':
    case 'tool.updated':
    case 'turn.completed':
    case 'turn.failed':
      return true
    case 'runner.event-refused':
      return event.sessionId !== null || event.repairFailed === true
    default:
      return false
  }
}

function endedTurnId({ event }: WorkspaceEventEnvelope): string | null {
  if (event.type === 'turn.completed' || event.type === 'turn.failed')
    return event.turnId
  return event.type === 'runner.event-refused' &&
    (event.runnerEventType === 'turn.completed' ||
      event.runnerEventType === 'turn.failed')
    ? event.turnId
    : null
}

/** The projection commits with the event cursor and turn records. */
export class WorkspaceSummaryProjection {
  private loaded: Promise<SummaryProjection> | undefined
  private readonly data: ChatData
  private readonly turns: () => Promise<StoredTurn[]>
  private readonly history: (
    after: number,
    through?: number,
  ) => Promise<ChatHistoryResponse>
  private readonly endedTurns = new Set<string>()

  constructor(
    data: ChatData,
    turns: () => Promise<StoredTurn[]>,
    history: (after: number, through?: number) => Promise<ChatHistoryResponse>,
  ) {
    this.data = data
    this.turns = turns
    this.history = history
  }

  private load(): Promise<SummaryProjection> {
    this.loaded ??= this.initialize()
    return this.loaded
  }

  private async initialize(): Promise<SummaryProjection> {
    const stored = await this.data.get<StoredSummary>(SUMMARY_KEY)
    if (stored?.lastTurnEndedAt !== undefined && stored.title !== undefined)
      return {
        ...stored,
        lastTurnEndedAt: stored.lastTurnEndedAt,
        title: stored.title,
      }
    const turns = await this.turns()
    const projection: SummaryProjection = {
      lastOutputEventNumber: stored?.lastOutputEventNumber ?? 0,
      activeTurns:
        stored?.activeTurns ??
        turns
          .filter(
            (turn) => turn.state === 'running' || turn.state === 'stopping',
          )
          .map((turn) => turn.id),
      lastTurnEndedAt: null,
      title: null,
    }
    const started = new Set(
      turns.filter((turn) => turn.started).map((turn) => turn.id),
    )
    const ended = new Set<string>()
    let after = 0
    let through: number | undefined
    while (true) {
      const history = await this.history(after, through)
      through ??= history.throughEventNumber
      for (const envelope of history.events) {
        if (isOutput(envelope))
          projection.lastOutputEventNumber = Math.max(
            projection.lastOutputEventNumber,
            envelope.eventNumber,
          )
        if (envelope.event.type === 'workspace.title')
          projection.title = {
            name: envelope.event.name,
            occurredAt: envelope.occurredAt,
          }
        const turnId = endedTurnId(envelope)
        if (turnId && started.has(turnId) && !ended.has(turnId)) {
          ended.add(turnId)
          projection.lastTurnEndedAt = Math.max(
            projection.lastTurnEndedAt ?? 0,
            envelope.occurredAt,
          )
        }
      }
      if (!history.hasMore) break
      after = history.nextAfterEventNumber
    }
    await this.data.put(SUMMARY_KEY, projection)
    return projection
  }

  async turn(turn: StoredTurn, occurredAt: number): Promise<void> {
    const projection = await this.load()
    const ids = new Set(projection.activeTurns)
    if (turn.state === 'running' || turn.state === 'stopping') ids.add(turn.id)
    else if (ids.delete(turn.id) && !this.endedTurns.has(turn.id))
      projection.lastTurnEndedAt = Math.max(
        projection.lastTurnEndedAt ?? 0,
        occurredAt,
      )
    projection.activeTurns = [...ids]
    await this.data.put(SUMMARY_KEY, projection)
  }

  async event(envelope: WorkspaceEventEnvelope): Promise<void> {
    const projection = await this.load()
    const output = isOutput(envelope)
    if (output) projection.lastOutputEventNumber = envelope.eventNumber
    if (envelope.event.type === 'workspace.title')
      projection.title = {
        name: envelope.event.name,
        occurredAt: envelope.occurredAt,
      }
    const turnId = endedTurnId(envelope)
    if (turnId && projection.activeTurns.includes(turnId)) {
      this.endedTurns.add(turnId)
      projection.lastTurnEndedAt = Math.max(
        projection.lastTurnEndedAt ?? 0,
        envelope.occurredAt,
      )
    }
    if (output || envelope.event.type === 'workspace.title')
      await this.data.put(SUMMARY_KEY, projection)
  }

  async recovery(): Promise<ChatLifecycleRecoverySummary> {
    const projection = await this.load()
    return {
      activeTurnIds: projection.activeTurns,
      lastTurnEndedAt: projection.lastTurnEndedAt,
      title: projection.title,
    }
  }

  async read(throughEventNumber: number): Promise<ChatWorkspaceSummary> {
    const projection = await this.load()
    return {
      throughEventNumber,
      lastOutputEventNumber: projection.lastOutputEventNumber,
      working: projection.activeTurns.length !== 0,
    }
  }
}
