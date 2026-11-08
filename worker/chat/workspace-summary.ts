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
}

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

/** The projection commits with the event cursor and turn records. */
export class WorkspaceSummaryProjection {
  private loaded: Promise<SummaryProjection> | undefined
  private readonly data: ChatData
  private readonly turns: () => Promise<StoredTurn[]>
  private readonly history: () => Promise<ChatHistoryResponse>

  constructor(
    data: ChatData,
    turns: () => Promise<StoredTurn[]>,
    history: () => Promise<ChatHistoryResponse>,
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
    const stored = await this.data.get<SummaryProjection>(SUMMARY_KEY)
    if (stored) return stored
    const [turns, history] = await Promise.all([this.turns(), this.history()])
    const projection = {
      lastOutputEventNumber:
        history.events.filter(isOutput).at(-1)?.eventNumber ?? 0,
      activeTurns: turns
        .filter((turn) => turn.state === 'running' || turn.state === 'stopping')
        .map((turn) => turn.id),
    }
    await this.data.put(SUMMARY_KEY, projection)
    return projection
  }

  async turn(turn: StoredTurn): Promise<void> {
    const projection = await this.load()
    const ids = new Set(projection.activeTurns)
    if (turn.state === 'running' || turn.state === 'stopping') ids.add(turn.id)
    else ids.delete(turn.id)
    projection.activeTurns = [...ids]
    await this.data.put(SUMMARY_KEY, projection)
  }

  async event(envelope: WorkspaceEventEnvelope): Promise<void> {
    const projection = await this.load()
    if (isOutput(envelope)) {
      projection.lastOutputEventNumber = envelope.eventNumber
      await this.data.put(SUMMARY_KEY, projection)
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
