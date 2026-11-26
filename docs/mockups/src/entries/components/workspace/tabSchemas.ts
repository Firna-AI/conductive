import type { TabKind } from '../../../components/workspace/TabItem'
import { menuSchema } from '../common/menuEntries'

/** The kinds of a tab, as `TabKind` lists them. */
const tabKinds = [
  'session',
  'code',
  'markdown',
  'file',
  'diff',
  'terminal',
  'preview',
  'skill',
] as const satisfies readonly TabKind[]

/** A tab of the centre column as JSON, with the fields of `WorkspaceTab`. */
export const workspaceTabSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['key', 'kind', 'title', 'selected'],
  properties: {
    key: { type: 'string' },
    kind: { enum: tabKinds },
    title: { type: 'string' },
    /** The screen that the tab shows, when the mockups draw it. */
    to: { type: 'string', minLength: 1 },
    selected: { type: 'boolean' },
    /** A session whose agent works: a spinner takes the place of its icon. */
    running: { type: 'boolean' },
    /** An open request gives the session tab a needs-input mark. */
    needsInput: { type: 'boolean' },
    /** The temporary tab, whose title shows in italics. */
    temporary: { type: 'boolean' },
    /** The label of the file can hide a secret value: no Copy path. */
    hidesPath: { type: 'boolean' },
  },
} as const

/** The entries of a menu, as the registered menu takes them. */
export const entriesSchema = menuSchema.properties.entries

/** The open menu of a tab, as `OpenTabMenu`. */
export const openTabMenuSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['entries', 'anchored'],
  properties: {
    entries: entriesSchema,
    /** Beside the tab, or in a sheet that the screen draws. */
    anchored: { type: 'boolean' },
  },
} as const

/** A tab in the middle of a drag, as `TabDrag`. */
export const tabDragSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['tab', 'index'],
  properties: {
    tab: { type: 'string' },
    /** The tab lands before the tab at this place, counted from 0. */
    index: { type: 'integer', minimum: 0 },
  },
} as const
