import { Square } from 'lucide-react'
import {
  serviceControlCopy,
  servicesCopy,
} from '../../../../ui/components/tools/serviceCopy'
import { ActionButton } from '../../../ui/actions'
import { Dialog, DialogText } from '../../../ui/Dialog'

/**
 * The question before Stop: a Stop ends the service for every member, so it
 * asks first, as the close of a terminal does. Stop closes the question at
 * once, and the row shows Stopping… until the answer. Cancel sends nothing.
 */
export function StopServiceQuestion(props: {
  name: string
  close: () => void
  stop: () => void
}) {
  return (
    <Dialog
      action={
        <ActionButton icon={Square} onPress={props.stop} tone="danger">
          {servicesCopy.stop}
        </ActionButton>
      }
      busy={false}
      close={props.close}
      title={serviceControlCopy.stopTitle(props.name)}
    >
      <DialogText>{servicesCopy.stopBody}</DialogText>
    </Dialog>
  )
}
