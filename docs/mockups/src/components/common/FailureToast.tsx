import { toastLayer } from '../../entries/components/common/ToastLayer.mockup'

/**
 * The toast that names a change that failed, such as a change of the list,
 * with the message of the server. The app shows it at the bottom right of
 * the window, and at the bottom of a phone screen.
 */
export function FailureToast(props: {
  title: string
  message: string
  phone: boolean
}) {
  return (
    <toastLayer.Component
      phone={props.phone}
      toast={{ title: props.title, description: props.message, tone: 'error' }}
    />
  )
}
