import type { Session } from '../../src/shared/generated/Session'
import type { SessionLogin } from '../../src/shared/generated/SessionLogin'
import type { Agent } from '../../src/shared/generated/Agent'

import { usableAgentLogin, type AgentLogin } from './login-kind'
import { LoginReuseDenied, readLogin } from './login-access'
import type { SessionLoginMetadata } from './login-availability'
import { publicLoginOwner } from './login-owner'
import type { ChatOperation } from './operation'
import { sessionFor } from './session-record'
import type { ChatDependencies } from './types'

const unavailableMetadata: SessionLoginMetadata = {
  loginAvailable: false,
  loginShared: false,
}

export class SessionLogins {
  private readonly operation: ChatOperation
  private readonly dependencies: ChatDependencies

  constructor(operation: ChatOperation, dependencies: ChatDependencies) {
    this.operation = operation
    this.dependencies = dependencies
  }

  static async initial(
    dependencies: ChatDependencies,
    sessionId: string,
    userId: string | undefined,
    agent: Agent,
    login?: SessionLogin | null,
  ): Promise<SessionLoginMetadata> {
    const metadata = await dependencies.readLoginMetadata([
      { sessionId, agent, ...(login ? { login } : { userId }) },
    ])
    return metadata.get(sessionId) ?? unavailableMetadata
  }

  static async resolve(
    dependencies: ChatDependencies,
    userId: string,
    agent: Agent,
  ) {
    let excluded: SessionLogin | undefined
    for (let attempt = 0; attempt < 2; attempt++) {
      const owner = await dependencies.resolveDefaultLogin(
        userId,
        agent,
        excluded,
      )
      if (!owner) return null
      const login = await readLogin(
        dependencies,
        owner,
        agent,
        undefined,
        userId,
      )
      const metadata = await SessionLogins.initial(
        dependencies,
        'default',
        undefined,
        agent,
        owner,
      )
      if (
        login &&
        metadata.loginAvailable &&
        usableAgentLogin(login, dependencies.refusedEndpointDomains())
      )
        return { owner, login }
      excluded = owner
    }
    return null
  }

  async observe(
    sessionId: string,
    runnerTokenHash?: string,
    senderId?: string,
  ) {
    const session = await this.operation.read((view) =>
      sessionFor(view, sessionId),
    )
    let owner =
      session.login ??
      (session.startedBy
        ? await this.dependencies.resolveDefaultLogin(
            session.startedBy.id,
            session.choice.agent,
          )
        : null)
    let login: AgentLogin | null
    try {
      login = await readLogin(
        this.dependencies,
        owner,
        session.choice.agent,
        runnerTokenHash,
        senderId,
      )
      if (!session.login && !login && owner && session.startedBy) {
        owner = await this.dependencies.resolveDefaultLogin(
          session.startedBy.id,
          session.choice.agent,
          owner,
        )
        login = await readLogin(
          this.dependencies,
          owner,
          session.choice.agent,
          runnerTokenHash,
          senderId,
        )
      }
    } catch (error) {
      if (!(error instanceof LoginReuseDenied)) throw error
      const defaultLogin = publicLoginOwner(session.login ? null : owner)
      await this.save(session, {
        loginAvailable: true,
        loginShared: false,
        ...(defaultLogin ? { defaultLogin } : {}),
      })
      return { session, owner, login: null, reason: undefined }
    }
    const invalidEndpoint =
      login?.kind === 'endpoint' &&
      !usableAgentLogin(login, this.dependencies.refusedEndpointDomains())
    const metadata =
      login && owner && !invalidEndpoint
        ? await SessionLogins.initial(
            this.dependencies,
            session.id,
            undefined,
            session.choice.agent,
            owner,
          )
        : { ...unavailableMetadata, loginShared: owner?.type === 'org' }
    const defaultLogin = publicLoginOwner(
      !session.login && metadata.loginAvailable ? owner : null,
    )
    await this.save(session, {
      ...metadata,
      ...(defaultLogin ? { defaultLogin } : {}),
    })
    const mayUseLogin =
      metadata.loginAvailable &&
      (metadata.loginShared ||
        senderId === undefined ||
        (owner?.type === 'personal' && senderId === owner.userId))
    const orgName =
      invalidEndpoint && owner?.type === 'org'
        ? await this.dependencies.readOrgName(owner.orgId)
        : null
    return {
      session,
      owner,
      login: mayUseLogin ? login : null,
      reason: invalidEndpoint
        ? invalidEndpointMessage(
            { ...session, ...(owner ? { login: owner } : {}) },
            orgName,
          )
        : undefined,
    }
  }

  async metadata(sessionId: string): Promise<Session> {
    const session = await this.operation.read((view) =>
      sessionFor(view, sessionId),
    )
    await this.refresh([session])
    return session
  }

  async refresh(sessions?: readonly Session[]): Promise<void> {
    const open = (
      sessions ?? (await this.operation.read((view) => view.sessions()))
    ).filter((session) => session.closedAt === null)
    if (!open.length) return
    const metadata = await this.dependencies.readLoginMetadata(
      open.map((session) => ({
        sessionId: session.id,
        agent: session.choice.agent,
        ...(session.login
          ? { login: session.login }
          : { userId: session.startedBy?.id }),
      })),
    )
    for (const session of open)
      await this.save(session, metadata.get(session.id) ?? unavailableMetadata)
  }

  private async save(
    session: Session,
    metadata: SessionLoginMetadata,
  ): Promise<void> {
    const defaultLogin = session.login ? undefined : metadata.defaultLogin
    if (
      session.loginAvailable !== metadata.loginAvailable ||
      session.loginShared !== metadata.loginShared ||
      JSON.stringify(session.defaultLogin) !== JSON.stringify(defaultLogin)
    ) {
      session.loginAvailable = metadata.loginAvailable
      session.loginShared = metadata.loginShared
      if (defaultLogin) session.defaultLogin = defaultLogin
      else delete session.defaultLogin
      await this.operation.change(async (transaction) => {
        await transaction.saveSession(session)
        await transaction.emit({ type: 'session.updated', session })
      })
    }
  }
}

export function loginOwnerLabel(
  session: Session,
  orgName?: string | null,
): string {
  if (session.login?.type === 'org') return `${orgName ?? 'The org'}'s`
  const starter = session.startedBy
  return starter
    ? `${starter.displayName ?? starter.githubLogin}'s`
    : "The session's"
}

export function unavailableLoginMessage(
  session: Session,
  orgName?: string | null,
): string {
  const owner = loginOwnerLabel(session, orgName)
  const agent = session.choice.agent === 'claude' ? 'Claude' : 'Codex'
  if (session.loginAvailable && !session.loginShared)
    return `${owner} ${agent} login is for ${owner} messages only. Try again or send a new message.`
  return `${owner} ${agent} login is not available. Try again or send a new message.`
}

function invalidEndpointMessage(
  session: Session,
  orgName: string | null,
): string {
  const owner = loginOwnerLabel(session, orgName)
  const agent = session.choice.agent === 'claude' ? 'Claude' : 'Codex'
  const action =
    session.login?.type === 'org'
      ? 'Ask an admin to update the login on the Agents tab of the org settings.'
      : 'Update the login in Account settings.'
  return `${owner} ${agent} login needs a public https:// endpoint with a host name. ${action}`
}
