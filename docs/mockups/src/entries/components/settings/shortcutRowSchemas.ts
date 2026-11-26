import { shortcutSchema } from '../common/shortcutSchemas'
import { shortcutPages } from '../../../components/settings/shortcutPages'
import {
  editedShortcuts,
  recordingCommand,
  refusedShortcut,
  takenShortcut,
} from '../../../fixtures/shortcutChanges'
import type { TabBrowser } from '../../../fixtures/shortcutHosts'
import {
  commandLabel,
  defaultShortcuts,
  fixedLabel,
} from '../../../fixtures/shortcuts'

/** The shortcuts of a row. */
export const shortcutsSchema = { type: 'array', items: shortcutSchema } as const

/** A page of the catalogue that a control of a row opens. */
const pageSchema = { type: 'string', minLength: 1 } as const

/** The browsers of a normal tab, as `TabBrowser` lists them. */
export const tabBrowsers = [
  'Chrome',
  'Firefox',
] as const satisfies readonly TabBrowser[]

/** A shortcut that another command holds, as the fields of `HeldShortcut`. */
const heldProperties = {
  shortcut: shortcutSchema,
  /** The label of the command that holds it. */
  owner: { type: 'string' },
  /** The page that Cancel opens. */
  cancelTo: pageSchema,
  /** The page that Replace opens, when the catalogue draws it. */
  replaceTo: pageSchema,
} as const

/** A shortcut that another command holds, as `HeldShortcut`. */
export const heldSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['shortcut', 'owner', 'cancelTo'],
  properties: heldProperties,
} as const

/** A fixed shortcut that the recorder did not take, as `RefusedShortcut`. */
export const refusedSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['shortcut'],
  properties: {
    shortcut: shortcutSchema,
    /** The label of the one fixed row that holds it. */
    label: { type: 'string' },
  },
} as const

/** The state of the row of a command, as `CommandRowState`. */
export const commandRowStateSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'keys', 'changed'],
      properties: {
        kind: { const: 'shortcuts' },
        keys: shortcutsSchema,
        changed: { type: 'boolean' },
        /** A recorded shortcut that the app did not save. */
        unsaved: shortcutSchema,
        /** The page that a press on the first shortcut opens. */
        recordTo: pageSchema,
        /** The page that a press on + opens. */
        addTo: pageSchema,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'keys', 'cancelTo'],
      properties: {
        kind: { const: 'recording' },
        keys: shortcutsSchema,
        /** The pressed shortcut, which Remove takes off. */
        replaces: shortcutSchema,
        refused: refusedSchema,
        cancelTo: pageSchema,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'keys', 'shortcut', 'owner', 'cancelTo'],
      properties: {
        kind: { const: 'conflict' },
        keys: shortcutsSchema,
        replaces: shortcutSchema,
        ...heldProperties,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'keys', 'shortcut', 'owner', 'cancelTo'],
      properties: {
        kind: { const: 'reset-conflict' },
        /** The default shortcuts that Reset gives the command. */
        keys: shortcutsSchema,
        ...heldProperties,
      },
    },
  ],
} as const

/** The pages of the Keyboard shortcuts tab in Chrome on a Mac. */
export const chromePages = shortcutPages['chrome-mac']

/** The command whose row records in the catalogue: Keyboard shortcuts. */
export const recordingLabel = commandLabel(recordingCommand)

/** The default shortcuts of Keyboard shortcuts on a Mac. */
export const recordingKeys = defaultShortcuts(recordingCommand, 'mac')

/** Command palette after a change to ⇧⌘P, as the changes of the tab show it. */
export const changedRow = {
  label: commandLabel('command-palette'),
  keys: editedShortcuts['command-palette'] ?? [],
}

/** The shortcut of Model picker, which a recording of ⌘/ would take. */
export const heldShortcut = {
  shortcut: takenShortcut.shortcut,
  owner: commandLabel(takenShortcut.owner),
  cancelTo: chromePages.tab,
  ...(chromePages.changes ? { replaceTo: chromePages.changes } : {}),
}

/** The fixed shortcut ⌘Z of Undo, which the recorder of Chrome refuses. */
const undo = refusedShortcut('chrome-mac', 'refused')

const undoLabel = fixedLabel(undo, 'mac')

/** The refusal of ⌘Z, with the label of its fixed row. */
export const refusedUndo =
  undoLabel === undefined
    ? { shortcut: undo }
    : { shortcut: undo, label: undoLabel }
