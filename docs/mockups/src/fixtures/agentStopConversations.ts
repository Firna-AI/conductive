import type { ChatItem } from './conversations'
import { newWorkspaceConversations } from './newWorkspaceConversations'
import { autocompleteSessions, sessionLink } from './sessionLinks'

/**
 * The agent of the second session of Checkout address autocomplete, Debounce
 * the address lookups to 250 ms, stopped two turns with a workspace tool:
 * the turn of the first session of its workspace, and the first turn of
 * Saved carts. Its own turn goes on. No member pressed Stop, so each line
 * names that session.
 */
const stopper = sessionLink(autocompleteSessions.debounce)

/** The first turn of Saved carts up to the search that the stop cut off. */
const savedCartsCutOff: readonly ChatItem[] = [
  ...newWorkspaceConversations['first-turn'].slice(0, 5),
  {
    kind: 'tool',
    id: 'search-session',
    tool: 'search',
    target: 'getServerSession',
    status: 'stopped',
  },
]

/**
 * The chats of the sessions that the agent stopped. `cutOff` is the turn of
 * the first session of Checkout address autocomplete up to the call that a
 * stop cut off.
 */
export function agentStopConversations(cutOff: readonly ChatItem[]) {
  return {
    'stopped-from': [
      ...cutOff,
      { kind: 'stopped', id: 'stopped', from: stopper },
    ],
    'stopped-from-other': [
      ...savedCartsCutOff,
      { kind: 'stopped', id: 'stopped', from: stopper },
    ],
  } as const satisfies Record<string, readonly ChatItem[]>
}
