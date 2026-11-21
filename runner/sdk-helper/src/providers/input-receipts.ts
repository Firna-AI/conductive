import { randomUUID } from 'node:crypto'

import type { ProviderEvent } from '../generated/ProviderEvent'
import type { ProviderInput } from '../generated/ProviderInput'

type Receipt = Pick<
  Extract<ProviderEvent, { type: 'answer' }>,
  'userMessageIds' | 'noticeIds'
>

/**
 * Claude reply associations prove input reads. Codex completed userMessage
 * items prove reads separately from its member message receipt list.
 */
export class InputReceipts {
  private readonly inputs = new Map<string, Receipt>()
  private readonly readNoticeIds = new Set<string>()
  private readonly output: (event: ProviderEvent) => void
  private readonly proof: 'reply' | 'input'

  constructor(
    output: (event: ProviderEvent) => void,
    proof: 'reply' | 'input' = 'reply',
  ) {
    this.output = output
    this.proof = proof
  }

  add(command: ProviderInput): string {
    const key =
      command.type === 'notice' ? `notice:${randomUUID()}` : command.message.id
    const notices = command.type === 'message' ? [] : (command.notices ?? [])
    this.inputs.set(key, {
      userMessageIds: command.type === 'notice' ? [] : [command.message.id],
      noticeIds: notices.map((notice) => notice.id),
    })
    return key
  }

  reset(): void {
    this.inputs.clear()
    this.readNoticeIds.clear()
  }

  discard(id: string): void {
    this.inputs.delete(id)
  }

  read = (ids: readonly string[]): void => {
    for (const id of ids)
      for (const noticeId of this.inputs.get(id)?.noticeIds ?? [])
        this.readNoticeIds.add(noticeId)
  }

  emit = (event: ProviderEvent): void => {
    if (event.type === 'failed') {
      this.output({
        ...event,
        ...(this.readNoticeIds.size
          ? { noticeIds: [...this.readNoticeIds] }
          : {}),
      })
      return
    }
    if (event.type !== 'answer' && event.type !== 'result') {
      this.output(event)
      return
    }
    if (this.proof === 'reply') this.read(event.userMessageIds)
    const receipts = event.userMessageIds.map(
      (id): Receipt => this.inputs.get(id) ?? { userMessageIds: [id] },
    )
    const noticeIds =
      this.proof === 'input'
        ? [...this.readNoticeIds]
        : [...new Set(receipts.flatMap((receipt) => receipt.noticeIds ?? []))]
    this.output({
      ...event,
      userMessageIds: receipts.flatMap((receipt) => receipt.userMessageIds),
      ...(noticeIds.length ? { noticeIds } : {}),
    })
  }
}
