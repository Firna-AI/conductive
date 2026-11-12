import type { ShortcutConflict } from '../../../app/shortcuts/keymap'
import type { ShortcutCommandId } from '../../../shared/shortcut-commands'
import type {
  ShortcutKeyboard,
  ShortcutKeyText,
} from '../../../shared/shortcut-key'
import { Keys, RowMessage } from './ShortcutParts'
import { commandLabel } from './tab-rows'
import type { FailedSave, Recording } from './shortcut-edit'

/** One line for each command that holds a key, as in "Model picker uses ⌘/." */
export function ConflictLines(props: {
  held: readonly ShortcutConflict[]
  keyboard: ShortcutKeyboard
}) {
  return props.held.map((held) => (
    <RowMessage key={`${held.command} ${held.key}`} tone="warning">
      {commandLabel(held.command)} uses{' '}
      <Keys keyboard={props.keyboard} shortcut={held.key} />.
    </RowMessage>
  ))
}

/**
 * The fixed key that the recorder did not take: it names the one fixed row
 * that holds the key, as in "Undo always uses ⌘Z.", or else says only that
 * the key is fixed.
 */
function RefusedLine(props: {
  shortcut: ShortcutKeyText
  keyboard: ShortcutKeyboard
  fixedLabel: (key: ShortcutKeyText) => string | undefined
}) {
  const label = props.fixedLabel(props.shortcut)
  const keys = <Keys keyboard={props.keyboard} shortcut={props.shortcut} />
  return (
    <RowMessage tone="info">
      {label === undefined ? (
        <>{keys} is a fixed shortcut.</>
      ) : (
        <>
          {label} always uses {keys}.
        </>
      )}
    </RowMessage>
  )
}

/**
 * The lines under a row that records: the commands that hold the recorded
 * key, or the fixed key that the recorder did not take. `id` names them
 * for the recorder, which they describe.
 */
export function EditMessage(props: {
  edit: Recording
  id: string
  keyboard: ShortcutKeyboard
  fixedLabel: (key: ShortcutKeyText) => string | undefined
}) {
  const { edit, keyboard } = props
  if (edit.held.length === 0 && edit.refused === undefined) return null
  return (
    <div id={props.id}>
      {edit.refused === undefined ? (
        <ConflictLines held={edit.held} keyboard={keyboard} />
      ) : (
        <RefusedLine
          fixedLabel={props.fixedLabel}
          keyboard={keyboard}
          shortcut={edit.refused}
        />
      )}
    </div>
  )
}

/**
 * The error of a failed save of the row, which names what failed. The row
 * keeps its saved keys.
 */
export function FailedLine(props: {
  failed: FailedSave | null
  id: ShortcutCommandId
  label: string
  keyboard: ShortcutKeyboard
}) {
  const { failed, keyboard } = props
  if (failed === null || failed.kind === 'not-reset-all') return null
  if (failed.command !== props.id) return null
  if (failed.kind === 'not-reset') {
    return (
      <RowMessage tone="danger">
        {props.label} wasn't reset. Try again.
      </RowMessage>
    )
  }
  const keys = <Keys keyboard={keyboard} shortcut={failed.key} />
  return (
    <RowMessage tone="danger">
      {keys} {failed.kind === 'not-saved' ? "wasn't saved" : "wasn't removed"}.
      Try again.
    </RowMessage>
  )
}
