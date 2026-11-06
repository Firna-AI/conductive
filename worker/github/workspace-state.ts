import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import { HttpError } from '../http'
import { GitHubReader } from './client'
import type {
  GitHubReadDependencies,
  GitHubRefresh,
  GitHubSnapshot,
  GitHubStatePort,
  GitHubWorkspace,
} from './contracts'
import { activeWorkspace } from './data'

interface DeliveryReceipt {
  snapshot: GitHubSnapshot
  envelope: WorkspaceEventEnvelope
}

/** Keep one instance per workspace DO. Reads and commits share its queue. */
export class WorkspaceGitHubState {
  private pending: Promise<unknown> = Promise.resolve()
  private readonly port: GitHubStatePort

  constructor(port: GitHubStatePort) {
    this.port = port
  }

  refresh(
    read: () => Promise<GitHubSnapshot>,
    authorize: () => Promise<void>,
    signal: GitHubRefresh = {},
  ): Promise<GitHubSnapshot> {
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
        await this.port.publish(receipt.envelope)
        return receipt.snapshot
      }
      const snapshot = await read()
      await authorize()
      if (signal.headSha !== undefined && signal.headSha !== snapshot.headSha)
        return snapshot
      const envelope = await this.port.transaction(async (transaction) => {
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
      await this.port.publish(envelope)
      return snapshot
    })
    this.pending = result.catch(() => undefined)
    return result
  }
}

/** Call inside the workspace DO. It rechecks access before reads and commits. */
export async function refreshWorkspace(
  db: D1Database,
  workspace: GitHubWorkspace,
  signal: GitHubRefresh,
  state: WorkspaceGitHubState,
  dependencies: GitHubReadDependencies,
): Promise<GitHubSnapshot> {
  const authorize = async () => {
    const current = await activeWorkspace(
      db,
      workspace.id,
      workspace.orgId,
      signal.userId,
    )
    if (
      !current ||
      current.repositoryId !== workspace.repositoryId ||
      current.installationId !== workspace.installationId ||
      current.branch !== workspace.branch
    ) {
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    }
  }
  return state.refresh(
    async () => {
      const token = await dependencies.token(workspace)
      await authorize()
      const reads = {
        ...dependencies,
        fetch: async (request: Request) => {
          await authorize()
          return dependencies.fetch(request)
        },
      }
      try {
        return await new GitHubReader(reads, workspace, token).read()
      } catch (error) {
        await authorize()
        throw error
      }
    },
    authorize,
    signal,
  )
}
