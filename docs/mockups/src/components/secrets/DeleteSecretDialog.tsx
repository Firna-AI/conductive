import type { Viewport } from '@mokly/mokly'
import { Trash2 } from 'lucide-react'
import { deletedSecret } from '../../fixtures/secrets'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { deleteTitle, secretsWords } from './secretsCopy'

/**
 * The question before Delete. A deleted secret ends each of its grants,
 * and its value cannot come back, so the dialog asks first.
 */
export function DeleteSecretDialog(props: { viewport: Viewport }) {
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.secrets}>
            <ActionButton>{secretsWords.cancel}</ActionButton>
          </ScreenLink>
          <ActionButton icon={Trash2} tone="danger">
            {secretsWords.delete}
          </ActionButton>
        </>
      }
      title={deleteTitle(deletedSecret.name)}
      viewport={props.viewport}
    >
      <DialogText>{secretsWords.deleteBody}</DialogText>
    </ConfirmDialog>
  )
}
