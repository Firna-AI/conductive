import type {
  RunnerEvent,
  RunnerReportRefresh,
  WorkspaceToRunnerV2 as WorkspaceToRunner,
} from '../../src/shared/runner'
import type {
  RunnerConnectionRequest,
  RunnerConnector as TransportRunnerConnector,
} from '../../src/shared/runner-transport'
import { checkpoint, changedSince } from './checkpoint'
import { prepareContextFolder } from './context-folder'
import { AgentEngine } from './engine'
import { boundChatEvent } from '../../src/shared/event-limits'
import {
  filterDiffResponse,
  filterFileResponse,
} from '../../src/shared/output-fields'
import { FileReporter } from './files'
import { agentInstructions, type WorkspaceContext } from './instructions'
import { RunnerLink } from './link'
import { OutputSanitizer } from '../../src/shared/output-sanitizer'
import { Repository } from './repository'
import { SerialQueue } from './serial-queue'
import { workspaceToolRuntime } from './providers/workspace-tools'
import { clearClaudeCredentials } from './providers/claude-profile'
import { clearCodexCredentials } from './providers/codex-credentials'
import type { EngineOptions } from './engine-session'
import type { EventStore } from './state'
import { PortReporter, type PortReporterOptions } from './ports'
import { privatePortReport } from './port-report-budget'
import { onRestoreEnd } from './restore-end'
import { TERMINAL_RESTORE_MARKER } from '../../src/shared/restore-marker'

type RunnerConnector = TransportRunnerConnector<WorkspaceToRunner>

export interface RunnerOptions extends WorkspaceContext {
  workspaceId: string
  request: RunnerConnectionRequest
  connect: RunnerConnector
  store: EventStore
  home: string
  providers: EngineOptions['providers']
  warm: () => Promise<unknown>
  now: () => number
  warn: (message: string) => void
  disconnected: () => void
  ports?: PortReporterOptions
  /** Tests use a temporary path. The service uses the sandbox marker. */
  restoreMarker?: string
}

export class Runner {
  readonly link: RunnerLink
  readonly files: FileReporter
  readonly engine: AgentEngine
  readonly ports: PortReporter | null
  private readonly options: RunnerOptions
  private readonly sanitizer = new OutputSanitizer()
  private readonly emitted = new SerialQueue()
  private readonly commands = new Set<Promise<void>>()
  private readonly refreshed: Set<string>
  private stopWatching: (() => void) | null = null
  private stopRestoreWatch: (() => void) | null = null
  private stopped = false
  private warmed = false
  private watchFiles = true

  constructor(options: RunnerOptions) {
    this.options = options
    this.refreshed = new Set(options.store.snapshot.reports.commands)
    this.sanitizer.add(options.request.workspaceToken)
    this.ports = options.ports
      ? new PortReporter(
          options.ports,
          (event, commandId) => this.emit(event, false, commandId),
          options.warn,
        )
      : null
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
      instructions: agentInstructions(options),
      tools: workspaceToolRuntime(options.request),
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
        await this.ports?.refresh(true)
        await this.emit({ type: 'runner.ready' })
      },
      disconnected: () => {
        if (!this.stopped) options.disconnected()
      },
      command: (command) => {
        if (command.type === 'turn')
          this.sanitizer.add(command.credential.token)
        const action =
          command.type === 'file.read' || command.type === 'file.diff'
            ? this.files.request(command).then((response) => {
                const text = (value: string) => this.sanitizer.text(value)
                if (response.result.ok)
                  this.link.reply(
                    response.type === 'file.read.result'
                      ? {
                          ...response,
                          result: {
                            ok: true,
                            file: filterFileResponse(
                              response.result.file,
                              text,
                            ),
                          },
                        }
                      : {
                          ...response,
                          result: {
                            ok: true,
                            diff: filterDiffResponse(
                              response.result.diff,
                              text,
                            ),
                          },
                        },
                  )
                else this.link.reply(response)
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
    await prepareContextFolder(this.options.cwd, this.options.warn)
    await this.connect()
  }

  async connect(): Promise<void> {
    if (!this.warmed) {
      await clearClaudeCredentials(this.options.home)
      await clearCodexCredentials(this.options.home)
      await this.options.warm()
      this.warmed = true
    }
    if (this.watchFiles && !this.stopWatching) {
      this.stopWatching = this.files.watch(this.options.warn)
      this.stopRestoreWatch = onRestoreEnd(
        this.options.restoreMarker ?? TERMINAL_RESTORE_MARKER,
        () => this.watchRestoredFiles(),
      )
    }
    this.ports?.watch()
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
    this.stopRestoreWatch?.()
    this.stopWatching?.()
    const closingPorts = this.ports?.close()
    await this.engine.close()
    await closingPorts
    await this.link.persist()
    this.link.close()
  }

  /** A watch made before the disk restore ended still sees the old view. */
  private watchRestoredFiles(): void {
    if (this.stopped || !this.stopWatching) return
    this.stopWatching()
    this.stopWatching = this.files.watch(this.options.warn)
    void this.files
      .refresh()
      .catch(() => this.options.warn('The file lists could not update.'))
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
          await this.link.emit(
            safe.type === 'ports.updated'
              ? privatePortReport(safe, this.options.warn)
              : boundChatEvent(safe),
            reportCommandId,
          )
        } catch (error) {
          if (
            safe.type === 'turn.thinking' ||
            safe.type === 'assistant.delta' ||
            safe.type === 'assistant.completed' ||
            safe.type === 'tool.updated'
          ) {
            await this.link.persist().catch(() => {})
            this.options.warn(
              'The agent output save failed. The turn will continue.',
            )
          } else failures.push(error)
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
    else if (kind === 'ports.updated')
      await this.ports?.refresh(true, command.commandId)
    else
      await this.emitted.run(() =>
        this.link.refreshReport(kind, command.commandId, (report) =>
          this.sanitizer.retainedReport(report),
        ),
      )
  }
}
