import { archivedNow } from '../../fixtures/archive'
import { noop } from '../../noop'
import { ToastLayer } from '../common/ToastLayer'

/**
 * The toast just after Archive, over the open workspace or over the list.
 * It names the workspace, gives the day when it leaves the list, 14 days
 * after the Archive, and offers Restore, which does what Restore on the
 * archived bar and on the row does.
 */
export function ArchivedToast(props: { name: string; phone: boolean }) {
  return (
    <ToastLayer
      phone={props.phone}
      toast={{
        title: `${props.name} is archived.`,
        description: `It leaves the list on ${archivedNow.removedOn}.`,
        tone: 'success',
        action: { label: 'Restore', onPress: noop },
      }}
    />
  )
}
