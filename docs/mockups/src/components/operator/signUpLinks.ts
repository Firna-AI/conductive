import { paths } from '../../paths'
import type { SignUps } from './OperatorPage'
import type { WaitlistState } from './waitlistSwitch'

/**
 * The saved state of the Invite codes tab in each state of the waitlist
 * switch and of the pause. The two controls are separate, so a link of one
 * control keeps the state of the other. Cancel and Pause sign-ups in the
 * question, Resume sign-ups, and Turn on the waitlist read their targets
 * here.
 */
export const codesTabLinks: Readonly<
  Record<WaitlistState, Readonly<Record<SignUps, string>>>
> = {
  on: { open: paths.operatorCodes, paused: paths.operatorCodesPaused },
  off: {
    open: paths.operatorCodesWaitlistTurnedOff,
    paused: paths.operatorCodesWaitlistOffPaused,
  },
}

/**
 * The question before the pause, over the Invite codes tab, in each state
 * of the waitlist switch. Pause sign-ups in the Sign-ups box leads here.
 */
export const pauseQuestionLinks: Readonly<Record<WaitlistState, string>> = {
  on: paths.operatorCodesPause,
  off: paths.operatorCodesPauseWaitlistOff,
}
