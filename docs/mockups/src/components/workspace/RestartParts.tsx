import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { RotateCw } from 'lucide-react'
import { paths } from '../../paths'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import {
  ConfirmDialog,
  DialogText,
} from '../../../../../src/ui/components/common/ConfirmDialog'
import { Menu } from '../../../../../src/ui/components/common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import { Sheet } from '../../../../../src/ui/components/common/Sheet'
import { ToastLayer } from '../common/ToastLayer'
import { restartMenu } from './HeaderState'
import { restartCopy } from '../../../../../src/ui/components/workspace/restartCopy'

/** The menu of the header state on a phone, as a sheet. */
export function RestartSheet(props: { name: string }) {
  return (
    <Sheet title={props.name}>
      <Menu
        entries={restartMenu()}
        label={restartCopy.menuLabel}
        placement="sheet"
      />
    </Sheet>
  )
}

/**
 * The question before Restart while an agent works. The restart stops each
 * running turn. The terminals and their commands keep running.
 */
export function RestartDialog(props: { viewport: Viewport }) {
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.chat}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ActionButton icon={RotateCw} tone="primary">
            {restartCopy.confirmAction}
          </ActionButton>
        </>
      }
      title={restartCopy.confirmTitle}
      viewport={props.viewport}
    >
      <DialogText>{restartCopy.confirmBody}</DialogText>
    </ConfirmDialog>
  )
}

/**
 * The toast after Restart when the cloud computer could not check for
 * updates. The restart goes on with the installed software.
 */
export function UpdateCheckToast(props: { viewport: Viewport }) {
  return (
    <ToastLayer
      phone={props.viewport === 'mobile'}
      toast={{
        title: restartCopy.updateCheckFailed,
        description: restartCopy.updateCheckFailedBody,
        tone: 'warning',
      }}
    />
  )
}
