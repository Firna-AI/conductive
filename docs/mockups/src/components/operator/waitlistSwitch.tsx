import type { Viewport } from '@mokly/mokly'
import { DoorClosed, DoorOpen } from 'lucide-react'
import { waitlistSwitch } from '../../fixtures/operatorCodes'
import { waitlistTotal } from '../../fixtures/operatorWaitlist'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import { waitlistOffTitle, waitlistWords } from './codeCopy'

/** New people wait, or an operator turned the waitlist off. */
export type WaitlistState = 'on' | 'off'

/**
 * Turn off the waitlist, in the Sign-ups box beside Pause sign-ups. It asks
 * first, because each grant of open sign-up is final.
 */
export function TurnOffWaitlistButton() {
  return (
    <ScreenLink asChild to={paths.operatorCodesWaitlistOff}>
      <ActionButton icon={DoorOpen}>{waitlistWords.turnOff}</ActionButton>
    </ScreenLink>
  )
}

/**
 * The notice at the top of each tab while the waitlist is off: who turned
 * it off and when, who gets in, and Turn on the waitlist, which needs no
 * question because it brings back the usual state. While sign-ups are
 * paused, the notice of the pause comes first, and this notice says that
 * open sign-up starts again when sign-ups resume.
 */
export function WaitlistOffNotice(props: { paused: boolean }) {
  const on = props.paused ? paths.operatorCodesPaused : paths.operatorCodes
  return (
    <Notice
      action={
        <ScreenLink asChild to={on}>
          <ActionButton icon={DoorClosed}>{waitlistWords.turnOn}</ActionButton>
        </ScreenLink>
      }
      body={
        props.paused ? waitlistWords.noticeBodyPaused : waitlistWords.noticeBody
      }
      icon={DoorOpen}
      title={waitlistOffTitle(waitlistSwitch.since, waitlistSwitch.by)}
    />
  )
}

/**
 * The operator confirms Turn off the waitlist. The question says that each
 * new sign-in gets app access at once, gives the number of people who wait
 * with when they get in, and says that nobody loses app access later.
 */
export function TurnOffWaitlistDialog(props: { viewport: Viewport }) {
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.operatorCodes}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.operatorCodesWaitlistTurnedOff}>
            <ActionButton icon={DoorOpen} tone="primary">
              {waitlistWords.confirmOff}
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={waitlistWords.question}
      viewport={props.viewport}
    >
      {waitlistWords.questionText(waitlistTotal).map((text) => (
        <DialogText key={text}>{text}</DialogText>
      ))}
    </ConfirmDialog>
  )
}
