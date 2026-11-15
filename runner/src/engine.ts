import type { RunnerCommand } from '../../src/shared/runner'
import { SessionEngine } from './engine-runtime'
import type { EngineOptions } from './engine-session'
import { EngineTurns } from './engine-turns'

/** Sessions share event storage. Each session owns its asynchronous work. */
export class AgentEngine {
  private readonly options: EngineOptions
  private readonly sessions = new Map<string, SessionEngine>()
  private readonly commands = new Set<string>()
  private readonly turns: EngineTurns
  private closing: Promise<void> | null = null

  constructor(options: EngineOptions) {
    this.options = options
    this.turns = new EngineTurns(options)
  }

  command(
    command: Exclude<RunnerCommand, { type: 'report.refresh' }>,
  ): Promise<void> {
    if (this.closing) return Promise.resolve()
    if (command.type === 'file.read' || command.type === 'file.diff')
      return Promise.resolve()
    if (this.commands.has(command.commandId)) return Promise.resolve()
    this.commands.add(command.commandId)
    const replay = this.turns.command(command)
    if (replay) return replay
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
    await this.turns.idle()
    await Promise.all(
      [...this.sessions.values()].map((session) => session.idle()),
    )
  }

  close(): Promise<void> {
    this.closing ??= this.shutdown()
    return this.closing
  }

  private async shutdown(): Promise<void> {
    await Promise.all([
      this.turns.idle(),
      ...[...this.sessions.values()].map((session) => session.close()),
    ])
  }
}
