import { defineComponent } from '@mokly/mokly'
import {
  CancelButton,
  ConflictActions,
  ConflictLine,
  KeyButton,
  Recorder,
  RefusedLine,
  RemoveButton,
  RowLayout,
  RowMessage,
} from '../../../components/settings/ShortcutParts'
import { actionButton, iconButton } from '../common/actions.mockup'
import { keyChips } from '../common/KeyChips.mockup'
import { shortcutSchema } from '../common/shortcutSchemas'
import {
  chromePages,
  heldSchema,
  heldShortcut,
  recordingKeys,
  recordingLabel,
  refusedSchema,
  refusedUndo,
  tabBrowsers,
} from './shortcutRowSchemas'

const docs = ['docs/mockups/design.md']
const [shortcut = ['⌥', '⌘', '/']] = recordingKeys
/** The start of the closed object schema of each part. */
const closedObject = { type: 'object', additionalProperties: false } as const

/** One line under the shortcuts of a row, registered with Mokly. */
export const rowMessage = defineComponent({
  slug: 'row-message',
  title: 'Row message',
  description:
    'One line under the shortcuts of a row, with an icon: a note, a warning, or an error, such as a save that failed. A screen supplies the words, so its own page shows the icon of a note alone.',
  relatedDocs: docs,
  propSchema: {
    ...closedObject,
    required: ['tone'],
    properties: { tone: { enum: ['info', 'warning', 'danger'] } },
  } as const,
  slots: ['children'],
  props: { tone: 'info' },
  render: (props) => (
    <RowMessage tone={props.tone}>{props.children}</RowMessage>
  ),
  variants: [
    {
      slug: 'danger',
      title: 'Error',
      description: 'A recorded shortcut that the app did not save.',
      props: { tone: 'danger' },
      slots: {
        children: (
          <>
            <keyChips.Component shortcut={['⇧', '⌘', 'P']} /> wasn&apos;t saved.
            Try again.
          </>
        ),
      },
    },
    {
      slug: 'warning',
      title: 'Warning',
      description: 'The command that holds a recorded shortcut.',
      props: { tone: 'warning' },
      slots: { children: 'Model picker uses ⌘/.' },
    },
  ],
})

/** A shortcut that records a new one when pressed, registered with Mokly. */
export const keyButton = defineComponent({
  slug: 'key-button',
  title: 'Key button',
  description:
    'A shortcut of a row as a button that records new keys in its place when pressed. A key that a normal browser tab keeps is dimmed, and its spoken name says so. Its own page shows the shortcut of Keyboard shortcuts.',
  relatedDocs: docs,
  propSchema: {
    ...closedObject,
    required: ['shortcut', 'label'],
    properties: {
      shortcut: shortcutSchema,
      /** The label of the command of the row. */
      label: { type: 'string' },
      /** The page that a press opens, when the catalogue draws it. */
      to: { type: 'string', minLength: 1 },
      /** The browser that keeps the shortcut in a normal tab. */
      keptBy: { enum: tabBrowsers },
    },
  } as const,
  props: { shortcut, label: recordingLabel },
  render: (props) => (
    <KeyButton
      keptBy={props.keptBy}
      label={props.label}
      shortcut={props.shortcut}
      to={props.to}
    />
  ),
  variants: [
    {
      slug: 'linked',
      title: 'Opens the recorder',
      description: 'A shortcut that opens the page of the recording row.',
      props: { to: chromePages.recording ?? chromePages.tab },
    },
    {
      slug: 'kept',
      title: 'Kept by the browser',
      description: 'A key that Chrome keeps in a normal tab: dimmed.',
      props: { shortcut: ['⌘', 'W'], label: 'Close tab', keptBy: 'Chrome' },
    },
  ],
})

/** The field that records the keys, registered with Mokly. */
export const recorder = defineComponent({
  slug: 'recorder',
  title: 'Recorder',
  description:
    'The field that waits for the keys of a row, or shows a shortcut that waits for Replace or Cancel. Its own page shows the field that waits.',
  relatedDocs: docs,
  propSchema: {
    ...closedObject,
    properties: { shortcut: shortcutSchema },
  } as const,
  render: (props) => <Recorder shortcut={props.shortcut} />,
  variants: [
    {
      slug: 'recorded',
      title: 'Recorded',
      description: 'A recorded shortcut that another command holds.',
      props: { shortcut: heldShortcut.shortcut },
    },
  ],
})

/** Cancel of a recording, registered with Mokly. */
export const cancelButton = defineComponent({
  slug: 'cancel-button',
  title: 'Cancel button',
  description:
    'Cancel at the end of a row that records or asks, which ends it and keeps the keys.',
  relatedDocs: docs,
  propSchema: {
    ...closedObject,
    required: ['to'],
    properties: { to: { type: 'string', minLength: 1 } },
  } as const,
  props: { to: chromePages.tab },
  render: (props) => <CancelButton to={props.to} />,
})

/** Remove of the pressed shortcut, registered with Mokly. */
export const removeButton = defineComponent({
  slug: 'remove-button',
  title: 'Remove button',
  description:
    'Remove beside Cancel while the recorder replaces a shortcut: it takes that shortcut off the command, and saves at once.',
  relatedDocs: docs,
  propSchema: {
    ...closedObject,
    required: ['shortcut', 'label'],
    properties: { shortcut: shortcutSchema, label: { type: 'string' } },
  } as const,
  props: { shortcut, label: recordingLabel },
  render: (props) => (
    <RemoveButton label={props.label} shortcut={props.shortcut} />
  ),
})

/** Replace and Cancel of a conflict, registered with Mokly. */
export const conflictActions = defineComponent({
  slug: 'conflict-actions',
  title: 'Conflict actions',
  description:
    'Replace and Cancel at the end of a row whose shortcut another command holds. Replace moves the shortcut to the row in one save, and Cancel keeps the keys of both commands.',
  relatedDocs: docs,
  propSchema: {
    ...closedObject,
    required: ['held', 'label'],
    properties: { held: heldSchema, label: { type: 'string' } },
  } as const,
  props: { held: heldShortcut, label: recordingLabel },
  render: (props) => <ConflictActions held={props.held} label={props.label} />,
})

/** The line that names the command that holds a shortcut, registered with Mokly. */
export const conflictLine = defineComponent({
  slug: 'conflict-line',
  title: 'Conflict line',
  description:
    'The warning under a row that names the command that holds its shortcut, such as "Model picker uses ⌘/."',
  relatedDocs: docs,
  propSchema: {
    ...closedObject,
    required: ['held'],
    properties: { held: heldSchema },
  } as const,
  props: { held: heldShortcut },
  render: (props) => <ConflictLine held={props.held} />,
})

/** The line of a fixed shortcut that the recorder refused, registered with Mokly. */
export const refusedLine = defineComponent({
  slug: 'refused-line',
  title: 'Refused line',
  description:
    'The note under a row whose recorder did not take a fixed shortcut: it names the fixed row of the shortcut, such as "Undo always uses ⌘Z.", or says that the shortcut is fixed. Its own page shows ⌘Z.',
  relatedDocs: docs,
  propSchema: {
    ...closedObject,
    required: ['refused'],
    properties: { refused: refusedSchema },
  } as const,
  props: { refused: refusedUndo },
  render: (props) => <RefusedLine refused={props.refused} />,
  variants: [
    {
      slug: 'fixed',
      title: 'Fixed shortcut',
      description: 'A shortcut that several fixed rows hold: it is fixed.',
      props: { refused: { shortcut: ['Space'] } },
    },
  ],
})

/**
 * The line of a row, registered with Mokly. A row supplies its note, its
 * shortcuts, its control at the end, and its message in slots.
 */
export const rowLayout = defineComponent({
  slug: 'row-layout',
  title: 'Row layout',
  description:
    'The line of a row of the Keyboard shortcuts tab: the label, a note or Reset, the shortcuts, and the control at the end, then a message under them. A row supplies all but the label, so its own page shows the label alone.',
  relatedDocs: docs,
  propSchema: {
    ...closedObject,
    required: ['label'],
    properties: { label: { type: 'string' } },
  } as const,
  slots: ['note', 'keys', 'end', 'message'],
  props: { label: recordingLabel },
  render: (props) => (
    <RowLayout
      end={props.end}
      keys={props.keys}
      label={props.label}
      message={props.message}
      note={props.note}
    />
  ),
  variants: [
    {
      slug: 'changed',
      title: 'Changed',
      description:
        'A changed row: Reset after the label, its shortcut, +, and a save that failed.',
      props: {},
      slots: {
        note: (
          <actionButton.Component tone="plain">Reset</actionButton.Component>
        ),
        keys: <keyChips.Component shortcut={['⇧', '⌘', 'P']} />,
        end: <iconButton.Component icon="plus" label="Add shortcut" quiet />,
        message: (
          <rowMessage.Component tone="danger">
            The shortcut wasn&apos;t saved. Try again.
          </rowMessage.Component>
        ),
      },
    },
  ],
})
