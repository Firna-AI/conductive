import { readyWorkspace, type WorkspaceState } from './workspaceState'

/*
 * The workspaces of the pages where the request of an agent waits for a
 * person. The lock screen of the phone apps takes the title of each notice
 * of such a request from the same state, so the notice names the
 * workspace that its page shows.
 */

/**
 * The workspace of `app/secret-requests`: an agent asks for a secret, and
 * the request waits just above the composer.
 */
export const secretRequestWorkspace: WorkspaceState = {
  ...readyWorkspace,
  conversation: 'secret-waiting',
}

/**
 * The workspace of `app/mac-commands`: an agent asks to run a command on
 * the Mac of Cal, and the request waits for the Mac app.
 */
export const macCommandWorkspace: WorkspaceState = {
  ...readyWorkspace,
  conversation: 'mac-waiting',
}
