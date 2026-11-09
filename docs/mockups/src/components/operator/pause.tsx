import type { Viewport } from '@mokly/mokly'
import { CirclePause, Pause, Play } from 'lucide-react'
import { signUpPause } from '../../fixtures/operatorCodes'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText } from '../common/StatusText'
import { Section } from '../settings/Section'

/** The words of the pause, which the question and the notice share. */
const blocked =
  'Invite codes, referral codes, and org invitations let nobody in until sign-ups resume.'

/**
 * The notice at the top of each tab while sign-ups are paused: who paused
 * them and when, what waits, and Resume sign-ups, which needs no question
 * because it brings back the usual state.
 */
export function PauseNotice() {
  return (
    <Notice
      action={
        <ScreenLink asChild to={paths.operatorCodes}>
          <ActionButton icon={Play}>Resume sign-ups</ActionButton>
        </ScreenLink>
      }
      body={`${blocked} The waitlist stays open, and Approve still works.`}
      icon={CirclePause}
      title={`Sign-ups paused on ${signUpPause.since} by @${signUpPause.by}`}
    />
  )
}

/**
 * The state of sign-ups at the top of the Invite codes tab, while they are
 * open, with Pause sign-ups. While they are paused, the notice of the
 * pause takes its place.
 */
export function SignUpsSection() {
  return (
    <Section
      actions={
        <ScreenLink asChild to={paths.operatorCodesPause}>
          <ActionButton icon={Pause}>Pause sign-ups</ActionButton>
        </ScreenLink>
      }
      description="Invite codes, referral codes, and org invitations let new people in."
      status={<StatusText label="Open" tone="success" />}
      title="Sign-ups"
    />
  )
}

/**
 * The operator confirms the pause. The question says what lets nobody in,
 * that each code keeps its uses, and what still works.
 */
export function PauseDialog(props: { viewport: Viewport }) {
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.operatorCodes}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.operatorCodesPaused}>
            <ActionButton icon={Pause} tone="danger">
              Pause sign-ups
            </ActionButton>
          </ScreenLink>
        </>
      }
      title="Pause sign-ups?"
      viewport={props.viewport}
    >
      <DialogText>{blocked} Each code keeps its uses.</DialogText>
      <DialogText>The waitlist stays open, and Approve still works.</DialogText>
    </ConfirmDialog>
  )
}
