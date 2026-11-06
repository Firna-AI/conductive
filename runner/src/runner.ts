import type { RunnerEvent } from '../../src/shared/runner'
import type {
  RunnerConnectionRequest,
  RunnerConnector,
} from '../../src/shared/runner-transport'
import { checkpoint, changedSince } from './checkpoint'
import { AgentEngine } from './engine'
import { FileReporter } from './files'
import { RunnerLink } from './link'
import { parseEvent } from './stored-events'
import { Repository } from './repository'
import { redact } from './providers/environment'
import type { EngineOptions } from './engine-session'
import type { EventStore } from './state'

export interface RunnerOptions {
  workspaceId: string
  request: RunnerConnectionRequest
  connect: RunnerConnector
  store: EventStore
  cwd: string
  home: string
  defaultBranch: string
  computerMcpUrl: string
  providers: EngineOptions['providers']
  warm: () => Promise<unknown>
  now: () => number
  warn: (message: string) => void
  disconnected: () => void
}

export class Runner {
  readonly link: RunnerLink
  readonly files: FileReporter
  readonly engine: AgentEngine
  private readonly options: RunnerOptions
  private readonly secrets = new Set<string>()
  private readonly commands = new Set<Promise<void>>()
  private stopWatching: (() => void) | null = null
  private stopped = false
  private warmed = false
  private watchFiles = true

  constructor(options: RunnerOptions) {
    this.options = options
    this.secrets.add(options.request.workspaceToken)
    const repository = new Repository(options.cwd)
    this.files = new FileReporter(repository, options.defaultBranch, (event) =>
      this.emit(event),
    )
    this.engine = new AgentEngine({
      ...options,
      checkpoint: () => checkpoint(repository),
      changedSince: (before) =>
        changedSince(repository, options.defaultBranch, before),
      emit: (event) => this.emit(event),
    })
    this.link = new RunnerLink(options.store, {
      ...options,
      connected: async () => {
        await this.files.refresh(true)
        await this.emit({ type: 'runner.ready' })
      },
      disconnected: () => {
        if (!this.stopped) options.disconnected()
      },
      command: (command) => {
        if ('login' in command) this.secrets.add(command.login.secret)
        const action =
          command.type === 'file.read' || command.type === 'file.diff'
            ? this.files.request(command).then((response) => {
                this.link.reply(response)
              })
            : this.engine.command(command)
        this.commands.add(action)
        void action
          .finally(() => this.commands.delete(action))
          .catch(() => options.warn('The runner command could not finish.'))
      },
    })
  }

  async start(watchFiles = true): Promise<void> {
    this.watchFiles = watchFiles
    await this.connect()
  }

  async connect(): Promise<void> {
    if (!this.warmed) {
      await this.options.warm()
      this.warmed = true
    }
    if (this.watchFiles && !this.stopWatching)
      this.stopWatching = this.files.watch(this.options.warn)
    await this.link.connect()
  }

  async idle(): Promise<void> {
    await this.link.idle()
    await Promise.all(this.commands)
    await this.engine.idle()
    await this.link.idle()
  }

  async close(): Promise<void> {
    this.stopped = true
    this.stopWatching?.()
    await this.engine.close()
    this.link.close()
  }

  private emit(event: RunnerEvent): Promise<void> {
    const value: unknown = JSON.parse(
      redact(JSON.stringify(event), [...this.secrets]),
    )
    return this.link.emit(parseEvent(value))
  }
}
