import type { SessionLogin } from '../components/chat/SessionLogin'
import { endpointLogins } from '../fixtures/logins'
import { memberViewer, people, you, type PersonKey } from '../fixtures/members'
import { linkedSession, workspaceSessions } from '../fixtures/sessions'
import type { Workspace } from '../fixtures/workspaces'
import { isNew } from './workspaceTabs'
import type { WorkspaceState } from './workspaceState'

/** The person signed in: Cal, an admin, or Priya, a member who is not. */
export function viewerOf(state: WorkspaceState): PersonKey {
  return state.viewer === 'admin' ? you : memberViewer
}

/**
 * The starter of the open session. The viewer starts a new session with +,
 * and the creator of a new workspace started its one session.
 */
function starterOf(state: WorkspaceState, workspace: Workspace): PersonKey {
  switch (state.tab) {
    case 'new-session':
      return viewerOf(state)
    case 'linked-session':
      return linkedSession.starter
    case 'session':
    case 'code':
    case 'markdown':
    case 'diff':
    case 'unnamed-file':
      return isNew(state) ? workspace.owner : workspaceSessions[0].starter
  }
}

/**
 * The starter of the open session when that starter is another member, so
 * that a message of the viewer runs on the login of that member. In the
 * session of the viewer, there is none.
 */
export function otherStarter(
  state: WorkspaceState,
  workspace: Workspace,
): PersonKey | undefined {
  const starter = starterOf(state, workspace)
  return starter === viewerOf(state) ? undefined : starter
}

/**
 * The host of the endpoint of the starter's login, when the state draws a
 * session that runs on Cal's proxy.
 */
export function endpointOf(
  state: WorkspaceState,
  workspace: Workspace,
): string | undefined {
  if (state.composer !== 'own-endpoint') return undefined
  const login = endpointLogins[workspace.choice.agent]
  return login?.kind === 'endpoint' ? login.host : undefined
}

/**
 * The display props of the login label in the composer. `member` is the
 * starter when that starter is another member. Without it, the composer has
 * no login label, because a message uses the own login of the viewer: in a
 * session of the viewer, or when a message opens a linked session.
 * `endpoint` is the host of the login of that member when it is an own
 * endpoint.
 */
export function sessionLoginFor(
  member: PersonKey | undefined,
  endpoint?: string,
): SessionLogin | undefined {
  if (member === undefined) return undefined
  return { starter: people[member].name, endpoint }
}
