import { defineComponent } from '@mokly/mokly'
import {
  CommandShortcuts,
  FixedShortcuts,
} from '../../../components/settings/ShortcutRows'
import { browserTabOf } from '../../../fixtures/shortcutHosts'
import { shortcutHosts } from '../common/shortcutSchemas'
import {
  changedRow,
  chromePages,
  commandRowStateSchema,
  heldShortcut,
  recordingKeys,
  recordingLabel,
  refusedUndo,
  shortcutsSchema,
} from './shortcutRowSchemas'

/** A fixed shortcut, registered with Mokly. */
export const fixedShortcuts = defineComponent({
  slug: 'fixed-shortcuts',
  title: 'Fixed shortcuts',
  description:
    'The row of a fixed shortcut on the Keyboard shortcuts tab: its label and its keys, with no control. Among commands that a person can change, it adds the words Fixed shortcut. Its own page shows Esc in a group of fixed rows.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'keys', 'note'],
    properties: {
      label: { type: 'string' },
      keys: shortcutsSchema,
      /** The row stands among commands, so it says Fixed shortcut. */
      note: { type: 'boolean' },
    },
  } as const,
  props: { label: 'Close a dialog or a menu', keys: [['Esc']], note: false },
  render: (props) => (
    <FixedShortcuts keys={props.keys} label={props.label} note={props.note} />
  ),
  variants: [
    {
      slug: 'note',
      title: 'Among commands',
      description: 'A fixed row among commands: the words Fixed shortcut.',
      props: { note: true },
    },
  ],
})

/**
 * The row of a command that a person can change, registered with Mokly.
 * `host` names the browser of a normal tab, whose kept keys the row dims.
 */
export const commandShortcuts = defineComponent({
  slug: 'command-shortcuts',
  title: 'Command shortcuts',
  description:
    'The row of a command on the Keyboard shortcuts tab, in its state: its shortcuts as buttons that record new keys, + to add one, and Reset after a change. While it records, the recorder takes the place of the pressed shortcut, with Remove and Cancel. A recorded shortcut that another command holds asks Replace or Cancel. A key that a normal browser tab keeps is dimmed. Its own page shows Keyboard shortcuts with its default key.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'state'],
    properties: {
      label: { type: 'string' },
      state: commandRowStateSchema,
      /** Where the app runs, which sets the keys that a browser keeps. */
      host: { enum: shortcutHosts },
    },
  } as const,
  props: {
    label: recordingLabel,
    state: { kind: 'shortcuts', keys: recordingKeys, changed: false },
    host: 'chrome-mac',
  },
  render: (props) => (
    <CommandShortcuts
      label={props.label}
      state={props.state}
      tab={props.host === undefined ? undefined : browserTabOf(props.host)}
    />
  ),
  variants: [
    {
      slug: 'recording',
      title: 'Recording',
      description:
        'The recorder in place of the pressed shortcut, after a fixed shortcut that it refused: Remove and Cancel.',
      props: {
        state: {
          kind: 'recording',
          keys: recordingKeys,
          ...(recordingKeys[0] ? { replaces: recordingKeys[0] } : {}),
          refused: refusedUndo,
          cancelTo: chromePages.tab,
        },
      },
    },
    {
      slug: 'conflict',
      title: 'Conflict',
      description:
        'A recorded shortcut that another command holds: Replace and Cancel, and the command that holds it.',
      props: {
        state: { kind: 'conflict', keys: recordingKeys, ...heldShortcut },
      },
    },
    {
      slug: 'changed',
      title: 'Changed',
      description:
        'Command palette after a change to ⇧⌘P: Reset after the label.',
      props: {
        label: changedRow.label,
        state: { kind: 'shortcuts', keys: changedRow.keys, changed: true },
      },
    },
    {
      slug: 'kept',
      title: 'Kept by the browser',
      description:
        'Close tab in a normal Chrome tab, which keeps ⌘W: that key is dimmed, and ⌥⌘W is not.',
      props: {
        label: 'Close tab',
        state: {
          kind: 'shortcuts',
          keys: [
            ['⌘', 'W'],
            ['⌥', '⌘', 'W'],
          ],
          changed: false,
        },
      },
    },
  ],
})
