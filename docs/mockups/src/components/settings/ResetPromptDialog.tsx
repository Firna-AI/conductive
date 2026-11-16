import type { Viewport } from '@mokly/mokly'
import { RotateCcw } from 'lucide-react'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { agentActionLabels, type AgentAction } from '../workspace/barCopy'
import { promptsCopy } from './promptsCopy'

/**
 * The question before Reset to default. Reset deletes the steps that the
 * org saved for the action, and each press then sends the default steps.
 * Nothing brings those steps back, so the tab asks first, as Reset all of
 * the keyboard shortcuts does. Cancel goes back to the edited tab, and
 * Reset to the tab with the default steps.
 */
export function ResetPromptDialog(props: {
  action: AgentAction
  org: string
  viewport: Viewport
}) {
  const copy = promptsCopy.resetQuestion
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.promptsEdited}>
            <ActionButton>{copy.cancel}</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.prompts}>
            <ActionButton icon={RotateCcw} tone="danger">
              {copy.confirm}
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={copy.title(agentActionLabels[props.action])}
      viewport={props.viewport}
    >
      <DialogText>{copy.body(props.org)}</DialogText>
    </ConfirmDialog>
  )
}
