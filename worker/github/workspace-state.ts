import { sameGitHubState } from '../../src/shared/github-state'
import { githubUpdated, type GitHubDeliveryReceipt } from './delivery-receipt'
import type {
  GitHubRefresh,
  GitHubRefreshRequest,
  GitHubSnapshot,
  GitHubStatePort,
} from './contracts'

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
          : await this.port.read<GitHubDeliveryReceipt>(key)
      if (receipt) {
        await authorize()
        await this.port.run(authorize, async (operation) => {
          if (receipt.envelope !== null)
            await operation.publish({
              ...receipt.envelope,
              event: githubUpdated(receipt.snapshot),
            })
        })
        return receipt.snapshot
      }
      const snapshot = await read()
      await authorize()
      if (snapshot === null) return null
      await this.port.run(authorize, (operation) =>
        operation.transaction(async (transaction) => {
          const stored = await transaction.get<GitHubSnapshot>('github:state')
          if (stored && sameGitHubState(stored, snapshot)) {
            if (key !== null)
              await transaction.put(key, {
                snapshot,
                envelope: null,
              } satisfies GitHubDeliveryReceipt)
            return
          }
          await transaction.put('github:state', snapshot)
          const { workspaceId, eventNumber, occurredAt } =
            await transaction.emit(githubUpdated(snapshot))
          if (key !== null)
            await transaction.put(key, {
              snapshot,
              envelope: { workspaceId, eventNumber, occurredAt },
            } satisfies GitHubDeliveryReceipt)
        }),
      )
      return snapshot
    })
    this.pending = result.catch(() => undefined)
    return result
  }

  /** The last committed snapshot. Read it inside a refresh read. */
  stored(): Promise<GitHubSnapshot | undefined> {
    return this.port.read<GitHubSnapshot>('github:state')
  }

  scheduleRefresh(
    request: GitHubRefreshRequest,
    delayMs: number,
  ): Promise<void> {
    return this.port.scheduleRefresh(request, delayMs)
  }
}
