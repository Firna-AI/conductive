import type { SchemaProps, Viewport } from '@mokly/mokly'
import { openPaletteViews } from '../components/palette/paletteViews'
import { WorkspaceListScreen } from './WorkspaceListScreen'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace } from './workspaceState'

export const commandPaletteSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['over', 'view'],
  properties: {
    /**
     * The page under the palette: the list of Acme, or the open workspace
     * Checkout address autocomplete, whose actions come first.
     */
    over: { enum: ['list', 'workspace'] },
    /** The tab, the filter, or the query that the palette shows. */
    view: { enum: openPaletteViews },
  },
} as const

export type CommandPaletteState = SchemaProps<typeof commandPaletteSchema>

/**
 * The command palette open over a page of the app. The list and the
 * workspace screens own the palette as a part of their state, so their
 * pages can draw it too. This screen chooses the page under it.
 */
export function CommandPaletteScreen(props: {
  state: CommandPaletteState
  viewport: Viewport
}) {
  const { over, view } = props.state
  if (over === 'workspace') {
    return (
      <WorkspaceScreen
        state={{ ...readyWorkspace, palette: view }}
        viewport={props.viewport}
      />
    )
  }
  return (
    <WorkspaceListScreen
      state={{ list: 'workspaces', menu: 'none', palette: view }}
      viewport={props.viewport}
    />
  )
}
