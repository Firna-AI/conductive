import type { SchemaProps, Viewport } from '@mokly/mokly'
import { WorkspaceListScreen } from './WorkspaceListScreen'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace, type WorkspaceState } from './workspaceState'

export const archiveSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['view'],
  properties: {
    /**
     * The archived workspace with Restore on its bar, the same workspace
     * just after Archive with its toast, the list with its Archived group
     * open, the workspace back in its section after Restore, the archived
     * workspace while an unresolved create request can still hold a cloud
     * computer that the workspace does not name, or the archived workspace
     * after the app deleted its cloud computer. Or a removed workspace,
     * whose 14 days ended, which a chip opens: after the app deleted its
     * cloud computer, or while that delete still tries again. Or the
     * archived workspace on old-runner, an own computer that an admin
     * removed, in its 14 days and after them.
     */
    view: {
      enum: [
        'archived',
        'just-archived',
        'group',
        'restored',
        'pending',
        'no-computer',
        'removed',
        'removed-deleting',
        'computer-removed',
        'computer-removed-left',
      ],
    },
  },
} as const

export type ArchiveState = SchemaProps<typeof archiveSchema>

type WorkspaceView = Exclude<ArchiveState['view'], 'group'>

/** Checkout address autocomplete, archived after the merge of its branch. */
const archived: WorkspaceState = {
  ...readyWorkspace,
  sandbox: 'archived',
  conversation: 'history',
  banner: 'merged',
}

/**
 * Postcode lookup for the shipping and billing forms, archived 3 weeks ago
 * without a pull request. Its 14 days ended, so it left the list.
 */
const removed: WorkspaceState = {
  ...readyWorkspace,
  workspace: 'postcode-lookup',
  sandbox: 'archived',
  archive: 'removed',
  conversation: 'postcode-history',
  banner: 'none',
}

/**
 * Checkout address autocomplete, archived on old-runner, an own computer
 * that an admin removed from Acme. The app deletes nothing there, so its
 * files stay on that server.
 */
const onRemovedComputer: WorkspaceState = { ...archived, computer: 'removed' }

const workspaceStates: Readonly<Record<WorkspaceView, WorkspaceState>> = {
  archived,
  'just-archived': { ...archived, toast: 'archived' },
  restored: { ...archived, sandbox: 'stopped' },
  pending: { ...archived, archive: 'pending' },
  'no-computer': { ...archived, archive: 'none' },
  removed,
  'removed-deleting': { ...removed, archive: 'removed-deleting' },
  'computer-removed': onRemovedComputer,
  'computer-removed-left': { ...onRemovedComputer, archive: 'removed' },
}

/**
 * Archive and Restore of Checkout address autocomplete, as Cal sees them,
 * a workspace that left the list after its 14 days, and an archived
 * workspace whose own computer an admin removed. The workspace
 * screen draws the workspace. The list screen draws the Archived group,
 * which a phone shows on its list page.
 */
export function ArchiveScreen(props: {
  state: ArchiveState
  viewport: Viewport
}) {
  const { view } = props.state
  if (view === 'group') {
    return (
      <WorkspaceListScreen
        state={{ list: 'archived', menu: 'none', palette: 'closed' }}
        viewport={props.viewport}
      />
    )
  }
  return (
    <WorkspaceScreen state={workspaceStates[view]} viewport={props.viewport} />
  )
}
