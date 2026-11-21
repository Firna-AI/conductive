import { randomUUID } from 'node:crypto'

import type { ProviderEvent } from '../generated/ProviderEvent'
import type { ProviderInput } from '../generated/ProviderInput'

type Receipt = Pick<
  Extract<ProviderEvent, { type: 'answer' }>,
  'userMessageIds' | 'noticeIds'
>

/** SDK input keys track app notes separately from member message identities. */
export class InputReceipts {
  private readonly inputs = new Map<string, Receipt>()
  private readonly output: (event: ProviderEvent) => void

  constructor(output: (event: ProviderEvent) => void) {
    this.output = output
  }

  add(command: ProviderInput): string {
    if (command.type !== 'notice') return command.message.id
    const key = `notice:${randomUUID()}`
    this.inputs.set(key, {
      userMessageIds: [],
      noticeIds: command.notices.map((notice) => notice.id),
    })
    return key
  }

  emit = (event: ProviderEvent): void => {
    if (event.type !== 'answer' && event.type !== 'result') {
      this.output(event)
      return
    }
    const receipts = event.userMessageIds.map(
      (id): Receipt => this.inputs.get(id) ?? { userMessageIds: [id] },
    )
    const noticeIds = [
      ...new Set(receipts.flatMap((receipt) => receipt.noticeIds ?? [])),
    ]
    this.output({
      ...event,
      userMessageIds: receipts.flatMap((receipt) => receipt.userMessageIds),
      ...(noticeIds.length ? { noticeIds } : {}),
    })
  }
}
