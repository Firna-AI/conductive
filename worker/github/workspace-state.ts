import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import type {
  GitHubRefresh,
  GitHubRefreshRequest,
  GitHubSnapshot,
  GitHubStatePort,
} from './contracts'
import { sameDisplay } from './display'

interface DeliveryReceipt {
  snapshot: GitHubSnapshot
  envelope: WorkspaceEventEnvelope | null
}

/** Keep one instance per workspace DO. Reads and commits share its queue. */
export class WorkspaceGitHubState {
  private pending: Promise<unknown> = Promise.resolve()
  private readonly port: GitHubStatePort

  constructor(port: GitHubStatePort) {
    this.port = port
  }

  refresh(
    read: () => Promise<GitHubSnapshot | null>,
    authorize: () => Promise<void>,
    signal: GitHubRefresh = {},
  ): Promise<GitHubSnapshot | null> {
    const result = this.pending.then(async () => {
      await authorize()
      const key =
        signal.deliveryId === undefined
          ? null
          : `github:delivery:${signal.deliveryId}`
      const receipt =
        key === null
          ? undefined
          : await this.port.transaction((transaction) =>
              transaction.get<DeliveryReceipt>(key),
            )
      if (receipt) {
        await authorize()
        if (receipt.envelope !== null) await this.port.publish(receipt.envelope)
        return receipt.snapshot
      }
      const snapshot = await read()
      await authorize()
      if (snapshot === null) return null
      const envelope = await this.port.transaction(async (transaction) => {
        const stored = await transaction.get<GitHubSnapshot>('github:state')
        if (stored && sameDisplay(stored, snapshot)) {
          if (key !== null)
            await transaction.put(key, {
              snapshot,
              envelope: null,
            } satisfies DeliveryReceipt)
          return null
        }
        await transaction.put('github:state', snapshot)
        const envelope = await this.port.appendEvent(transaction, {
          type: 'github.updated',
          banner: snapshot.banner,
          checks: snapshot.checks,
        })
        if (key !== null)
          await transaction.put(key, {
            snapshot,
            envelope,
          } satisfies DeliveryReceipt)
        return envelope
      })
      if (envelope !== null) await this.port.publish(envelope)
      return snapshot
    })
    this.pending = result.catch(() => undefined)
    return result
  }

  scheduleRefresh(
    request: GitHubRefreshRequest,
    delayMs: number,
  ): Promise<void> {
    return this.port.scheduleRefresh(request, delayMs)
  }
}
