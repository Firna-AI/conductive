import { useEffect, useRef } from 'react'
import styles from '../../../../docs/mockups/src/components/settings/ShortcutsSections.module.css'
import type { ShortcutCommand } from '../../../app/shortcuts/commands'
import type { ShortcutHost } from '../../../app/shortcuts/host'
import type {
  ShortcutKeyboard,
  ShortcutKeyText,
} from '../../../shared/shortcut-key'
import type { RowControls } from './RowButtons'
import { KeysRow, RecordingRow, ResetRow } from './RowStates'
import type { FocusTarget, ShortcutEditor } from './shortcut-edit'
import { Keys, RowLayout } from './ShortcutParts'

/** The control of a row that a focus target names, with Add as the fallback. */
function controlOf(
  controls: RowControls,
  at: Exclude<FocusTarget, 'search'>['at'],
): HTMLElement | null {
  if (typeof at === 'number') return controls.keys[at] ?? controls.add
  if (at === 'reset') return controls.reset ?? controls.keys[0] ?? controls.add
  return controls[at]
}

/**
 * The row of a command that a person can change, in its state: its keys,
 * the recorder that waits for a key, or a Reset whose default keys other
 * commands hold. After an edit, the focus moves to the control that the
 * editor names, such as the new key. Escape on Remove, Replace, or Cancel
 * ends the edit, as it does in the recorder.
 */
export function CommandRow(props: {
  command: ShortcutCommand
  keys: readonly ShortcutKeyText[]
  changed: boolean
  keyboard: ShortcutKeyboard
  host: ShortcutHost
  editor: ShortcutEditor
  /** The label of the one fixed row of the tab that holds a key. */
  fixedLabel: (key: ShortcutKeyText) => string | undefined
}) {
  const { command, editor } = props
  const edit = editor.edit?.command === command.id ? editor.edit : null
  const target = editor.focus
  const focus =
    target !== 'search' && target?.command === command.id ? target : null
  const controls = useRef<RowControls>({
    keys: [],
    add: null,
    reset: null,
    replace: null,
  })
  useEffect(() => {
    if (focus === null) return
    controlOf(controls.current, focus.at)?.focus()
    editor.focused()
  }, [focus, editor])
  const row = { ...props, controls }
  return (
    <li
      className={styles.row}
      onKeyDown={(event) => {
        if (edit === null || event.key !== 'Escape') return
        event.preventDefault()
        editor.cancel()
      }}
    >
      {edit?.kind === 'recording' ? (
        <RecordingRow {...row} edit={edit} fixedLabel={props.fixedLabel} />
      ) : edit?.kind === 'reset' ? (
        <ResetRow {...row} edit={edit} />
      ) : (
        <KeysRow {...row} changed={props.changed} />
      )}
    </li>
  )
}

/**
 * A fixed key: its keys, with no control. `note` adds the words Fixed
 * shortcut, for a fixed row among commands that a person can change.
 */
export function FixedRow(props: {
  label: string
  keys: readonly ShortcutKeyText[]
  keyboard: ShortcutKeyboard
  note: boolean
}) {
  return (
    <li className={styles.row}>
      <RowLayout
        keys={props.keys.map((key) => (
          <span className={styles.still} key={key}>
            <Keys keyboard={props.keyboard} shortcut={key} />
          </span>
        ))}
        label={props.label}
        note={
          props.note ? (
            <span className={styles.fixed}>Fixed shortcut</span>
          ) : undefined
        }
      />
    </li>
  )
}
