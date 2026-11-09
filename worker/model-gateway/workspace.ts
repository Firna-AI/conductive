import type { Session } from '../../src/shared/sessions'
import type { WorkspaceChat } from '../chat/backend'
import type { ChatOperation } from '../chat/operation'
import { unavailableLoginMessage } from '../chat/session-login'
import { TurnLifecycle } from '../chat/turn-lifecycle'
import { activeStoredTurn } from '../devices/access'
import type { AppEnv } from '../env'
import { randomToken } from '../security/crypto'
import { decryptGatewayLogin, gatewayLogin } from './login'
import { deriveTurnToken, turnTokenRoute, verifyTurnToken } from './token'
import type { TurnTokenCheck } from './types'

/** The token and decrypted login remain local to the current trusted call. */
export class WorkspaceTurnTokens {
  private readonly chat: WorkspaceChat
  private readonly env: AppEnv
  private readonly operation: (workspaceId: string) => ChatOperation
  private readonly randomId: () => string

  constructor(
    chat: WorkspaceChat,
    env: AppEnv,
    operation: (workspaceId: string) => ChatOperation,
    randomId: () => string,
  ) {
    this.chat = chat
    this.env = env
    this.operation = operation
    this.randomId = randomId
  }

  /** The dispatch caller holds the chat queue. This method does not enter it. */
  async forRunningTurn(
    workspaceId: string,
    turnId: string,
  ): Promise<string | null> {
    const turn = await activeStoredTurn(this.chat, workspaceId, turnId)
    if (!turn) return null
    if (!turn.gateway) {
      const session = await this.chat.store.read(workspaceId, (view) =>
        view.session(turn.sessionId),
      )
      if (!session) return null
      const login = await gatewayLogin(
        this.env,
        workspaceId,
        session.startedBy?.id ?? null,
        session.choice.agent,
      )
      if (!login) return null
      turn.gateway = { nonce: randomToken(), loginVersion: login.updatedAt }
      await this.operation(workspaceId).change((transaction) =>
        transaction.saveTurn(turn),
      )
    }
    return deriveTurnToken(
      { workspaceId, turnId },
      turn.gateway,
      this.env.BOAT_KEY_ENCRYPTION_KEY,
    )
  }

  check(workspaceId: string, token: string): Promise<TurnTokenCheck> {
    return this.chat.runLifecycle(async () => {
      const route = turnTokenRoute(token)
      if (!route || route.workspaceId !== workspaceId)
        return { ok: false, reason: 'turn_token_invalid' }
      const turn = await this.chat.store.read(workspaceId, (view) =>
        view.turn(route.turnId),
      )
      if (
        !turn?.gateway ||
        !(await verifyTurnToken(
          token,
          route,
          turn.gateway,
          this.env.BOAT_KEY_ENCRYPTION_KEY,
        ))
      )
        return { ok: false, reason: 'turn_token_invalid' }
      if (!(await activeStoredTurn(this.chat, workspaceId, turn.id)))
        return { ok: false, reason: 'turn_not_active' }
      const operation = this.operation(workspaceId)
      const session = await operation.read((view) =>
        view.session(turn.sessionId),
      )
      if (!session) return { ok: false, reason: 'turn_not_active' }
      const login = await gatewayLogin(
        this.env,
        workspaceId,
        session.startedBy?.id ?? null,
        session.choice.agent,
      )
      if (!login || login.updatedAt !== turn.gateway.loginVersion) {
        const reason = login ? 'agent_login_changed' : 'agent_login_unavailable'
        const message = login
          ? changedLoginMessage(session)
          : unavailableLoginMessage({ ...session, loginAvailable: false })
        await this.fail(operation, turn.id, message)
        return { ok: false, reason }
      }
      return { ok: true, login: await decryptGatewayLogin(this.env, login) }
    })
  }

  private async fail(
    operation: ChatOperation,
    turnId: string,
    message: string,
  ): Promise<void> {
    await operation.change(async (transaction) => {
      const turn = await transaction.turn(turnId)
      const session = turn ? await transaction.session(turn.sessionId) : null
      if (!turn || !session) return
      await new TurnLifecycle(transaction, session).fail(
        turnId,
        message,
        this.randomId,
      )
    })
    await this.chat.flushRunner()
  }
}

function changedLoginMessage(session: Session): string {
  const starter = session.startedBy
  const owner = starter
    ? `${starter.displayName ?? starter.githubLogin}'s`
    : "The session's"
  const agent = session.choice.agent === 'claude' ? 'Claude' : 'Codex'
  return `${owner} ${agent} login changed. Try again to use the new login.`
}
