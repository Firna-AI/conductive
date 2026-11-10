import { useStore } from '../../app/store'
import { useApp } from '../context'
import { FeedbackDialog } from './FeedbackDialog'

/**
 * The Feedback dialog over the frame, while the feedback model says that it
 * is open. Each frame of the app has this layer beside the palette, which
 * opens the dialog, on desktop and on a phone. A page that is not signed in
 * shows no dialog.
 */
export function FeedbackLayer() {
  const app = useApp()
  const { open } = useStore(app.feedback.state)
  const boot = useStore(app.boot)
  if (!open || boot.state !== 'ready') return null
  return <FeedbackDialog />
}
