import { toastLayer } from '../../entries/components/common/ToastLayer.mockup'

/**
 * The toast just after Archive, over the open workspace or over the list.
 * It names the workspace and offers Restore, which does what Restore on the
 * archived bar and on the row does.
 */
export function ArchivedToast(props: { name: string; phone: boolean }) {
  return (
    <toastLayer.Component
      moklyInstance="archived-toast"
      phone={props.phone}
      toast={{
        title: `${props.name} is archived.`,
        tone: 'success',
        action: { label: 'Restore' },
      }}
    />
  )
}
