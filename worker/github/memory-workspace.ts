import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import { TEST_TIME } from '../test-support/harness'
import type {
  GitHubRefreshRequest,
  GitHubStateOperation,
  GitHubStatePort,
  GitHubStateTransaction,
} from './contracts'
import { WorkspaceGitHubState } from './workspace-state'

export class MemoryWorkspace {
  values = new Map<string, unknown>()
  events: WorkspaceEventEnvelope[] = []
  published: WorkspaceEventEnvelope[] = []
  scheduled: { request: GitHubRefreshRequest; delayMs: number }[] = []
  failPublish = false
  failWritePrefix: string | null = null
  valueByteLimit: number | null = null
  state: WorkspaceGitHubState
  private readonly port: GitHubStatePort

  constructor(workspaceId: string) {
    const publish = async (envelope: WorkspaceEventEnvelope) => {
      if (this.failPublish) throw new Error('Test broadcast failed')
      this.published.push(envelope)
    }
    const transaction: GitHubStateOperation['transaction'] = async (action) => {
      const pending = new Map(this.values)
      const pendingEvents: WorkspaceEventEnvelope[] = []
      const transaction: GitHubStateTransaction = {
        get: async <T>(key: string) =>
          structuredClone(pending.get(key)) as T | undefined,
        put: async <T>(key: string, value: T) => {
          if (
            this.failWritePrefix !== null &&
            key.startsWith(this.failWritePrefix)
          )
            throw new Error('Test storage write failed')
          if (
            this.valueByteLimit !== null &&
            new TextEncoder().encode(JSON.stringify(value)).byteLength >
              this.valueByteLimit
          )
            throw new Error('Test storage value exceeds its byte limit')
          pending.set(key, structuredClone(value))
        },
        emit: async (event) => {
          const cursor =
            (await transaction.get<number>('workspace:event-number')) ?? 0
          const envelope = {
            workspaceId,
            eventNumber: cursor + 1,
            occurredAt: TEST_TIME,
            event: structuredClone(event),
          }
          await transaction.put('workspace:event-number', envelope.eventNumber)
          await transaction.put(
            `workspace:event:${envelope.eventNumber}`,
            envelope,
          )
          pendingEvents.push(envelope)
          return envelope
        },
      }
      const result = await action(transaction)
      this.values = pending
      this.events.push(...pendingEvents)
      for (const envelope of pendingEvents) await publish(envelope)
      return result
    }
    this.port = {
      read: async <T>(key: string) =>
        structuredClone(this.values.get(key)) as T | undefined,
      run: async (authorize, work) => {
        await authorize()
        return work({ transaction, publish })
      },
      scheduleRefresh: async (request, delayMs) => {
        this.scheduled.push({ request: structuredClone(request), delayMs })
      },
    }
    this.state = new WorkspaceGitHubState(this.port)
  }

  restart() {
    this.state = new WorkspaceGitHubState(this.port)
  }
}
