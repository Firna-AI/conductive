import { X } from 'lucide-react'
import type { TerminalEntry } from '../shared/terminal'
import { ActionButton } from '../shell/ui/actions'
import { Dialog, DialogText } from '../shell/ui/Dialog'
import { terminalCopy, terminalName } from './terminalCopy'

/**
 * The question before a terminal closes, in the dialog of the app: a dialog
 * on desktop and a sheet on a phone. It names the terminal, says that its
 * shell and its running commands end for every member, and confirms in the
 * danger tone. Cancel, Escape, and a press outside keep the terminal.
 */
export function CloseTerminalQuestion(props: {
  terminal: TerminalEntry
  onCancel: () => void
  onConfirm: () => void
}) {
  const name = terminalName(props.terminal)
  return (
    <Dialog
      actions={
        <>
          <ActionButton onPress={props.onCancel}>Cancel</ActionButton>
          <ActionButton icon={X} onPress={props.onConfirm} tone="danger">
            {terminalCopy.closeConfirm}
          </ActionButton>
        </>
      }
      close={props.onCancel}
      title={terminalCopy.closeTitle(name)}
    >
      <DialogText>{terminalCopy.closeText}</DialogText>
    </Dialog>
  )
}
