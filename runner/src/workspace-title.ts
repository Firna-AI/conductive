import type { Agent } from '../../src/shared/agents'
import type { RunnerEvent } from '../../src/shared/runner'
import { cancelable } from './engine-cancel'
import { ProviderLifetime } from './providers/lifetime'
import type { TitleRequest } from './providers/title'
import type { ProviderInput } from './providers/types'
import type { WorkspaceToolRuntime } from './providers/workspace-tools'
import type { EventStore } from './state'
import { cleanTitle } from './title-text'

interface WorkspaceTitleOptions {
  cwd: string
  home: string
  store: EventStore
  tools: WorkspaceToolRuntime
  titles?: Record<Agent, TitleRequest>
  filterText: (value: string) => string
  emit: (event: RunnerEvent) => Promise<void>
  warn: (message: string) => void
}

export class WorkspaceTitle {
  private text: string | null = null
  private pending: Promise<void> | null = null
  private controller: AbortController | null = null
  private stopped = false
  private readonly options: WorkspaceTitleOptions

  constructor(options: WorkspaceTitleOptions) {
    this.options = options
  }

  start(command: ProviderInput): void {
    if (this.stopped || this.saved() || !this.options.titles) return
    if (this.text === null && command.message.text.trim())
      this.text = Array.from(this.options.filterText(command.message.text))
        .slice(0, 4_000)
        .join('')
    if (!this.text?.trim() || this.pending) return
    const controller = new AbortController()
    this.controller = controller
    this.pending = this.request(command, this.text, controller)
      .catch(() => this.options.warn('The workspace title request failed.'))
      .finally(() => {
        this.pending = null
        this.controller = null
      })
  }

  async idle(): Promise<void> {
    await this.pending
  }

  async close(): Promise<void> {
    this.stopped = true
    this.controller?.abort()
    await this.pending
  }

  private saved(): boolean {
    return !!this.options.store.snapshot.reports.latest['workspace.title']
  }

  private async request(
    command: ProviderInput,
    text: string,
    controller: AbortController,
  ): Promise<void> {
    const lifetime = new ProviderLifetime()
    const timer = setTimeout(() => controller.abort(), 60_000)
    const signal = controller.signal
    try {
      const request = this.options.titles?.[command.message.choice.agent]
      if (!request) return
      const answer = await cancelable(signal, () =>
        request({
          cwd: this.options.cwd,
          home: this.options.home,
          tools: { ...this.options.tools, turnId: command.turnId },
          login: command.login,
          choice: command.message.choice,
          text,
          signal,
          lifetime,
        }),
      )
      signal.throwIfAborted()
      const name = cleanTitle(this.options.filterText(answer))
      if (!name) throw new Error('The title is empty.')
      if (!this.saved() && !this.stopped)
        await this.options.emit({ type: 'workspace.title', name })
      this.text = null
    } finally {
      clearTimeout(timer)
      await lifetime.close()
    }
  }
}
