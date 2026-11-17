import type { MenuEntry } from '../components/common/Menu'
import { workspaceMenuOf } from '../components/workspaces/workspaceMenu'
import type { PersonKey } from '../fixtures/members'
import { viewerOf } from './sessionStarter'
import type { WorkspaceState } from './workspaceState'

/**
 * The workspace menu that a right click on the header of the open workspace
 * opens: the menu of its row in the list, for the person signed in. The org
 * of the views has more than one section.
 */
export function headerMenuOf(
  state: WorkspaceState,
  owner: PersonKey,
): MenuEntry[] {
  return workspaceMenuOf({
    admin: state.viewer === 'admin',
    owner: viewerOf(state) === owner,
    archived: state.sandbox === 'archived',
    otherSection: true,
    readOnly: state.org === 'suspended',
  })
}
