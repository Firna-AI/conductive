import {
  paletteTabs,
  type PaletteStatus,
} from '../../../components/palette/paletteViews'
import { shortcutChangesSchema, shortcutHosts } from '../common/shortcutSchemas'
import {
  activityStatuses,
  workspaceSchema,
} from '../workspaces/workspaceSchemas'

/** The tabs of the palette, as `PaletteTab` lists them. */
export const paletteTabSchema = { enum: paletteTabs } as const

/** The workspace data that a palette lacks, as `PaletteStatus`. */
export const paletteStatusSchema = {
  enum: [
    'repositories-loading',
    'repositories-failed',
    'list-failed',
  ] as const satisfies readonly PaletteStatus[],
} as const

/** Where the palette opens, as `PaletteContext`. */
export const paletteContextSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['archivable'],
  properties: {
    /** The open workspace, whose actions come first. */
    open: {
      type: 'object',
      additionalProperties: false,
      required: ['workspace', 'status'],
      properties: {
        workspace: workspaceSchema,
        status: { enum: activityStatuses },
      },
    },
    archivable: { type: 'boolean' },
    restorable: { type: 'boolean' },
    /** The right column shows, so Hide the right column is an action. */
    rightColumn: { type: 'boolean' },
    /** The page can show the sidebar, so Hide the sidebar is an action. */
    sidebar: { type: 'boolean' },
    /** The palette of the Mac app, which adds This Mac to the settings. */
    mac: { type: 'boolean' },
    shortcuts: shortcutChangesSchema,
  },
} as const

/** The keys that the rows show, as `PaletteKeys`. */
export const paletteKeysSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['changes', 'host'],
  properties: {
    changes: shortcutChangesSchema,
    host: { enum: shortcutHosts },
  },
} as const
