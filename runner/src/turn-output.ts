import type {
  AgentChatEvent,
  ToolCall,
  TurnEventContext,
} from '../../src/shared/chat-events'
import type { ProviderEvent } from './providers/types'

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
    await this.flush()
    if (event.type === 'thinking' && !this.thinking) {
      this.thinking = true
      await this.emit({ type: 'turn.thinking', ...this.context })
    }
    if (event.type === 'answer')
      await this.emit({
        type: 'assistant.completed',
        ...this.context,
        messageId: event.messageId,
        text: event.text,
        userMessageIds: event.userMessageIds,
      })
    if (event.type === 'tool') {
      this.tools.set(event.tool.id, event.tool)
      await this.emit({
        type: 'tool.updated',
        ...this.context,
        tool: event.tool,
      })
    }
  }

  async flush(): Promise<void> {
    clearTimeout(this.timer)
    this.timer = undefined
    for (const [messageId, text] of this.deltas) {
      this.deltas.delete(messageId)
      await this.emit({
        type: 'assistant.delta',
        ...this.context,
        messageId,
        text,
      })
    }
  }

  async finish(state: 'stopped' | 'failed' | 'done'): Promise<void> {
    await this.flush()
    for (const tool of this.tools.values()) {
      if (tool.state === 'running') {
        this.tools.set(tool.id, { ...tool, state })
        await this.emit({
          type: 'tool.updated',
          ...this.context,
          tool: { ...tool, state },
        })
      }
    }
  }
}
