import type { Viewport } from '@mokly/mokly'
import { RotateCcw } from 'lucide-react'
import { productName } from '../../brand'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'

/**
 * The question before Reset all. Each changed command gets its default
 * shortcuts again, on every Mac where the person uses the app, because the
 * account holds the changes (decision 190). Nothing brings the changes
 * back, so the tab asks first.
 */
export function ResetShortcutsDialog(props: {
  /** The number of commands with a change. */
  changed: number
  viewport: Viewport
}) {
  const commands =
    props.changed === 1 ? '1 command gets' : `${props.changed} commands get`
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.macShortcutsChanges}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.macShortcuts}>
            <ActionButton icon={RotateCcw} tone="danger">
              Reset all
            </ActionButton>
          </ScreenLink>
        </>
      }
      title="Reset all shortcuts?"
      viewport={props.viewport}
    >
      <DialogText>
        {commands} their default shortcuts again, wherever you use {productName}{' '}
        on a Mac.
      </DialogText>
    </ConfirmDialog>
  )
}
