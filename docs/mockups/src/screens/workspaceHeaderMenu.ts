import { workspaceMenuOf } from '../components/workspaces/rowControls'
import type { MenuEntryData } from '../entries/components/common/menuEntries'
import type { PersonKey } from '../fixtures/members'
import { headerQueueAction } from './queueBarStates'
import { viewerOf } from './sessionStarter'
import type { WorkspaceState } from './workspaceState'

/**
 * The workspace menu that a press on the name of the open workspace in its
 * header opens: the menu of its row in the list, for the person signed in. The org
 * of the views has more than one section. A state of the merge queue adds
 * its item, for a viewer with write access.
 */
export function headerMenuOf(
  state: WorkspaceState,
  owner: PersonKey,
): MenuEntryData[] {
  const readOnly = state.org === 'suspended'
  const queue = readOnly
    ? undefined
    : headerQueueAction(state.queue, state.access === 'write')
  return workspaceMenuOf(
    {
      admin: state.viewer === 'admin',
      owner: viewerOf(state) === owner,
      archived: state.sandbox === 'archived',
      otherSection: true,
      readOnly,
    },
    undefined,
    queue,
  )
}
