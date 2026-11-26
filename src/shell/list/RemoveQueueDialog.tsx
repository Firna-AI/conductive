import { ListX } from 'lucide-react'
import { removeQuestion } from '../../ui/components/workspace/queueCopy'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import type { RemoveQuestion } from './row-queue'

/**
 * The question before Remove from queue, as a dialog on desktop and a
 * sheet on a phone. The entry loses its place, and its pull request
 * targets the base of the removal plan. A lower entry of a member stack names
 * the entries above it, which leave with it (decision 315). Remove closes
 * the question and runs the removal, which shows at once, as a move of the
 * list does. Cancel removes nothing.
 */
export function RemoveQueueDialog(props: {
  question: RemoveQuestion
  close: () => void
  confirm: (workspaceId: string) => void
}) {
  const { question } = props
  return (
    <Dialog
      action={
        <ActionButton
          icon={ListX}
          onPress={() => {
            props.close()
            props.confirm(question.workspaceId)
          }}
          tone="primary"
        >
          {removeQuestion.confirm}
        </ActionButton>
      }
      busy={false}
      close={props.close}
      title={removeQuestion.title}
    >
      <DialogText>
        {removeQuestion.body(question.number, question.base, question.above)}
      </DialogText>
    </Dialog>
  )
}
