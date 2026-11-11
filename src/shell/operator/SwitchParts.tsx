import { CircleAlert, DoorClosed, DoorOpen } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import {
  waitlistOffTitle,
  waitlistWords,
} from '../../../docs/mockups/src/components/operator/codeCopy'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { useAction } from '../ui/useAction'
import { formatMoment } from './format'
import { useOperatorPause } from './pause-context'
import { useOperatorSwitch } from './switch-context'
import { useQuestion } from './useQuestion'

/**
 * The notice at the top of each page of the section while the waitlist is
 * off: who turned it off and when, who gets in, and Turn on the waitlist.
 * Turn on asks nothing, because it brings back the usual state, and a
 * failed turn-on names what failed in a toast. While sign-ups are paused,
 * the notice of the pause comes first, and this notice says that each new
 * sign-in gets app access when sign-ups resume. Its words depend on the
 * pause, so the notice waits for both reads: while the switch or the pause
 * loads, or when either did not load, the page shows no notice of the
 * switch, and it promises no access that the pause can stop.
 */
export function WaitlistOffNotice() {
  const waitlist = useOperatorSwitch()
  const state = useStore(waitlist.state.value)
  const pause = useStore(useOperatorPause().state.value)
  const { now, timeZone } = useServices()
  const turnOn = useAction(
    () => waitlist.turnOn(),
    "The waitlist wasn't turned on",
  )
  if (state.state !== 'ready' || state.value.waitlistOn) return null
  if (pause.state !== 'ready') return null
  const { updatedAt, operator } = state.value
  const when =
    updatedAt === null ? null : formatMoment(updatedAt, now(), timeZone)
  const paused = pause.value.paused
  return (
    <Notice
      action={
        <ActionButton
          busy={turnOn.pending}
          icon={DoorClosed}
          onPress={() => turnOn.run()}
        >
          {waitlistWords.turnOn}
        </ActionButton>
      }
      body={paused ? waitlistWords.noticeBodyPaused : waitlistWords.noticeBody}
      icon={DoorOpen}
      title={waitlistOffTitle(when, operator?.login ?? null)}
    />
  )
}

/**
 * The operator confirms Turn off the waitlist. The question says that each
 * new sign-in gets app access at once, gives the number of people who wait
 * with when they get in, and says that nobody loses app access later. A
 * failed turn-off shows its error, and the question stays open.
 */
export function TurnOffDialog(props: {
  /** The people who wait, from the last read of the switch. */
  waiting: number
  turnOff: () => Promise<void>
  close: () => void
}) {
  const turnOff = useQuestion(props.turnOff, props.close)
  return (
    <Dialog
      actions={
        <>
          <ActionButton disabled={turnOff.pending} onPress={turnOff.dismiss}>
            Cancel
          </ActionButton>
          <ActionButton
            busy={turnOff.pending}
            icon={DoorOpen}
            onPress={() => turnOff.run()}
            tone="primary"
          >
            {waitlistWords.confirmOff}
          </ActionButton>
        </>
      }
      close={turnOff.dismiss}
      title={waitlistWords.question}
    >
      {waitlistWords.questionText(props.waiting).map((text) => (
        <DialogText key={text}>{text}</DialogText>
      ))}
      {turnOff.error ? (
        <Notice
          body={turnOff.error.message}
          icon={CircleAlert}
          title="The waitlist wasn't turned off"
          tone="danger"
        />
      ) : null}
    </Dialog>
  )
}
