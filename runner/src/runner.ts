import type { RunnerEvent, RunnerReportRefresh } from '../../src/shared/runner'
import type {
  RunnerConnectionRequest,
  RunnerConnector,
} from '../../src/shared/runner-transport'
import { checkpoint, changedSince } from './checkpoint'
import { AgentEngine } from './engine'
import { boundChatEvent } from './event-limits'
import { FileReporter } from './files'
import { RunnerLink } from './link'
import { OutputSanitizer } from './output-sanitizer'
import { Repository } from './repository'
import { SerialQueue } from './serial-queue'
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
  private readonly sanitizer = new OutputSanitizer()
  private readonly emitted = new SerialQueue()
  private readonly commands = new Set<Promise<void>>()
  private readonly refreshed: Set<string>
  private stopWatching: (() => void) | null = null
  private stopped = false
  private warmed = false
  private watchFiles = true

  constructor(options: RunnerOptions) {
    this.options = options
    this.refreshed = new Set(options.store.snapshot.reports.commands)
    this.sanitizer.add(options.request.workspaceToken)
    const repository = new Repository(options.cwd, options.warn)
    this.files = new FileReporter(
      repository,
      options.defaultBranch,
      (event, reportCommandId) => this.emit(event, true, reportCommandId),
      {
        revisions: options.store.snapshot.fileRevisions,
        prepare: (event) => this.sanitizer.fileReport(event),
        warn: options.warn,
      },
    )
    this.engine = new AgentEngine({
      ...options,
      checkpoint: (signal) =>
        checkpoint(new Repository(options.cwd, options.warn, signal)),
      changedSince: (before, signal) =>
        changedSince(
          new Repository(options.cwd, options.warn, signal),
          options.defaultBranch,
          before,
        ),
      emit: (event) => this.emit(event),
    })
    this.link = new RunnerLink(options.store, {
      ...options,
      connected: async () => {
        try {
          await this.files.refresh(true)
        } catch {
          options.warn('The initial file reports could not be saved.')
          await this.emit({ type: 'files.unavailable' })
        }
        await this.emit({ type: 'runner.ready' })
      },
      disconnected: () => {
        if (!this.stopped) options.disconnected()
      },
      command: (command) => {
        if ('login' in command) this.sanitizer.add(command.login.secret)
        const action =
          command.type === 'file.read' || command.type === 'file.diff'
            ? this.files.request(command).then((response) => {
                this.link.reply(response)
              })
            : command.type === 'report.refresh'
              ? this.refresh(command)
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

  private emit(
    event: RunnerEvent,
    prepared = false,
    reportCommandId?: string,
  ): Promise<void> {
    return this.emitted.run(async () => {
      const failures: unknown[] = []
      for (const safe of prepared ? [event] : this.sanitizer.accept(event)) {
        try {
          await this.link.emit(boundChatEvent(safe), reportCommandId)
        } catch (error) {
          failures.push(error)
        }
      }
      if (failures.length) {
        if (
          event.type === 'turn.completed' ||
          event.type === 'turn.failed' ||
          event.type === 'runner.ready' ||
          event.type === 'files.unavailable'
        )
          await this.link.persist()
        else throw failures[0]
      }
    })
  }

  private async refresh(command: RunnerReportRefresh): Promise<void> {
    if (this.refreshed.has(command.commandId)) return
    this.refreshed.add(command.commandId)
    const kind = command.kind
    if (kind === 'files.snapshot' || kind === 'changes.updated')
      await this.files.refresh(true, kind, command.commandId)
    else
      await this.emitted.run(() =>
        this.link.refreshReport(kind, command.commandId, (report) =>
          this.sanitizer.retainedReport(report),
        ),
      )
  }
}
