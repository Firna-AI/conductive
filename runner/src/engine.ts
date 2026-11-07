import type { RunnerCommand } from '../../src/shared/runner'
import { SessionEngine } from './engine-runtime'
import type { EngineOptions } from './engine-session'

/** Sessions share event storage. Each session owns its asynchronous work. */
export class AgentEngine {
  private readonly options: EngineOptions
  private readonly sessions = new Map<string, SessionEngine>()
  private readonly commands = new Set<string>()

  constructor(options: EngineOptions) {
    this.options = options
  }

  command(command: RunnerCommand): Promise<void> {
    if (command.type === 'file.read' || command.type === 'file.diff')
      return Promise.resolve()
    if (this.commands.has(command.commandId)) return Promise.resolve()
    this.commands.add(command.commandId)
    let session = this.sessions.get(command.sessionId)
    if (!session) {
      if (command.type === 'model') return Promise.resolve()
      if (command.type === 'message') {
        this.options.warn('The message targets a turn that is not running.')
        return Promise.resolve()
      }
      session = new SessionEngine(this.options)
      this.sessions.set(command.sessionId, session)
    }
    return session.command(command)
  }

  async idle(): Promise<void> {
    await Promise.all(
      [...this.sessions.values()].map((session) => session.idle()),
    )
  }

  async close(): Promise<void> {
    await Promise.all(
      [...this.sessions.values()].map((session) => session.close()),
    )
  }
}
