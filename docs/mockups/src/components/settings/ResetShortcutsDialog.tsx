import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { productName } from '../../../../../src/shared/brand'
import {
  keyboardOf,
  type Keyboard,
  type ShortcutHost,
} from '../../fixtures/shortcutHosts'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
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
  const cancel = (
    <actionButton.Component moklyInstance="dialog-cancel">
      Cancel
    </actionButton.Component>
  )
  return (
    <confirmDialog.Component
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
            <actionButton.Component
              icon="rotate-ccw"
              moklyInstance="dialog-reset-all"
              tone="danger"
            >
              Reset all
            </actionButton.Component>
          </ScreenLink>
        </>
      }
      moklyInstance="reset-shortcuts-dialog"
      title="Reset all shortcuts?"
      viewport={props.viewport}
    >
      <dialogText.Component>
        {commands} their default shortcuts again, wherever you use {productName}{' '}
        {keyboardPlaces[keyboardOf(props.host)]}.
      </dialogText.Component>
    </confirmDialog.Component>
  )
}
