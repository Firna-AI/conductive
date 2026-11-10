import type { SchemaProps, Viewport } from '@mokly/mokly'
import {
  openPaletteViews,
  paletteStatuses,
} from '../components/palette/paletteViews'
import { WorkspaceListScreen } from './WorkspaceListScreen'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace, type WorkspaceState } from './workspaceState'

export const commandPaletteSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['over', 'view'],
  properties: {
    /**
     * The page under the palette: the list of Acme, or the open workspace
     * Checkout address autocomplete, whose actions come first. `archived`
     * is the same workspace after its Archive, while the app keeps its
     * cloud computer, as Priya, a member who is not an admin, sees it.
     */
    over: { enum: ['list', 'workspace', 'archived'] },
    /** The tab, the filter, or the query that the palette shows. */
    view: { enum: openPaletteViews },
  },
} as const

export type CommandPaletteState = SchemaProps<typeof commandPaletteSchema>

/** The open workspace under the palette: as it is, or archived. */
const openWorkspaces: Readonly<
  Record<Exclude<CommandPaletteState['over'], 'list'>, WorkspaceState>
> = {
  workspace: readyWorkspace,
  archived: {
    ...readyWorkspace,
    sandbox: 'archived',
    conversation: 'history',
    banner: 'merged',
    viewer: 'member',
  },
}

/**
 * The command palette open over a page of the app. The list and the
 * workspace screens own the palette as a part of their state, so their
 * pages can draw it too. This screen chooses the page under it. The list
 * reads the same workspace list as the palette, so it shows the same
 * failure.
 */
export function CommandPaletteScreen(props: {
  state: CommandPaletteState
  viewport: Viewport
}) {
  const { over, view } = props.state
  if (over !== 'list') {
    return (
      <WorkspaceScreen
        state={{ ...openWorkspaces[over], palette: view }}
        viewport={props.viewport}
      />
    )
  }
  const failed = paletteStatuses[view] === 'list-failed'
  return (
    <WorkspaceListScreen
      state={{
        list: failed ? 'failed' : 'workspaces',
        menu: 'none',
        palette: view,
      }}
      viewport={props.viewport}
    />
  )
}
