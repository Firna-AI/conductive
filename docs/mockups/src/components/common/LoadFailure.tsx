import { RotateCw, TriangleAlert } from 'lucide-react'
import { ActionButton } from './actions'
import { Notice } from './Notice'
import { ScreenLink } from './ScreenLink'

/** The message of the server when the app cannot reach it. */
export const offlineMessage =
  "The app can't reach the server. Check the connection, then try again."

/**
 * Data that did not load, as the lists of the app show it: what failed,
 * the message of the server, and Try again, which loads it again. `to` is
 * the screen that shows the data after Try again, when the mockups draw it.
 */
export function LoadFailure(props: { title: string; to?: string }) {
  const button = <ActionButton icon={RotateCw}>Try again</ActionButton>
  return (
    <Notice
      action={
        props.to ? (
          <ScreenLink asChild to={props.to}>
            {button}
          </ScreenLink>
        ) : (
          button
        )
      }
      body={offlineMessage}
      icon={TriangleAlert}
      title={props.title}
      tone="danger"
    />
  )
}
