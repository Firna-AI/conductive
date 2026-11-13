import type { AgentChatEvent } from '../../src/shared/generated/AgentChatEvent'
import type { ToolCall } from '../../src/shared/generated/ToolCall'
import type { TurnEventContext } from '../../src/shared/generated/TurnEventContext'
import type { ProviderEvent } from '../sdk-helper/src/generated/ProviderEvent'

export class TurnOutput {
  private readonly context: TurnEventContext
  private readonly emit: (event: AgentChatEvent) => Promise<void>
  private readonly schedule: (action: () => Promise<void>) => void
  private readonly deltas = new Map<string, string>()
  private readonly tools = new Map<string, ToolCall>()
  private timer: ReturnType<typeof setTimeout> | undefined
  private thinking = false

  constructor(
    context: TurnEventContext,
    emit: (event: AgentChatEvent) => Promise<void>,
    schedule: (action: () => Promise<void>) => void,
  ) {
    this.context = context
    this.emit = emit
    this.schedule = schedule
  }

  async accept(event: ProviderEvent): Promise<void> {
    if (event.type === 'delta') {
      this.deltas.set(
        event.messageId,
        (this.deltas.get(event.messageId) ?? '') + event.text,
      )
      if (this.timer === undefined)
        this.timer = setTimeout(() => {
          this.timer = undefined
          this.schedule(() => this.flush())
        }, 40)
      return
    }
    const events = this.buffered()
    if (event.type === 'thinking' && !this.thinking) {
      this.thinking = true
      events.push({ type: 'turn.thinking', ...this.context })
    }
    if (event.type === 'answer')
      events.push({
        type: 'assistant.completed',
        ...this.context,
        messageId: event.messageId,
        text: event.text,
        userMessageIds: event.userMessageIds,
      })
    if (event.type === 'tool') {
      this.tools.set(event.tool.id, event.tool)
      events.push({
        type: 'tool.updated',
        ...this.context,
        tool: event.tool,
      })
    }
    await this.drain(events)
  }

  flush(): Promise<void> {
    return this.drain(this.buffered())
  }

  private buffered(): AgentChatEvent[] {
    clearTimeout(this.timer)
    this.timer = undefined
    const events: AgentChatEvent[] = []
    for (const [messageId, text] of this.deltas) {
      events.push({
        type: 'assistant.delta',
        ...this.context,
        messageId,
        text,
      })
    }
    this.deltas.clear()
    return events
  }

  async finish(state: 'stopped' | 'failed' | 'done'): Promise<void> {
    const events = this.buffered()
    for (const tool of this.tools.values()) {
      if (tool.state === 'running') {
        this.tools.set(tool.id, { ...tool, state })
        events.push({
          type: 'tool.updated',
          ...this.context,
          tool: { ...tool, state },
        })
      }
    }
    await this.drain(events)
  }

  private async drain(events: readonly AgentChatEvent[]): Promise<void> {
    const failures: unknown[] = []
    for (const event of events) {
      try {
        await this.emit(event)
      } catch (error) {
        failures.push(error)
      }
    }
    if (failures.length) throw failures[0]
  }
}
