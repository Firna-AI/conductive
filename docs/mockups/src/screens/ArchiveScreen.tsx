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
     * open, the archived workspace after the app deleted its cloud
     * computer, or the workspace back in its section after Restore.
     */
    view: {
      enum: ['archived', 'just-archived', 'group', 'deleted', 'restored'],
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

const workspaceStates: Readonly<Record<WorkspaceView, WorkspaceState>> = {
  archived,
  'just-archived': { ...archived, toast: 'archived' },
  deleted: { ...archived, archive: 'deleted' },
  restored: { ...archived, sandbox: 'stopped' },
}

/**
 * Archive and Restore of Checkout address autocomplete, as Cal sees them.
 * The workspace screen draws the workspace. The list screen draws the
 * Archived group, which a phone shows on its list page.
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
