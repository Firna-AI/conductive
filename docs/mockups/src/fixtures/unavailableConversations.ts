import type { ChatItem } from './conversations'

/**
 * The chats of turns whose changed files the cloud computer could not read.
 * Each turn still ends: a finished turn keeps its duration, and a stopped
 * turn keeps the member who pressed Stop. Only the files are missing.
 */
export function unavailableConversations(chats: {
  /** The finished turn of the canonical chat. */
  history: readonly ChatItem[]
  /** The same turn up to the call that a Stop cut off. */
  cutOff: readonly ChatItem[]
}) {
  return {
    'files-unavailable': chats.history.map((item) =>
      item.kind === 'turn-end'
        ? { ...item, files: [], filesUnavailable: true }
        : item,
    ),
    'stopped-files-unavailable': [
      ...chats.cutOff,
      { kind: 'stopped', id: 'stopped', by: 'cal', filesUnavailable: true },
    ],
  } as const satisfies Record<string, readonly ChatItem[]>
}
