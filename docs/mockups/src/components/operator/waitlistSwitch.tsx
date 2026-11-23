import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { waitlistSwitch } from '../../fixtures/operatorCodes'
import { waitlistTotal } from '../../fixtures/operatorWaitlist'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { ScreenLink } from '../common/ScreenLink'
import {
  waitlistOffTitle,
  waitlistWords,
} from '../../../../../src/ui/components/operator/codeCopy'
import { codesTabLinks } from './signUpLinks'
import { instanceKey } from '../../instanceKey'

/** New people wait, or an operator turned the waitlist off. */
export type WaitlistState = 'on' | 'off'

/**
 * Turn off the waitlist, in the Sign-ups box beside Pause sign-ups. It asks
 * first, because each grant of open sign-up is final.
 */
export function TurnOffWaitlistButton() {
  return (
    <ScreenLink asChild to={paths.operatorCodesWaitlistOff}>
      <actionButton.Component
        icon="door-open"
        moklyInstance="turn-off-waitlist"
      >
        {waitlistWords.turnOff}
      </actionButton.Component>
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
  const on = codesTabLinks.on[props.paused ? 'paused' : 'open']
  return (
    <notice.Component
      action={
        <ScreenLink asChild to={on}>
          <actionButton.Component
            icon="door-closed"
            moklyInstance="turn-on-waitlist"
          >
            {waitlistWords.turnOn}
          </actionButton.Component>
        </ScreenLink>
      }
      body={
        props.paused ? waitlistWords.noticeBodyPaused : waitlistWords.noticeBody
      }
      icon="door-open"
      moklyInstance="waitlist-off-notice"
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
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={paths.operatorCodes}>
            <actionButton.Component moklyInstance="dialog-cancel">
              Cancel
            </actionButton.Component>
          </ScreenLink>
          <ScreenLink asChild to={paths.operatorCodesWaitlistTurnedOff}>
            <actionButton.Component
              icon="door-open"
              moklyInstance="dialog-turn-off-waitlist"
              tone="primary"
            >
              {waitlistWords.confirmOff}
            </actionButton.Component>
          </ScreenLink>
        </>
      }
      moklyInstance="turn-off-waitlist-dialog"
      title={waitlistWords.question}
      viewport={props.viewport}
    >
      {waitlistWords.questionText(waitlistTotal).map((text) => (
        <dialogText.Component key={text} moklyInstance={instanceKey(text)}>
          {text}
        </dialogText.Component>
      ))}
    </confirmDialog.Component>
  )
}
