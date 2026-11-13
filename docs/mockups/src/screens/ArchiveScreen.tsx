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
     * open, the workspace back in its section after Restore, or the
     * archived workspace without a kept cloud computer. Or a removed
     * workspace, whose 14 days ended, which a chip opens: after the app
     * deleted its cloud computer, or while that delete still tries again.
     */
    view: {
      enum: [
        'archived',
        'just-archived',
        'group',
        'restored',
        'no-computer',
        'removed',
        'removed-deleting',
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

const workspaceStates: Readonly<Record<WorkspaceView, WorkspaceState>> = {
  archived,
  'just-archived': { ...archived, toast: 'archived' },
  restored: { ...archived, sandbox: 'stopped' },
  'no-computer': { ...archived, archive: 'none' },
  removed,
  'removed-deleting': { ...removed, archive: 'removed-deleting' },
}

/**
 * Archive and Restore of Checkout address autocomplete, as Cal sees them,
 * and a workspace that left the list after its 14 days. The workspace
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
