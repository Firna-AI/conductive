import { array, object, string } from '../parse'
import { mapTool } from './tool'
import { assistantError, claudeOutcome } from './claude-outcome'
import type { ProviderEvent } from './types'

export function synthetic(text: string): boolean {
  return /^\[Request interrupted by user(?: for tool use)?\]$/.test(text.trim())
}

/** Parse SDK output as unknown. Only this module knows its event fields. */
export class ClaudeEvents {
  private messageId = ''
  private readonly tools = new Map<string, ReturnType<typeof mapTool>>()
  private userIds: string[] = []
  private errorKind: ReturnType<typeof assistantError> = null
  private readonly ids: Map<string, string>
  private readonly emit: (event: ProviderEvent) => void
  stopped = false

  constructor(ids: Map<string, string>, emit: (event: ProviderEvent) => void) {
    this.ids = ids
    this.emit = emit
  }

  accept(value: unknown): void {
    const input = object(value)
    if (typeof input.session_id === 'string')
      this.emit({ type: 'conversation', id: input.session_id })
    if (Array.isArray(input.user_message_uuids)) {
      this.userIds = array(input.user_message_uuids, string).flatMap((id) =>
        this.ids.has(id) ? [this.ids.get(id) ?? ''] : [],
      )
    } else if (
      typeof input.user_message_uuid === 'string' &&
      this.ids.has(input.user_message_uuid)
    ) {
      this.userIds = [this.ids.get(input.user_message_uuid) ?? '']
    }
    if (input.parent_tool_use_id) return
    if (input.type === 'stream_event') this.partial(object(input.event))
    if (input.type === 'system' && input.subtype === 'thinking_tokens')
      this.emit({ type: 'thinking' })
    if (input.type === 'assistant') {
      const kind = assistantError(input.error)
      if (kind) {
        this.errorKind = kind
        return
      }
      if (input.isSynthetic === true) return
      const message = object(input.message)
      const id = string(message.id)
      const blocks = array(message.content, object)
      const text = blocks
        .filter((block) => block.type === 'text')
        .map((block) => string(block.text))
        .join('')
      if (text && !synthetic(text))
        this.emit({
          type: 'answer',
          messageId: id,
          text,
          userMessageIds: this.userIds,
        })
      for (const block of blocks) {
        if (block.type === 'tool_use') this.beginTool(block)
      }
    }
    if (input.type === 'user') {
      const message = object(input.message)
      if (!Array.isArray(message.content)) return
      for (const block of array(message.content, object)) {
        if (
          block.type !== 'tool_result' ||
          typeof block.tool_use_id !== 'string'
        )
          continue
        const tool = this.tools.get(block.tool_use_id)
        if (tool)
          this.emit({
            type: 'tool',
            tool: {
              ...tool,
              state: block.is_error === true ? 'failed' : 'done',
            },
          })
      }
    }
    if (input.type === 'result') {
      const outcome = claudeOutcome(input, this.errorKind, this.stopped)
      if (outcome.state === 'failed') this.emit(outcome.failure)
      else
        this.emit({
          type: 'result',
          state: outcome.state,
          userMessageIds: this.userIds,
        })
      this.stopped = false
      this.errorKind = null
    }
  }

  private partial(event: Record<string, unknown>): void {
    if (event.type === 'message_start')
      this.messageId = string(object(event.message).id)
    if (event.type === 'content_block_start') {
      const block = object(event.content_block)
      if (block.type === 'tool_use') this.beginTool(block)
    }
    if (event.type === 'content_block_delta') {
      const delta = object(event.delta)
      if (delta.type === 'thinking_delta') this.emit({ type: 'thinking' })
      if (
        delta.type === 'text_delta' &&
        typeof delta.text === 'string' &&
        !synthetic(delta.text)
      ) {
        this.emit({
          type: 'delta',
          messageId: this.messageId,
          text: delta.text,
        })
      }
    }
  }

  private beginTool(block: Record<string, unknown>): void {
    const id = string(block.id)
    const tool = mapTool(id, string(block.name), block.input, 'running')
    this.tools.set(id, tool)
    this.emit({ type: 'tool', tool })
  }
}
