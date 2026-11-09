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
import { pausedTitle, pauseWords } from './codeCopy'

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
 * The state of sign-ups at the top of the Invite codes tab, while they are
 * open, with Pause sign-ups. While they are paused, the notice of the
 * pause takes its place.
 */
export function SignUpsSection() {
  return (
    <Section
      actions={
        <ScreenLink asChild to={paths.operatorCodesPause}>
          <ActionButton icon={Pause}>{pauseWords.pause}</ActionButton>
        </ScreenLink>
      }
      description={pauseWords.openLine}
      status={<StatusText label={pauseWords.open} tone="success" />}
      title={pauseWords.box}
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
