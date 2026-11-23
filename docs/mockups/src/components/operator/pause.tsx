import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { signUpPause } from '../../fixtures/operatorCodes'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { statusText } from '../../entries/components/common/StatusText.mockup'
import { section } from '../../entries/components/settings/Section.mockup'
import {
  pausedTitle,
  pauseWords,
  waitlistWords,
} from '../../../../../src/ui/components/operator/codeCopy'
import { codesTabLinks, pauseQuestionLinks } from './signUpLinks'
import { TurnOffWaitlistButton, type WaitlistState } from './waitlistSwitch'
import { instanceKey } from '../../instanceKey'

/**
 * The notice at the top of each tab while sign-ups are paused: who paused
 * them and when, what waits, and Resume sign-ups, which needs no question
 * because it brings back the usual state. Resume returns to the state of
 * the waitlist switch.
 */
export function PauseNotice(props: { waitlist: WaitlistState }) {
  return (
    <notice.Component
      action={
        <ScreenLink asChild to={codesTabLinks[props.waitlist].open}>
          <actionButton.Component icon="play" moklyInstance="resume-sign-ups">
            {pauseWords.resume}
          </actionButton.Component>
        </ScreenLink>
      }
      body={pauseWords.noticeBody}
      icon="circle-pause"
      moklyInstance="pause-notice"
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
      <actionButton.Component icon="pause" moklyInstance="pause-sign-ups">
        {pauseWords.pause}
      </actionButton.Component>
    </ScreenLink>
  )
  if (props.waitlist === 'off') {
    return (
      <section.Component
        actions={pause}
        moklyInstance="sign-ups-section"
        status={
          <statusText.Component
            label={pauseWords.open}
            moklyInstance="sign-ups-state"
            tone="success"
          />
        }
        title={pauseWords.box}
      />
    )
  }
  return (
    <section.Component
      actions={
        <>
          <TurnOffWaitlistButton />
          {pause}
        </>
      }
      description={pauseWords.openLine}
      moklyInstance="sign-ups-section"
      status={
        <statusText.Component
          label={waitlistWords.on}
          moklyInstance="sign-ups-state"
          tone="neutral"
        />
      }
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
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={tab.open}>
            <actionButton.Component moklyInstance="dialog-cancel">
              Cancel
            </actionButton.Component>
          </ScreenLink>
          <ScreenLink asChild to={tab.paused}>
            <actionButton.Component
              icon="pause"
              moklyInstance="dialog-pause-sign-ups"
              tone="danger"
            >
              {pauseWords.pause}
            </actionButton.Component>
          </ScreenLink>
        </>
      }
      moklyInstance="pause-dialog"
      title={pauseWords.question}
      viewport={props.viewport}
    >
      {pauseWords.questionText.map((text) => (
        <dialogText.Component key={text} moklyInstance={instanceKey(text)}>
          {text}
        </dialogText.Component>
      ))}
    </confirmDialog.Component>
  )
}
