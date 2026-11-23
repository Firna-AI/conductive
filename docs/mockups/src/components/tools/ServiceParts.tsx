import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { Square } from 'lucide-react'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import {
  ConfirmDialog,
  DialogText,
} from '../../../../../src/ui/components/common/ConfirmDialog'
import { FailureToast } from '../common/FailureToast'
import { Menu } from '../../../../../src/ui/components/common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import { Sheet } from '../../../../../src/ui/components/common/Sheet'
import { ToastLayer } from '../common/ToastLayer'
import {
  serviceControlCopy,
  servicesCopy,
  type ServiceEntry,
} from '../../../../../src/ui/components/tools/serviceCopy'
import { serviceMenu } from './serviceMenu'

/** The menu of a row on a phone, as a sheet with the name of the service. */
export function ServiceMenuSheet(props: { service: ServiceEntry }) {
  const { service } = props
  return (
    <Sheet title={service.name}>
      <Menu
        entries={serviceMenu(service.phase)}
        label={service.name}
        placement="sheet"
      />
    </Sheet>
  )
}

/**
 * The question before Stop. A Stop ends the service for every member, so
 * it asks first, as the close of a terminal does. Restart asks nothing.
 * `cancelTo` and `stopTo` are the screens of Cancel and Stop.
 */
export function StopServiceDialog(props: {
  service: ServiceEntry
  viewport: Viewport
  cancelTo: string
  stopTo: string
}) {
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={props.cancelTo}>
            <ActionButton>{servicesCopy.cancel}</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={props.stopTo}>
            <ActionButton icon={Square} tone="danger">
              {servicesCopy.stop}
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={serviceControlCopy.stopTitle(props.service.name)}
      viewport={props.viewport}
    >
      <DialogText>{servicesCopy.stopBody}</DialogText>
    </ConfirmDialog>
  )
}

/**
 * The result of a Stop that did not end as asked: it failed with the
 * message of the server, its reply was lost, or it named a run that ended
 * before it arrived. The last two change nothing that the list does not
 * show: the list shows the latest state of the service.
 */
export type StopResult =
  | { kind: 'failed'; message: string }
  | { kind: 'unconfirmed' }
  | { kind: 'stale' }

/** The toast of a result, at the place of the toasts of the app. */
export function ServiceResultToast(props: {
  name: string
  result: StopResult
  viewport: Viewport
}) {
  const phone = props.viewport === 'mobile'
  const { name, result } = props
  switch (result.kind) {
    case 'failed':
      return (
        <FailureToast
          message={result.message}
          phone={phone}
          title={serviceControlCopy.stopFailed(name)}
        />
      )
    case 'unconfirmed':
      return (
        <ToastLayer
          phone={phone}
          toast={{
            title: serviceControlCopy.unconfirmed('Stop', name),
            description: servicesCopy.latestState,
            tone: 'warning',
          }}
        />
      )
    case 'stale':
      return (
        <ToastLayer
          phone={phone}
          toast={{
            title: serviceControlCopy.stale('Stop'),
            description: serviceControlCopy.staleBody(name),
            tone: 'info',
          }}
        />
      )
  }
}
