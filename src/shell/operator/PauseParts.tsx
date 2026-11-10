import { useState } from 'react'
import { CircleAlert, CirclePause, Pause, Play } from 'lucide-react'
import { SkeletonBar, SkeletonGroup } from '@firna/ui/skeleton'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import {
  pausedTitle,
  pauseWords,
} from '../../../docs/mockups/src/components/operator/codeCopy'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { LoadFailure } from '../ui/LoadFailure'
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
function PauseDialog(props: { pause: () => Promise<void>; close: () => void }) {
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

/** The Sign-ups box while the pause loads: its title, with placeholders. */
function SignUpsLoading() {
  return (
    <Section title={pauseWords.box}>
      <SkeletonGroup direction="column" gap={10}>
        <SkeletonBar height={12} width={320} />
        <SkeletonBar height={28} width={132} />
      </SkeletonGroup>
    </Section>
  )
}

/**
 * The Sign-ups box at the top of the Invite codes tab while sign-ups are
 * open, with Pause sign-ups, which asks first. While the pause is on, the
 * notice at the top of the page takes its place. A pause that did not load
 * shows its failure, with Try again.
 */
export function SignUpsBox() {
  const pause = useOperatorPause()
  const state = useStore(pause.state.value)
  const [asking, ask] = useState(false)
  const box = () => {
    switch (state.state) {
      case 'loading':
        return <SignUpsLoading />
      case 'failed':
        return (
          <LoadFailure
            error={state.error}
            retry={() => pause.state.refresh()}
            title="Sign-ups could not load"
          />
        )
      case 'ready':
        if (state.value.paused) return null
        return (
          <Section
            actions={
              <ActionButton icon={Pause} onPress={() => ask(true)}>
                {pauseWords.pause}
              </ActionButton>
            }
            description={pauseWords.openLine}
            status={<StatusText label={pauseWords.open} tone="success" />}
            title={pauseWords.box}
          />
        )
    }
  }
  return (
    <>
      {box()}
      {asking ? (
        <PauseDialog close={() => ask(false)} pause={() => pause.pause()} />
      ) : null}
    </>
  )
}
