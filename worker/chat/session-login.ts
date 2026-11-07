import type { Agent } from '../../src/shared/agents'
import type { Session } from '../../src/shared/sessions'
import { readLogin } from './login-access'
import type { ChatOperation } from './operation'
import { sessionFor } from './session-record'
import type { ChatDependencies } from './types'

export class SessionLogins {
  private readonly operation: ChatOperation
  private readonly dependencies: ChatDependencies

  constructor(operation: ChatOperation, dependencies: ChatDependencies) {
    this.operation = operation
    this.dependencies = dependencies
  }

  static initial(dependencies: ChatDependencies, userId: string, agent: Agent) {
    return readLogin(dependencies, userId, agent)
  }

  forMember(userId: string, agent: Agent) {
    return readLogin(this.dependencies, userId, agent, undefined, userId)
  }

  async observe(
    sessionId: string,
    runnerTokenHash?: string,
    senderId?: string,
  ) {
    const session = await this.operation.read((view) =>
      sessionFor(view, sessionId),
    )
    const login = await readLogin(
      this.dependencies,
      session.startedBy?.id ?? null,
      session.choice.agent,
      runnerTokenHash,
      senderId,
    )
    await this.save(session, login !== null)
    return { session, login }
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
    const targets = open.flatMap((session) =>
      session.startedBy === null
        ? []
        : [
            {
              sessionId: session.id,
              userId: session.startedBy.id,
              agent: session.choice.agent,
            },
          ],
    )
    const available = targets.length
      ? await this.dependencies.readLoginAvailability(targets)
      : new Set<string>()
    for (const session of open)
      await this.save(session, available.has(session.id))
  }

  private async save(session: Session, available: boolean): Promise<void> {
    if (session.loginAvailable !== available) {
      session.loginAvailable = available
      await this.operation.change(async (transaction) => {
        await transaction.saveSession(session)
        await transaction.emit({ type: 'session.updated', session })
      })
    }
  }
}

export function unavailableLoginMessage(session: Session): string {
  const starter = session.startedBy
  const owner = starter
    ? `${starter.displayName ?? starter.githubLogin}'s`
    : "The session's"
  const agent = session.choice.agent === 'claude' ? 'Claude' : 'Codex'
  return `${owner} ${agent} login is not available. Try again or send a new message.`
}
