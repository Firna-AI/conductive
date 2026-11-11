import type { SchemaProps, Viewport } from '@mokly/mokly'
import { WorkspaceListScreen } from './WorkspaceListScreen'
import { WorkspaceScreen } from './WorkspaceScreen'
import { importedWorkspace, type WorkspaceState } from './workspaceState'

export const importedArchiveSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['view'],
  properties: {
    /**
     * The workspace from Conductor after its activation and its Archive:
     * the archived workspace with Restore on its bar, the same workspace
     * just after Archive with its toast, the list with its Archived group
     * open, or the Markdown of its old session.
     */
    view: { enum: ['archived', 'just-archived', 'group', 'document'] },
  },
} as const

export type ImportedArchiveState = SchemaProps<typeof importedArchiveSchema>

type WorkspaceView = Exclude<ImportedArchiveState['view'], 'group'>

/**
 * Coupon totals at checkout, archived after its activation succeeded. The
 * app keeps its cloud computer until the last day of Restore. Its chat
 * shows Apply coupons before tax, the session that resumed with the
 * memory of its agent.
 */
const archived: WorkspaceState = {
  ...importedWorkspace,
  workspace: 'coupon-totals-activated',
  sandbox: 'archived',
  archive: 'kept',
  tab: 'session',
  resume: 'memory',
}

const workspaceStates: Readonly<Record<WorkspaceView, WorkspaceState>> = {
  archived,
  'just-archived': { ...archived, toast: 'archived' },
  document: { ...archived, tab: 'old-session' },
}

/**
 * Archive and Restore of an activated workspace from Conductor, as Cal sees
 * them. Archive is one action, as for every activated workspace. The
 * workspace screen draws the workspace. The list screen draws the Archived
 * group, which a phone shows on its list page.
 */
export function ImportedArchiveScreen(props: {
  state: ImportedArchiveState
  viewport: Viewport
}) {
  const { view } = props.state
  if (view === 'group') {
    return (
      <WorkspaceListScreen
        state={{
          list: 'imported-activated-archived',
          menu: 'none',
          palette: 'closed',
        }}
        viewport={props.viewport}
      />
    )
  }
  return (
    <WorkspaceScreen state={workspaceStates[view]} viewport={props.viewport} />
  )
}
