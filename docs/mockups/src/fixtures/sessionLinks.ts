/**
 * The sessions that session links name. The address of a session is the
 * link of its workspace, then `sessions` and the ID of the session, a
 * random ID as the app gives it. A chat reads the sessions of each linked
 * workspace when it loads, open and closed, so a link can show the title
 * of a session of another workspace.
 */

import { closedSessions, workspaceSessions, type Session } from './sessions'
import { checkoutAutocomplete, savedCarts, type Workspace } from './workspaces'

/** A session that a link can name, with its workspace and its ID. */
export type LinkableSession = Pick<Session, 'key' | 'title'> & {
  workspace: Workspace
  id: string
  /** The tab of the session is closed, so the session is in the history. */
  closed: boolean
}

/** The app address of a session. */
export function sessionLink(session: LinkableSession): string {
  return `${session.workspace.link}/sessions/${session.id}`
}

function linkable(
  session: Session,
  id: string,
  closed: boolean,
  workspace: Workspace = checkoutAutocomplete,
): LinkableSession {
  return { key: session.key, title: session.title, workspace, id, closed }
}

const [autocomplete, debounce] = workspaceSessions
// The second and the fourth closed sessions: the postcode check, whose
// title is long, and the session with only a screenshot, which has none.
const [, postcode, , untitled] = closedSessions

/**
 * The sessions of Checkout address autocomplete that the links name: its
 * two open sessions, and two sessions whose tabs were closed.
 */
export const autocompleteSessions = {
  autocomplete: linkable(
    autocomplete,
    '7d3f0c2a-5b8e-4f61-9a0d-2c6e8b1f4a37',
    false,
  ),
  debounce: linkable(debounce, 'b1e94a6c-0f2d-4c8b-8e57-3a9d6f0c2e18', false),
  postcode: linkable(postcode, '4a8c2e6f-9b1d-4e3a-b7c5-0d2f8a6e1c94', true),
  untitled: linkable(untitled, 'e2f7b9d4-6c3a-4f80-a1e5-8b0c4d9f2a63', true),
} as const satisfies Record<string, LinkableSession>

/** The one session of Saved carts, which took the title of the workspace. */
export const savedCartsSession = linkable(
  { key: 'saved-carts', title: savedCarts.name },
  '9c0e5d1b-3a7f-4b2e-8d64-f1a2c7e9b053',
  false,
  savedCarts,
)

/** Every session that a link of the mockups names. */
export const linkableSessions: readonly LinkableSession[] = [
  ...Object.values(autocompleteSessions),
  savedCartsSession,
]
