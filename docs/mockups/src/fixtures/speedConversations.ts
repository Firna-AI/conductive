import type { StandardSpeedCause } from '../components/chat/speedCopy'
import type { ChatItem } from './conversations'

/**
 * The chats of a fast turn that ran at standard speed (fast mode decision
 * 257). The finished turn of the canonical chat still ends with its duration
 * and its files, and its end line names the speed and the cause. A stopped
 * turn ends its line with the same words.
 */
export function speedConversations(chats: {
  /** The finished turn of the canonical chat. */
  history: readonly ChatItem[]
  /** The same turn up to the call that a Stop cut off. */
  cutOff: readonly ChatItem[]
}) {
  const slow = (cause: StandardSpeedCause): readonly ChatItem[] =>
    chats.history.map((item) =>
      item.kind === 'turn-end' ? { ...item, standardSpeed: cause } : item,
    )
  return {
    'standard-speed-limit': slow('fast_limit'),
    'standard-speed-older': slow('older_runner'),
    'standard-speed-stopped': [
      ...chats.cutOff,
      {
        kind: 'stopped',
        id: 'stopped',
        by: 'cal',
        standardSpeed: 'fast_limit',
      },
    ],
  } as const satisfies Record<string, readonly ChatItem[]>
}
