import {
  PendingWakeUp,
  PendingWakeUps,
} from '../../../docs/mockups/src/components/chat/PendingWakeUps'
import {
  cancelWakeUpLabel,
  wakeUpTime,
  wakeUpWords,
} from '../../../docs/mockups/src/components/chat/wakeUpCopy'
import type { WakeUp } from '../../shared/generated/WakeUp'
import { ActionButton } from '../ui/actions'
import { useReaderClock, WakeUpText } from './WakeUpItemLine'

/**
 * One pending wake-up as a compact card: its time in the local time of the
 * reader, Cancel, and two lines of its text, which a press opens. Cancel
 * asks no question, and it is busy while its request waits.
 */
function PendingCard(props: {
  wakeUp: WakeUp
  cancelling: boolean
  onCancel?: (wakeUpId: string) => void
}) {
  const { wakeUp, onCancel } = props
  const clock = useReaderClock()
  const time = wakeUpTime(wakeUp.at, clock)
  const cancel = onCancel ? (
    <ActionButton
      accessibilityLabel={cancelWakeUpLabel(time)}
      busy={props.cancelling}
      onPress={() => onCancel(wakeUp.id)}
    >
      {wakeUpWords.cancel}
    </ActionButton>
  ) : undefined
  return (
    <PendingWakeUp
      cancel={cancel}
      text={<WakeUpText text={wakeUp.text} />}
      time={time}
    />
  )
}

/**
 * The pending wake-ups of the shown session, the soonest first, at the top
 * of the footer of the chat (wake-up decision 3 B). The group scrolls and
 * fades as the region of the requests does. Each member sees Cancel. A
 * read-only workspace gives no `onCancel`, so its cards show none. A
 * pending wake-up waits for no member, so it marks nothing as waiting.
 */
export function PendingWakeUpCards(props: {
  wakeUps: readonly WakeUp[]
  /** The wake-ups whose Cancel of this tab waits for its reply. */
  cancels: Readonly<Record<string, true>>
  onCancel?: (wakeUpId: string) => void
}) {
  if (props.wakeUps.length === 0) return null
  return (
    <PendingWakeUps>
      {props.wakeUps.map((wakeUp) => (
        <PendingCard
          cancelling={Object.hasOwn(props.cancels, wakeUp.id)}
          key={wakeUp.id}
          onCancel={props.onCancel}
          wakeUp={wakeUp}
        />
      ))}
    </PendingWakeUps>
  )
}
