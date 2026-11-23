import { actionButton } from '../../entries/components/common/actions.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { ScreenLink } from './ScreenLink'

/** The message of the server when the app cannot reach it. */
export const offlineMessage =
  "The app can't reach the server. Check the connection, then try again."

/**
 * Data that did not load, as the lists of the app show it: what failed,
 * the message of the server, and Try again, which loads it again. `body`
 * replaces the message when the server answered but a service behind it
 * did not, such as GitHub. `to` is the screen that shows the data after
 * Try again, when the mockups draw it.
 */
export function LoadFailure(props: {
  title: string
  body?: string
  to?: string
}) {
  const button = (
    <actionButton.Component icon="rotate-cw">Try again</actionButton.Component>
  )
  return (
    <notice.Component
      action={
        props.to ? (
          <ScreenLink asChild to={props.to}>
            {button}
          </ScreenLink>
        ) : (
          button
        )
      }
      body={props.body ?? offlineMessage}
      icon="triangle-alert"
      title={props.title}
      tone="danger"
    />
  )
}
