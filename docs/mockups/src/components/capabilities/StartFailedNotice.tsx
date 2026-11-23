import { actionButton } from '../../entries/components/common/actions.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { thisMacWords } from '../../../../../src/ui/components/capabilities/capabilitiesCopy'
import { startCauses, type FailedStart } from './MacAccessPart'

/**
 * The notice over the composer of a new workspace whose grant until Stop
 * did not start after the create. New workspace in the Mac app starts the
 * grant once the create gives the new workspace its ID, and its control
 * closes at the create. So the notice names the cause, and Try again
 * repeats the start on this Mac. The switch of Mac access in the
 * Capabilities of the new workspace shows off, with the same result.
 */
export function StartFailedNotice(props: { failure: FailedStart }) {
  return (
    <notice.Component
      action={
        <actionButton.Component
          accessibilityLabel={thisMacWords.tryAgainLabel}
          moklyInstance="grant-try-again"
        >
          {thisMacWords.tryAgain}
        </actionButton.Component>
      }
      body={startCauses[props.failure]}
      icon="circle-alert"
      moklyInstance="grant-not-started"
      title={thisMacWords.noticeTitle}
      tone="danger"
    />
  )
}
