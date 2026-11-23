import { sessionLink as appSessionLink } from '../../../../src/shared/session-link'
import { appDomain } from '../../../../src/shared/brand'
import type { ChatItem } from './conversations'
import { newWorkspaceConversations } from './newWorkspaceConversations'
import { orgs } from './orgs'
import { autocompleteSessions, sessionLink } from './sessionLinks'

/**
 * The agent of the second session of Checkout address autocomplete, Debounce
 * the address lookups to 250 ms, stopped two turns with a workspace tool:
 * the turn of the first session of its workspace, and the first turn of
 * Saved carts. Its own turn goes on. No member pressed Stop, so each line
 * names that session.
 */
const stopper = sessionLink(autocompleteSessions.debounce)

/**
 * The session link of a session of Acme whose workspace the list of the org
 * does not hold, such as before the list loads, as the app builds it. Each
 * ID has the 43 characters of an ID of the app and no hyphen, so the link
 * has no place where a browser breaks a line by itself.
 */
const unknownStopper = appSessionLink(
  `https://${appDomain}`,
  orgs.acme.id,
  'cy_vut_icnuf6Yze5fvM69mhmFkppbqkkbgWDUcfh2A',
  'QaXjwqPCl0kOSmRovqEJONBAAV9c0s_nqUO8igy8GqU',
)

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
 * The chats of the sessions that an agent stopped. `cutOff` is the turn of
 * the first session of Checkout address autocomplete up to the call that a
 * stop cut off. In `stopped-from-unknown`, the agent of a session whose
 * workspace the list does not hold stopped that turn.
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
    'stopped-from-unknown': [
      ...cutOff,
      { kind: 'stopped', id: 'stopped', from: unknownStopper },
    ],
  } as const satisfies Record<string, readonly ChatItem[]>
}
