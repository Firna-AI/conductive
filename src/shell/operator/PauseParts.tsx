import { CircleAlert, CirclePause, Pause, Play } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import {
  pausedTitle,
  pauseWords,
} from '../../../docs/mockups/src/components/operator/codeCopy'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { useAction } from '../ui/useAction'
import { formatMoment } from './format'
import { useOperatorPause } from './pause-context'
import { useQuestion } from './useQuestion'

/**
 * The notice at the top of each page of the section while sign-ups are
 * paused: who paused them and when, what waits, and Resume sign-ups. Resume
 * asks nothing, because it brings back the usual state, and a failed resume
 * names what failed in a toast. While the pause loads, or when it did not
 * load, the page shows no notice.
 */
export function PauseNotice() {
  const pause = useOperatorPause()
  const state = useStore(pause.state.value)
  const { now, timeZone } = useServices()
  const resume = useAction(() => pause.resume(), "Sign-ups didn't resume")
  if (state.state !== 'ready' || !state.value.paused) return null
  const { updatedAt, operator } = state.value
  const when =
    updatedAt === null ? null : formatMoment(updatedAt, now(), timeZone)
  return (
    <Notice
      action={
        <ActionButton
          busy={resume.pending}
          icon={Play}
          onPress={() => resume.run()}
        >
          {pauseWords.resume}
        </ActionButton>
      }
      body={pauseWords.noticeBody}
      icon={CirclePause}
      title={pausedTitle(when, operator?.login ?? null)}
    />
  )
}

/**
 * The operator confirms the pause. The question says what lets nobody in,
 * that each code keeps its uses, and what still works. A failed pause shows
 * its error, and the question stays open.
 */
export function PauseDialog(props: {
  pause: () => Promise<void>
  close: () => void
}) {
  const pause = useQuestion(props.pause, props.close)
  return (
    <Dialog
      actions={
        <>
          <ActionButton disabled={pause.pending} onPress={pause.dismiss}>
            Cancel
          </ActionButton>
          <ActionButton
            busy={pause.pending}
            icon={Pause}
            onPress={() => pause.run()}
            tone="danger"
          >
            {pauseWords.pause}
          </ActionButton>
        </>
      }
      close={pause.dismiss}
      title={pauseWords.question}
    >
      {pauseWords.questionText.map((text) => (
        <DialogText key={text}>{text}</DialogText>
      ))}
      {pause.error ? (
        <Notice
          body={pause.error.message}
          icon={CircleAlert}
          title="Sign-ups weren't paused"
          tone="danger"
        />
      ) : null}
    </Dialog>
  )
}
