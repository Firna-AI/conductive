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
  private readonly shared = new Map<string, Promise<GitHubSnapshot | null>>()

  constructor(port: GitHubStatePort) {
    this.port = port
  }

  refresh(
    read: () => Promise<GitHubSnapshot | null>,
    authorize: () => Promise<void>,
    signal: GitHubRefresh = {},
    copy?: (snapshot: GitHubSnapshot) => Promise<void>,
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
        await this.copyCurrent(authorize, copy)
        return receipt.snapshot
      }
      const snapshot = await read()
      await authorize()
      if (snapshot === null) return null
      await this.port.run(authorize, (operation) =>
        operation.transaction(async (transaction) => {
          const stored = await transaction.get<GitHubSnapshot>('github:state')
          if (stored && sameGitHubState(stored, snapshot)) {
            if (stored.baseChange && !snapshot.baseChange)
              await transaction.put('github:state', snapshot)
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
      await this.copyCurrent(authorize, copy)
      return snapshot
    })
    this.pending = result.catch(() => undefined)
    return result
  }

  /**
   * Runs `read`, or joins the read of the same key that has not ended. The
   * queue runs one refresh at a time, and the next one starts only after
   * the shared read ends. So no other state commits between the start of a
   * shared read and its end, and a joined reply is as new as each state that
   * committed before the join.
   */
  share(
    key: string,
    read: () => Promise<GitHubSnapshot | null>,
  ): Promise<GitHubSnapshot | null> {
    const running = this.shared.get(key)
    if (running) return running
    const result = read()
    this.shared.set(key, result)
    const end = () => {
      if (this.shared.get(key) === result) this.shared.delete(key)
    }
    result.then(end, end)
    return result
  }

  private async copyCurrent(
    authorize: () => Promise<void>,
    copy: ((snapshot: GitHubSnapshot) => Promise<void>) | undefined,
  ): Promise<void> {
    if (!copy) return
    // An old receipt can replay a snapshot that D1 must not copy.
    const committed = await this.stored()
    if (!committed) return
    await authorize()
    await copy(committed)
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
