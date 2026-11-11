import type { Viewport } from '@mokly/mokly'
import { CirclePause, Pause, Play } from 'lucide-react'
import { signUpPause } from '../../fixtures/operatorCodes'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText } from '../common/StatusText'
import { Section } from '../settings/Section'
import { pausedTitle, pauseWords, waitlistWords } from './codeCopy'
import { codesTabLinks, pauseQuestionLinks } from './signUpLinks'
import { TurnOffWaitlistButton, type WaitlistState } from './waitlistSwitch'

/**
 * The notice at the top of each tab while sign-ups are paused: who paused
 * them and when, what waits, and Resume sign-ups, which needs no question
 * because it brings back the usual state. Resume returns to the state of
 * the waitlist switch.
 */
export function PauseNotice(props: { waitlist: WaitlistState }) {
  return (
    <Notice
      action={
        <ScreenLink asChild to={codesTabLinks[props.waitlist].open}>
          <ActionButton icon={Play}>{pauseWords.resume}</ActionButton>
        </ScreenLink>
      }
      body={pauseWords.noticeBody}
      icon={CirclePause}
      title={pausedTitle(signUpPause.since, signUpPause.by)}
    />
  )
}

/**
 * The Sign-ups box at the top of the Invite codes tab while sign-ups are
 * not paused. While the waitlist is on, it says so, and Turn off the
 * waitlist stands beside Pause sign-ups. While the waitlist is off, the
 * notice of the switch holds Turn on the waitlist, and the box says Open
 * with Pause sign-ups. So Open shows only during open sign-up. While the
 * pause is on, its notice takes the place of the box.
 */
export function SignUpsSection(props: { waitlist: WaitlistState }) {
  const pause = (
    <ScreenLink asChild to={pauseQuestionLinks[props.waitlist]}>
      <ActionButton icon={Pause}>{pauseWords.pause}</ActionButton>
    </ScreenLink>
  )
  if (props.waitlist === 'off') {
    return (
      <Section
        actions={pause}
        status={<StatusText label={pauseWords.open} tone="success" />}
        title={pauseWords.box}
      />
    )
  }
  return (
    <Section
      actions={
        <>
          <TurnOffWaitlistButton />
          {pause}
        </>
      }
      description={pauseWords.openLine}
      status={<StatusText label={waitlistWords.on} tone="neutral" />}
      title={pauseWords.box}
    />
  )
}

/**
 * The operator confirms the pause. The question says what lets nobody in,
 * that each code keeps its uses, that new people wait also while the
 * waitlist is off, and what still works. Cancel and Pause sign-ups keep
 * the state of the waitlist switch.
 */
export function PauseDialog(props: {
  waitlist: WaitlistState
  viewport: Viewport
}) {
  const tab = codesTabLinks[props.waitlist]
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={tab.open}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={tab.paused}>
            <ActionButton icon={Pause} tone="danger">
              {pauseWords.pause}
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={pauseWords.question}
      viewport={props.viewport}
    >
      {pauseWords.questionText.map((text) => (
        <DialogText key={text}>{text}</DialogText>
      ))}
    </ConfirmDialog>
  )
}
