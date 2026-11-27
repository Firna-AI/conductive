import { randomUUID } from 'node:crypto'

import type { SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'

import { InputQueue } from './queue'

const MAX_OUTSTANDING_MESSAGES = 64

type UserMessage = SDKUserMessage & { uuid: string }

/** One input of the main agent, which runs after the current step. */
export function userInput(
  sessionId: string,
  content: SDKUserMessage['message']['content'],
): UserMessage {
  return {
    type: 'user',
    uuid: randomUUID(),
    session_id: sessionId,
    parent_tool_use_id: null,
    message: { role: 'user', content },
    priority: 'next',
  }
}

export class ClaudeInputWindow implements AsyncIterable<SDKUserMessage> {
  readonly ids = new Map<string, readonly string[]>()
  private readonly input = new InputQueue<SDKUserMessage>()
  private readonly held: { id: string; value: UserMessage }[] = []
  private readonly outstanding = new Set<string>()
  private closed = false

  get pending(): boolean {
    return this.held.length > 0 || this.outstanding.size > 0
  }

  push(id: string, value: UserMessage): void {
    if (this.closed) throw new Error('The agent input is closed.')
    this.held.push({ id, value })
    this.release()
  }

  continue(userMessageIds: readonly string[], value: UserMessage): void {
    if (this.closed) throw new Error('The agent input is closed.')
    this.ids.set(value.uuid, [...userMessageIds])
    this.input.push(value)
  }

  complete(uuids: readonly string[]): void {
    for (const uuid of uuids) {
      for (const id of this.ids.get(uuid) ?? []) this.outstanding.delete(id)
    }
    this.release()
  }

  hasOutstanding(uuid: string): boolean {
    return (this.ids.get(uuid) ?? []).some((id) => this.outstanding.has(id))
  }

  discard(): void {
    this.closed = true
    this.held.length = 0
    this.outstanding.clear()
    this.ids.clear()
    this.input.discard()
  }

  [Symbol.asyncIterator](): AsyncIterator<SDKUserMessage> {
    return this.input[Symbol.asyncIterator]()
  }

  private release(): void {
    while (
      !this.closed &&
      this.outstanding.size < MAX_OUTSTANDING_MESSAGES &&
      this.held.length
    ) {
      const next = this.held.shift()
      if (!next) break
      this.ids.set(next.value.uuid, [next.id])
      this.outstanding.add(next.id)
      this.input.push(next.value)
    }
  }
}
