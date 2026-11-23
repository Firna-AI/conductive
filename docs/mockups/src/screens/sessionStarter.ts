import type { SessionLogin } from '../../../../src/ui/components/chat/SessionLogin'
import { memberViewer, people, you, type PersonKey } from '../fixtures/members'
import { orgWithLogin } from '../fixtures/orgLogins'
import {
  linkedSession,
  startedSession,
  workspaceSessions,
} from '../fixtures/sessions'
import { explanations } from '../fixtures/explanations'
import type { Workspace } from '../fixtures/workspaces'
import { isNew } from './workspaceTabs'
import type { WorkspaceState } from './workspaceState'

/** The person signed in: Cal, an admin, or Priya, a member who is not. */
export function viewerOf(state: WorkspaceState): PersonKey {
  return state.viewer === 'admin' ? you : memberViewer
}

/**
 * The starter of the open session. The viewer starts a new session with +,
 * and the creator of a new workspace started its one session. Cal started
 * both sessions of Checkout address autocomplete, and the empty session
 * that the viewer opens from his tab.
 */
function starterOf(state: WorkspaceState, workspace: Workspace): PersonKey {
  switch (state.tab) {
    case 'new-session':
      return viewerOf(state)
    case 'linked-session':
      return linkedSession.starter
    case 'later-session':
      return workspaceSessions[1].starter
    case 'started-session':
      return startedSession.starter
    case 'explanation':
      return explanations.count.starter
    case 'session':
    case 'code':
    case 'code-lines':
    case 'markdown':
    case 'diff':
    case 'unnamed-file':
    case 'image':
    case 'image-not-drawn':
    case 'attachment':
    case 'screenshot':
    case 'html':
    case 'html-source':
    case 'html-opening':
    case 'html-older-software':
    case 'html-failed':
    case 'preview':
    case 'preview-behind':
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
 * The name of the owner of the login of the open session, when that login
 * is not the own login of the viewer: the org, such as "Acme", for a session
 * on the org login, or the starter, when that starter is another member. A
 * new session takes the default login of the viewer, which `login` sets to
 * the org login (decisions 4, 6 A, and 7 B of the org logins plan). The
 * org login is no member's own login, so every member sees its name. On the
 * own login of the viewer, there is none.
 */
export function loginOwnerOf(
  state: WorkspaceState,
  workspace: Workspace,
): string | undefined {
  if (state.login === 'org') return orgWithLogin.name
  const starter = otherStarter(state, workspace)
  return starter === undefined ? undefined : people[starter].name
}

/**
 * The display props of the login label in the composer: the name of the
 * owner of the login, such as "Cal" or "Acme". Without it, the composer has
 * no login label, because a message uses the own login of the viewer: in a
 * session of the viewer on their own login, or when a message opens a
 * linked session.
 */
export function sessionLoginFor(
  owner: string | undefined,
): SessionLogin | undefined {
  return owner === undefined ? undefined : { owner }
}
