import type { Session } from '../../src/shared/sessions'
import { readLogin } from './login-access'
import type { ChatOperation } from './operation'
import { sessionFor } from './sessions'
import type { ChatDependencies } from './types'

export class SessionLogins {
  private readonly operation: ChatOperation
  private readonly dependencies: ChatDependencies

  constructor(operation: ChatOperation, dependencies: ChatDependencies) {
    this.operation = operation
    this.dependencies = dependencies
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
    const available = login !== null
    if (session.loginAvailable !== available) {
      session.loginAvailable = available
      await this.operation.change(async (transaction) => {
        await transaction.saveSession(session)
        await transaction.emit({ type: 'session.updated', session })
      })
    }
    return { session, login }
  }

  async refresh(): Promise<void> {
    const sessions = await this.operation.read((view) => view.sessions())
    for (const session of sessions) await this.observe(session.id)
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
