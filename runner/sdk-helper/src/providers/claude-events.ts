import { array, object, string } from '../parse'
import { mapTool } from './tool'
import { assistantError, claudeOutcome } from './claude-outcome'
import { ClaudeMessages } from './claude-message'
import { ClaudeBackground } from './claude-background'
import type { ProviderEvent } from '../generated/ProviderEvent'
import { ClaudeSpeed } from './claude-speed'

export function synthetic(text: string): boolean {
  return /^\[Request interrupted by user(?: for tool use)?\]$/.test(text.trim())
}

function userUuids(input: Record<string, unknown>): string[] {
  return Array.isArray(input.user_message_uuids)
    ? array(input.user_message_uuids, string)
    : typeof input.user_message_uuid === 'string'
      ? [input.user_message_uuid]
      : []
}

interface Continuation {
  uuid: string
  wake: boolean
}

interface Reply {
  uuids: readonly string[]
  userMessageIds: readonly string[]
}

/**
 * Claude names a tool of an MCP server `mcp__<server>__<tool>`. This gives
 * the tool part of such a name, or null for any other tool.
 */
function mcpTool(name: string): string | null {
  const [prefix, server, ...rest] = name.split('__')
  const tool = rest.join('__')
  return prefix === 'mcp' && server && tool ? tool : null
}

/** Parse SDK output as unknown. Only this module knows its event fields. */
export class ClaudeEvents {
  private messageId = ''
  private readonly tools = new Map<string, ReturnType<typeof mapTool>>()
  private reply: Reply = { uuids: [], userMessageIds: [] }
  private errorKind: ReturnType<typeof assistantError> = null
  private unfinished = false
  private continued = false
  private continuation: Continuation | null = null
  private readonly ids: Map<string, readonly string[]>
  private readonly hasOutstanding: (uuid: string) => boolean
  private readonly emit: (event: ProviderEvent) => void
  private readonly messages: ClaudeMessages
  private readonly background: ClaudeBackground
  private readonly continueInput?: (userMessageIds: readonly string[]) => string
  private readonly read?: (inputIds: readonly string[]) => void
  readonly speed: ClaudeSpeed
  stopped = false

  constructor(
    ids: Map<string, readonly string[]>,
    emit: (event: ProviderEvent) => void,
    hasOutstanding: (uuid: string) => boolean,
    background = new ClaudeBackground(emit),
    fast = false,
    continueInput?: (userMessageIds: readonly string[]) => string,
    read?: (inputIds: readonly string[]) => void,
  ) {
    this.ids = ids
    this.hasOutstanding = hasOutstanding
    this.emit = emit
    this.background = background
    this.continueInput = continueInput
    this.read = read
    this.messages = new ClaudeMessages(emit)
    this.speed = new ClaudeSpeed(emit, fast)
  }

  accept(value: unknown): readonly string[] | undefined {
    const input = object(value)
    const uuids = userUuids(input)
    const continuation =
      input.type === 'result' ? this.continuationFor(input, uuids) : null
    const completed =
      continuation && !uuids.length ? [continuation.uuid] : uuids
    let reply = this.reply
    if (
      Array.isArray(input.user_message_uuids) ||
      (typeof input.user_message_uuid === 'string' &&
        this.ids.has(input.user_message_uuid))
    )
      reply = this.association(uuids)
    if (continuation && !uuids.length)
      reply = this.reply.uuids.includes(continuation.uuid)
        ? this.reply
        : this.association(completed)
    const wake =
      input.type === 'result' &&
      (continuation
        ? continuation.wake && !reply.userMessageIds.length
        : !this.answersOutstandingInput(input))
    if (input.type === 'result') this.background.answered(uuids)
    if (wake && !this.background.waited && !continuation) return
    if (
      this.background.waited &&
      input.type === 'system' &&
      input.subtype === 'session_state_changed' &&
      input.state === 'running' &&
      ![...this.ids.keys()].some(this.hasOutstanding)
    )
      this.reply = this.association([])
    if (this.background.accept(input)) return
    if (wake) reply = this.association([])
    this.reply = reply
    if (typeof input.session_id === 'string')
      this.emit({ type: 'conversation', id: input.session_id })
    if (input.parent_tool_use_id) return
    this.speed.accept(input)
    if (input.type === 'stream_event') this.partial(object(input.event))
    if (input.type === 'system' && input.subtype === 'thinking_tokens')
      this.emit({ type: 'thinking' })
    if (input.type === 'assistant') {
      const kind = assistantError(input.error)
      if (kind) {
        this.errorKind = kind
        if (typeof object(input.message).id === 'string')
          this.messages.discard(string(object(input.message).id))
        return
      }
      if (input.isSynthetic === true) return
      const message = object(input.message)
      const id = string(message.id)
      const blocks = array(message.content, object)
      this.messages.frame(id, blocks, this.reply.userMessageIds)
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
        this.messages.finish()
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
      this.messages.finish()
      this.read?.(reply.userMessageIds)
      const outcome = claudeOutcome(
        input,
        this.errorKind,
        this.stopped,
        this.unfinished,
      )
      this.stopped = false
      this.errorKind = null
      this.unfinished = false
      if (continuation) this.continuation = null
      if (outcome.state === 'failed') {
        if (outcome.dropped && !this.continued && this.continueInput) {
          this.continued = true
          this.continuation = {
            uuid: this.continueInput(reply.userMessageIds),
            wake,
          }
        } else this.emit(outcome.failure)
        return
      }
      if (wake) {
        this.emit({ type: 'wake-up', state: outcome.state })
        return
      }
      this.emit({
        type: 'result',
        state: outcome.state,
        userMessageIds: reply.userMessageIds,
      })
      return completed
    }
  }

  private continuationFor(
    input: Record<string, unknown>,
    uuids: readonly string[],
  ): Continuation | null {
    const continuation = this.continuation
    if (!continuation) return null
    if (uuids.length)
      return uuids.some((uuid) => uuid === continuation.uuid)
        ? continuation
        : null
    const origin = input.origin
    return typeof origin === 'object' &&
      origin !== null &&
      'kind' in origin &&
      origin.kind === 'task-notification'
      ? null
      : continuation
  }

  private association(uuids: readonly string[]): Reply {
    return {
      uuids,
      userMessageIds: [
        ...new Set(uuids.flatMap((uuid) => this.ids.get(uuid) ?? [])),
      ],
    }
  }

  private answersOutstandingInput(input: Record<string, unknown>): boolean {
    const uuids = userUuids(input)
    // The reply to a note of the runner is a wake-up reply in the same turn.
    if (uuids.length && uuids.every((uuid) => this.background.isNote(uuid)))
      return false
    const origin = input.origin
    if (
      typeof origin !== 'object' ||
      origin === null ||
      !('kind' in origin) ||
      origin.kind !== 'task-notification'
    )
      return true
    return uuids.some(this.hasOutstanding)
  }

  private partial(event: Record<string, unknown>): void {
    if (event.type === 'message_start') {
      this.unfinished = true
      this.messageId = string(object(event.message).id)
      this.messages.start(this.messageId, this.reply.userMessageIds)
    }
    if (event.type === 'message_stop') {
      this.unfinished = false
      this.messages.finish(this.messageId)
    }
    if (event.type === 'content_block_start') {
      const block = object(event.content_block)
      if (typeof event.index === 'number')
        this.messages.block(
          this.messageId,
          event.index,
          typeof block.text === 'string' ? block.text : '',
          this.reply.userMessageIds,
        )
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
        this.messages.delta(
          this.messageId,
          typeof event.index === 'number' ? event.index : null,
          delta.text,
          this.reply.userMessageIds,
        )
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
    const name = string(block.name)
    const tool = mapTool(id, name, block.input, 'running', mcpTool(name))
    this.tools.set(id, tool)
    this.emit({ type: 'tool', tool })
  }
}
