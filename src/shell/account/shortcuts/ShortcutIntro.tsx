import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { productName } from '../../../../docs/mockups/src/brand'
import { KeyChips } from '../../../../docs/mockups/src/components/common/KeyChips'
import styles from '../../../../docs/mockups/src/components/settings/ShortcutsSections.module.css'
import type { ShortcutHost } from '../../../app/shortcuts/host'
import type { ShortcutKeyboard } from '../../../shared/shortcut-key'
import { ActionButton } from '../../ui/actions'
import { Dialog, DialogText } from '../../ui/Dialog'
import type { ShortcutEditor } from './shortcut-edit'
import { RowMessage } from './ShortcutParts'
import { dimmedKeysLine } from './tab-rows'

/**
 * The keys that the terminal keeps while it has the focus: every key
 * without ⌘ on a Mac, and every key with Ctrl or Alt on Windows and Linux.
 */
function TerminalLine(props: { keyboard: ShortcutKeyboard }) {
  if (props.keyboard === 'mac') {
    return (
      <p className={styles.introLine}>
        Keys without <KeyChips shortcut="⌘" /> go to the terminal while it has
        the focus.
      </p>
    )
  }
  return (
    <p className={styles.introLine}>
      Keys with <KeyChips shortcut="Ctrl" /> or <KeyChips shortcut="Alt" /> go
      to the terminal while it has the focus.
    </p>
  )
}

/** Where the changes of a keyboard apply: Windows and Linux share one. */
const keyboardPlaces: Readonly<Record<ShortcutKeyboard, string>> = {
  mac: 'on a Mac',
  other: 'on Windows or Linux',
}

/**
 * The question before Reset all, because nothing brings the changes back.
 * Reset all saves while the question shows, and the question closes when
 * the save ends.
 */
function ResetAllDialog(props: {
  changed: number
  keyboard: ShortcutKeyboard
  busy: boolean
  confirm: () => void
  close: () => void
}) {
  const commands =
    props.changed === 1 ? '1 command gets' : `${props.changed} commands get`
  return (
    <Dialog
      actions={
        <>
          <ActionButton onPress={props.close}>Cancel</ActionButton>
          <ActionButton
            busy={props.busy}
            icon={RotateCcw}
            onPress={props.confirm}
            tone="danger"
          >
            Reset all
          </ActionButton>
        </>
      }
      close={props.close}
      title="Reset all shortcuts?"
    >
      <DialogText>
        {commands} their default shortcuts again, wherever you use {productName}{' '}
        {keyboardPlaces[props.keyboard]}.
      </DialogText>
    </Dialog>
  )
}

/**
 * The lines above the groups: how to change a shortcut, the keys that the
 * terminal keeps, and in a normal browser tab, where the dimmed keys work.
 * Reset all follows them while the keyboard has a change, and the error of
 * a failed Reset all stands under them. After Reset all, the search field
 * takes the focus, because Reset all goes away.
 */
export function ShortcutIntro(props: {
  keyboard: ShortcutKeyboard
  host: ShortcutHost
  /** The number of commands with a change on this keyboard. */
  changed: number
  editor: ShortcutEditor
}) {
  const { keyboard, editor } = props
  const [asking, setAsking] = useState(false)
  const dimmed = dimmedKeysLine(keyboard, props.host)
  const confirm = async () => {
    const saved = await editor.resetAll()
    setAsking(false)
    if (saved) editor.focusSearch()
  }
  return (
    <div className={styles.intro}>
      <div className={styles.introText}>
        <p className={styles.introLine}>Select a shortcut to change it.</p>
        <TerminalLine keyboard={keyboard} />
        {dimmed ? <p className={styles.introLine}>{dimmed}</p> : null}
      </div>
      {props.changed > 0 ? (
        <ActionButton
          accessibilityLabel="Reset all shortcuts"
          disabled={editor.saving}
          icon={RotateCcw}
          onPress={() => setAsking(true)}
        >
          Reset all
        </ActionButton>
      ) : null}
      {editor.failed?.kind === 'not-reset-all' ? (
        <div className={styles.introError}>
          <RowMessage tone="danger">
            The shortcuts weren't reset. Try again.
          </RowMessage>
        </div>
      ) : null}
      {asking ? (
        <ResetAllDialog
          busy={editor.busy('reset-all')}
          changed={props.changed}
          close={() => setAsking(false)}
          confirm={() => void confirm()}
          keyboard={keyboard}
        />
      ) : null}
    </div>
  )
}
