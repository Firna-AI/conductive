import type { Viewport } from '@mokly/mokly'
import { RotateCcw } from 'lucide-react'
import { productName } from '../../brand'
import {
  keyboardOf,
  type Keyboard,
  type ShortcutHost,
} from '../../fixtures/shortcutHosts'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { shortcutPages } from './shortcutPages'

/** Where the changes of a keyboard apply: Windows and Linux share one. */
const keyboardPlaces: Readonly<Record<Keyboard, string>> = {
  mac: 'on a Mac',
  windows: 'on Windows or Linux',
}

/**
 * The question before Reset all. Each changed command gets its default
 * shortcuts again, wherever the person uses the app with the same
 * keyboard, because the account holds the changes of each keyboard
 * (decision 190). Nothing brings the changes back, so the tab asks first.
 * Cancel goes back to the changes, and Reset all to the tab of the host.
 */
export function ResetShortcutsDialog(props: {
  /** The number of commands with a change. */
  changed: number
  host: ShortcutHost
  viewport: Viewport
}) {
  const pages = shortcutPages[props.host]
  const commands =
    props.changed === 1 ? '1 command gets' : `${props.changed} commands get`
  const cancel = <ActionButton>Cancel</ActionButton>
  return (
    <ConfirmDialog
      actions={
        <>
          {pages.changes ? (
            <ScreenLink asChild to={pages.changes}>
              {cancel}
            </ScreenLink>
          ) : (
            cancel
          )}
          <ScreenLink asChild to={pages.tab}>
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
        {keyboardPlaces[keyboardOf(props.host)]}.
      </DialogText>
    </ConfirmDialog>
  )
}
