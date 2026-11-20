import type { Session } from '../../src/shared/generated/Session'

import type { AgentLoginKind } from '../chat/login-kind'
import type { WorkspaceChat } from '../chat/backend'
import type { ChatOperation } from '../chat/operation'
import { loginOwnerLabel, unavailableLoginMessage } from '../chat/session-login'
import { TurnLifecycle } from '../chat/turn-lifecycle'
import { activeStoredTurn } from '../devices/access'
import type { AppEnv } from '../env'
import { randomToken } from '../security/crypto'
import { decryptGatewayLogin, gatewayLogin } from './login'
import {
  deriveTurnToken,
  turnTokenMatchesKind,
  turnTokenRoute,
  verifyTurnToken,
} from './token'
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
    expectedKind?: AgentLoginKind,
  ): Promise<string | null> {
    const turn = await activeStoredTurn(this.chat, workspaceId, turnId)
    if (!turn) return null
    const session = await this.chat.store.read(workspaceId, (view) =>
      view.session(turn.sessionId),
    )
    if (!session) return null
    const login = await gatewayLogin(
      this.env,
      workspaceId,
      session.login ?? null,
      session.choice.agent,
      turn.senderId,
    )
    if (
      !login ||
      (turn.gateway && login.updatedAt !== turn.gateway.loginVersion) ||
      (expectedKind &&
        (expectedKind.agent !== login.loginKind.agent ||
          expectedKind.kind !== login.loginKind.kind))
    ) {
      await this.fail(
        this.operation(workspaceId),
        turn.id,
        login
          ? changedLoginMessage(session, login.orgName)
          : unavailableLoginMessage(
              { ...session, loginAvailable: false },
              session.login?.type === 'org'
                ? await this.env.DB.prepare(
                    'SELECT name FROM orgs WHERE id = ?',
                  )
                    .bind(session.login.orgId)
                    .first<string>('name')
                : null,
            ),
        false,
      )
      return null
    }
    if (!turn.gateway) {
      turn.gateway = { nonce: randomToken(), loginVersion: login.updatedAt }
      await this.operation(workspaceId).change((transaction) =>
        transaction.saveTurn(turn),
      )
    }
    return deriveTurnToken(
      { workspaceId, turnId },
      turn.gateway,
      this.env.BOAT_KEY_ENCRYPTION_KEY,
      login.loginKind,
    )
  }

  async check(
    workspaceId: string,
    token: string,
    claimCodexRecovery?: true | 'complete',
  ): Promise<TurnTokenCheck> {
    if (!claimCodexRecovery) {
      try {
        const checked = await this.checkCurrent(
          workspaceId,
          token,
          undefined,
          true,
        )
        if (checked.ok) return checked
      } catch {
        // The queued check owns every refusal and write.
      }
    }
    return this.chat.runLifecycle(() =>
      this.checkCurrent(workspaceId, token, claimCodexRecovery),
    )
  }

  private async checkCurrent(
    workspaceId: string,
    token: string,
    claimCodexRecovery?: true | 'complete',
    readOnly = false,
  ): Promise<TurnTokenCheck> {
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
    const session = await this.chat.store.read(workspaceId, (view) =>
      view.session(turn.sessionId),
    )
    if (!session) return { ok: false, reason: 'turn_not_active' }
    const login = await gatewayLogin(
      this.env,
      workspaceId,
      session.login ?? null,
      session.choice.agent,
      turn.senderId,
    )
    if (!login || login.updatedAt !== turn.gateway.loginVersion) {
      const reason = login ? 'agent_login_changed' : 'agent_login_unavailable'
      const message = login
        ? changedLoginMessage(session, login.orgName)
        : unavailableLoginMessage(
            { ...session, loginAvailable: false },
            session.login?.type === 'org'
              ? await this.env.DB.prepare('SELECT name FROM orgs WHERE id = ?')
                  .bind(session.login.orgId)
                  .first<string>('name')
              : null,
          )
      if (!readOnly)
        await this.fail(this.operation(workspaceId), turn.id, message)
      return { ok: false, reason }
    }
    if (!turnTokenMatchesKind(token, login.loginKind))
      return { ok: false, reason: 'turn_token_invalid' }
    const codexRecoveryClaimed =
      claimCodexRecovery === true &&
      login.loginKind.agent === 'codex' &&
      login.loginKind.kind === 'token' &&
      turn.gateway.codexRecoveryUsed !== true
    if (codexRecoveryClaimed) {
      turn.gateway.codexRecoveryUsed = true
      turn.gateway.codexRecoveryPending = true
      await this.operation(workspaceId).change((transaction) =>
        transaction.saveTurn(turn),
      )
    }
    if (claimCodexRecovery === 'complete' && turn.gateway.codexRecoveryUsed) {
      turn.gateway.codexRecoveryPending = false
      await this.operation(workspaceId).change((transaction) =>
        transaction.saveTurn(turn),
      )
    }
    const decrypted = await decryptGatewayLogin(this.env, login)
    if (!decrypted) return { ok: false, reason: 'agent_login_unavailable' }
    return {
      ok: true,
      login: decrypted,
      ...(claimCodexRecovery
        ? {
            codexRecoveryClaimed,
            codexRecoveryPending: turn.gateway.codexRecoveryPending === true,
          }
        : {}),
      ...(login.loginKind.agent === 'codex' && login.loginKind.kind === 'token'
        ? {
            loginOwnerId:
              login.owner.type === 'personal' ? login.owner.userId : undefined,
          }
        : {}),
    }
  }

  private async fail(
    operation: ChatOperation,
    turnId: string,
    message: string,
    flush = true,
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
    if (flush) await this.chat.flushRunner()
  }
}

function changedLoginMessage(session: Session, orgName: string | null): string {
  const owner = loginOwnerLabel(session, orgName)
  const agent = session.choice.agent === 'claude' ? 'Claude' : 'Codex'
  return `${owner} ${agent} login changed. Try again to use the new login.`
}
