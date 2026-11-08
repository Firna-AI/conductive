import type { PersonKey } from './members'

/**
 * The words of the app when it refuses to start the sandbox of a workspace
 * whose owner is suspended. The notice shows the words of a refusal as the
 * app gives them.
 */
export const ownerSuspendedRefusal =
  'The workspace owner is suspended. Ask an admin to assign another member.'

/**
 * The owner of the workspace whose start the app refuses: Jonas, a member
 * whom the operator suspended. A suspended user cannot sign in, so an
 * active admin views the workspace.
 */
export const suspendedOwner: PersonKey = 'jonas'
