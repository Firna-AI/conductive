import type { RunnerRepository } from '../../src/shared/generated/RunnerRepository'
import { warnWorker } from '../warnings'
import { WarningId } from '../warning-values'
import type { IncomingRepositoryMoveRefused } from './runner-input'
import type { ChatStore } from './store'
import { TurnCompletion } from './turn-completion'
import type { ActiveRunner, ChatDependencies } from './types'
import type { WorkspaceEventEnvelope } from './workspace-events'

/** The move of one runner connection. A new connection starts without one. */
export interface RepositoryMoveState {
  commandId: string
  folder: string
  refused: boolean
}

export type RepositoryCheck =
  | { state: 'ready'; repository: RunnerRepository | null }
  | { state: 'wait' }
  | { state: 'refused' }

const REFUSED = {
  code: 'workspace_repository_unavailable',
  message:
    "The agent could not open the folder of the workspace's repository in this cloud computer.",
}

/** Fail a waiting turn, because its agent would work in another folder. */
export async function failRepositoryTurn(
  store: ChatStore,
  publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  workspaceId: string,
  turnId: string,
): Promise<void> {
  await store.change(
    workspaceId,
    async (transaction) => {
      const turn = await transaction.turn(turnId)
      if (turn?.state !== 'queued') return
      const session = await transaction.session(turn.sessionId)
      if (session?.activeTurnId !== turn.id) return
      const retryMessageId = turn.messageIds[0]
      if (!retryMessageId) return
      await transaction.emit({
        type: 'turn.failed',
        sessionId: session.id,
        turnId: turn.id,
        error: REFUSED,
        retryMessageId,
        durationMs: 0,
      })
      await new TurnCompletion(transaction, session).finish(turn, {
        state: 'failed',
        retryMessageId,
        error: REFUSED,
      })
    },
    publish,
  )
}

/**
 * Keeps the runner in the folder of the workspace's repository. Only a
 * runner whose hello names its folder gets `repository.move`, because an
 * older runner closes its socket on an unknown command. The move goes only
 * to a runner in the stored folder of another repository, as after a
 * repository change. A good move ends with a new hello that names the
 * record folder.
 */
export class RepositoryMoves {
  private readonly dependencies: Pick<
    ChatDependencies,
    'readRepository' | 'readBranches' | 'randomId'
  >
  private readonly persist: (active: ActiveRunner) => Promise<void>

  constructor(
    dependencies: Pick<
      ChatDependencies,
      'readRepository' | 'readBranches' | 'randomId'
    >,
    persist: (active: ActiveRunner) => Promise<void>,
  ) {
    this.dependencies = dependencies
    this.persist = persist
  }

  /** Turns wait while the folders differ. One move goes to each connection. */
  async check(active: ActiveRunner): Promise<RepositoryCheck> {
    if (active.state.repositoryFolder === undefined)
      return { state: 'ready', repository: null }
    const record = await this.dependencies.readRepository(
      active.state.workspace.id,
    )
    if (!record) return { state: 'ready', repository: null }
    const { repository, folders } = record
    if (repository.folder === active.state.repositoryFolder)
      return { state: 'ready', repository }
    // A folder outside the stored folders comes from older start variables,
    // not from a repository change. The runner keeps it, as before.
    if (!folders.includes(active.state.repositoryFolder))
      return { state: 'ready', repository: null }
    const move = active.state.repositoryMove
    if (move?.refused) return { state: 'refused' }
    if (move?.folder === repository.folder) return { state: 'wait' }
    const branches = await this.dependencies.readBranches(
      active.state.workspace.id,
    )
    if (!branches) return { state: 'wait' }
    const commandId = this.dependencies.randomId()
    active.state.repositoryMove = {
      commandId,
      folder: repository.folder,
      refused: false,
    }
    // Save before the send, so a wake cannot repeat the move on this socket.
    await this.persist(active)
    await active.peer.send({
      type: 'repository.move',
      commandId,
      folder: repository.folder,
      branches,
    })
    return { state: 'wait' }
  }

  /** A refused move keeps the runner in its folder until the next hello. */
  async refused(
    active: ActiveRunner,
    reply: IncomingRepositoryMoveRefused,
  ): Promise<void> {
    warnWorker({
      kind: 'runner_repository_move_refused',
      workspaceId: WarningId.checked(active.state.workspace.id),
      reason: reply.reason,
    })
    active.state.repositoryMove = {
      commandId: reply.commandId,
      folder: active.state.repositoryMove?.folder ?? '',
      refused: true,
    }
    await this.persist(active)
  }
}
