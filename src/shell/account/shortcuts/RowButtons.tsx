import type { RefObject } from 'react'
import type { ShortcutCommand } from '../../../app/shortcuts/commands'
import type { ShortcutHost } from '../../../app/shortcuts/host'
import type {
  ShortcutKeyboard,
  ShortcutKeyText,
} from '../../../shared/shortcut-key'
import { ActionButton } from '../../ui/actions'
import type { Recording, ResetQuestion, ShortcutEditor } from './shortcut-edit'
import { KeyButton, spokenKey } from './ShortcutParts'
import { commandLabel, keptBy } from './tab-rows'

// The buttons of a row of a command, which its states share.

/** The controls of a row that can take the focus after an edit. */
export interface RowControls {
  keys: (HTMLButtonElement | null)[]
  add: HTMLElement | null
  reset: HTMLElement | null
  replace: HTMLElement | null
}

/** A ref that keeps the element of a Firna button of the row. */
export function keep(
  controls: RefObject<RowControls>,
  name: 'add' | 'reset' | 'replace',
) {
  return (element: unknown) => {
    controls.current[name] = element instanceof HTMLElement ? element : null
  }
}

/** What each state of a row reads. */
export interface RowProps {
  command: ShortcutCommand
  keys: readonly ShortcutKeyText[]
  keyboard: ShortcutKeyboard
  host: ShortcutHost
  editor: ShortcutEditor
  controls: RefObject<RowControls>
}

/** A key of a row as a button, which records in its place. */
export function keyButton(props: RowProps, key: ShortcutKeyText, at: number) {
  const { command, keyboard, editor } = props
  return (
    <KeyButton
      disabled={editor.saving}
      key={key}
      keyboard={keyboard}
      keptBy={keptBy(key, keyboard, props.host)}
      label={command.label}
      onPress={() => editor.record(command.id, key)}
      ref={(element) => {
        props.controls.current.keys[at] = element
      }}
      shortcut={key}
    />
  )
}

/** Cancel, which ends the edit, and the row keeps its keys. */
export function CancelButton(props: { editor: ShortcutEditor }) {
  return (
    <ActionButton
      disabled={props.editor.saving}
      onPress={props.editor.cancel}
      tone="plain"
    >
      Cancel
    </ActionButton>
  )
}

/** Replace, which takes the held keys from the other commands in one save. */
export function ReplaceButton(
  props: RowProps & { edit: Recording | ResetQuestion },
) {
  const { editor, keyboard, edit } = props
  const moved = edit.held
    .map(
      (held) =>
        `${spokenKey(held.key, keyboard)} from ${commandLabel(held.command)}`,
    )
    .join(' and ')
  return (
    <ActionButton
      accessibilityLabel={`Replace: move ${moved} to ${props.command.label}`}
      buttonRef={keep(props.controls, 'replace')}
      busy={editor.busy('replace', props.command.id)}
      disabled={editor.saving}
      onPress={editor.replace}
    >
      Replace
    </ActionButton>
  )
}
