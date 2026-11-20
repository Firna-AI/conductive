import { CircleAlert } from 'lucide-react'
import { ActionButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { thisMacWords } from './capabilitiesCopy'
import { startCauses, type FailedStart } from './MacAccessPart'

/**
 * The notice over the composer of a new workspace whose grant until Stop
 * did not start after the create. New workspace in the Mac app starts the
 * grant once the create gives the new workspace its ID, and its control
 * closes at the create. So the notice names the cause, and Try again
 * repeats the start on this Mac. Mac access stays on.
 */
export function StartFailedNotice(props: { failure: FailedStart }) {
  return (
    <Notice
      action={
        <ActionButton accessibilityLabel={thisMacWords.tryAgainLabel}>
          {thisMacWords.tryAgain}
        </ActionButton>
      }
      body={startCauses[props.failure]}
      icon={CircleAlert}
      title={thisMacWords.noticeTitle}
      tone="danger"
    />
  )
}
