import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import { TEST_TIME } from '../test-support/harness'
import type { GitHubRefreshRequest, GitHubStatePort } from './contracts'
import { WorkspaceGitHubState } from './workspace-state'

export class MemoryWorkspace {
  values = new Map<string, unknown>()
  events: WorkspaceEventEnvelope[] = []
  published: WorkspaceEventEnvelope[] = []
  scheduled: { request: GitHubRefreshRequest; delayMs: number }[] = []
  failPublish = false
  state: WorkspaceGitHubState
  private readonly port: GitHubStatePort

  constructor(workspaceId: string) {
    this.port = {
      transaction: async (action) => {
        const pending = new Map(this.values)
        const transaction = {
          get: async <T>(key: string) =>
            structuredClone(pending.get(key)) as T | undefined,
          put: async <T>(key: string, value: T) => {
            pending.set(key, structuredClone(value))
          },
        }
        const result = await action(transaction)
        this.values = pending
        return result
      },
      appendEvent: async (transaction, event) => {
        const cursor =
          (await transaction.get<number>('workspace:event-number')) ?? 0
        const envelope = {
          workspaceId,
          eventNumber: cursor + 1,
          occurredAt: TEST_TIME,
          event,
        }
        await transaction.put('workspace:event-number', envelope.eventNumber)
        await transaction.put(
          `workspace:event:${envelope.eventNumber}`,
          envelope,
        )
        this.events.push(envelope)
        return envelope
      },
      publish: async (envelope) => {
        if (this.failPublish) throw new Error('Test broadcast failed')
        this.published.push(envelope)
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
