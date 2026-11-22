import type { Viewport } from '@mokly/mokly'
import { Trash2 } from 'lucide-react'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { computerPageWords as words } from './ownComputerCopy'
import type { OwnComputer } from './ownComputer'

/**
 * The question before Remove computer. Each workspace of the org on the
 * computer stops, and the computer can no longer connect. Its workspaces
 * keep their chats but cannot start again. The app does not delete their
 * files on the server, so the question says where they stay. `cancel` is
 * the page that Cancel returns to, in the mockups.
 */
export function RemoveComputerDialog(props: {
  computer: OwnComputer
  org: string
  cancel: string
  viewport: Viewport
}) {
  const { computer } = props
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={props.cancel}>
            <ActionButton>{words.cancel}</ActionButton>
          </ScreenLink>
          <ActionButton icon={Trash2} tone="danger">
            {words.remove}
          </ActionButton>
        </>
      }
      title={words.confirmTitle(computer.name)}
      viewport={props.viewport}
    >
      <DialogText>
        {words.confirmBody(computer.name, props.org, computer.workspaces)}
      </DialogText>
      <DialogText>{words.filesNote}</DialogText>
    </ConfirmDialog>
  )
}
