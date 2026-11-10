import { ToastLayer } from './ToastLayer'

/**
 * The toast that confirms a change that went through, such as a sent
 * feedback message. It sits where every toast of the app sits: at the
 * bottom right of the window, and at the bottom of a phone screen.
 */
export function SuccessToast(props: { title: string; phone: boolean }) {
  return (
    <ToastLayer
      phone={props.phone}
      toast={{ title: props.title, tone: 'success' }}
    />
  )
}
