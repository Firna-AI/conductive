import type { OpenWorkspace } from '../workspaces/sections'
import {
  appActions,
  helpActions,
  macActions,
  orgActions,
  workspaceActions,
  type Command,
} from './paletteCommands'

/**
 * Where the palette opens: over an open workspace, whose actions come
 * first, or over a page without one. Only the owner of the workspace and
 * the admins of the org can archive it. Every member of an org that is
 * not suspended can restore an archived workspace while the app keeps its
 * cloud computer. `mac` marks the window of the Mac app, which adds its
 * own actions.
 */
export type PaletteContext = {
  open?: OpenWorkspace
  archivable: boolean
  restorable?: boolean
  rightColumn?: boolean
  mac?: boolean
}

/** The actions of the org, with those of the Mac app in its window. */
export function orgActionsOf(context: PaletteContext): readonly Command[] {
  return context.mac ? [...orgActions, ...macActions] : orgActions
}

/** The actions of the open workspace, when the palette has one. */
export function openActions(context: PaletteContext): Command[] {
  if (!context.open) return []
  return workspaceActions({
    archived: context.open.status === 'archived',
    archivable: context.archivable,
    restorable: context.restorable ?? false,
    rightColumn: context.rightColumn ?? true,
  })
}

/**
 * The actions in their order: those of the open workspace, of the org, and
 * of the orgs, then Send feedback, which comes last.
 */
export function actionsOf(context: PaletteContext): Command[] {
  return [
    ...openActions(context),
    ...orgActionsOf(context),
    ...appActions,
    ...helpActions,
  ]
}
