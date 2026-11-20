import type { Viewport } from '@mokly/mokly'
import { ArrowRightLeft } from 'lucide-react'
import { movedVariable } from '../../fixtures/orgValues'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { secretsWords } from '../secrets/secretsCopy'
import { moveWords } from './valuesCopy'

/**
 * The question before Move to secrets (item 2 C, open). An admin moves an
 * env var to the secrets without typing it again. The value moves in
 * the Worker and never reaches the browser. Cloud computers stop getting it
 * at their next start, so the dialog asks first.
 */
export function MoveValueDialog(props: { viewport: Viewport }) {
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.values}>
            <ActionButton>{secretsWords.cancel}</ActionButton>
          </ScreenLink>
          <ActionButton icon={ArrowRightLeft} tone="primary">
            {moveWords.confirm}
          </ActionButton>
        </>
      }
      title={moveWords.title(movedVariable)}
      viewport={props.viewport}
    >
      <DialogText>{moveWords.body}</DialogText>
      <DialogText>{moveWords.owner}</DialogText>
    </ConfirmDialog>
  )
}
