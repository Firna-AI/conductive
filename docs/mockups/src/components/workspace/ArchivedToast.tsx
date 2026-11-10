import { noop } from '../../noop'
import { ToastLayer } from '../common/ToastLayer'

/**
 * The toast just after Archive, over the open workspace or over the list.
 * It names the workspace. While the workspace can come back, it offers
 * Restore, which does what Restore on the archived bar and on the row does.
 * A workspace without a kept cloud computer, such as a workspace from
 * Conductor that was never activated, gets no Restore.
 */
export function ArchivedToast(props: {
  name: string
  phone: boolean
  restorable: boolean
}) {
  return (
    <ToastLayer
      phone={props.phone}
      toast={{
        title: `${props.name} is archived.`,
        tone: 'success',
        action: props.restorable
          ? { label: 'Restore', onPress: noop }
          : undefined,
      }}
    />
  )
}
