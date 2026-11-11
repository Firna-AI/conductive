import { useState } from 'react'
import { DoorOpen, Pause } from 'lucide-react'
import { SkeletonBar, SkeletonGroup } from '@firna/ui/skeleton'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import {
  pauseWords,
  waitlistWords,
} from '../../../docs/mockups/src/components/operator/codeCopy'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { useStore } from '../../app/store'
import { ActionButton } from '../ui/actions'
import { LoadFailure } from '../ui/LoadFailure'
import { useOperatorPause } from './pause-context'
import { PauseDialog } from './PauseParts'
import { useOperatorSwitch } from './switch-context'
import { TurnOffDialog } from './SwitchParts'

/**
 * The question that shows over the box: Pause sign-ups, or Turn off the
 * waitlist with the people who wait when it opens.
 */
type Question = { kind: 'pause' } | { kind: 'turn-off'; waiting: number }

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
 * The box while sign-ups are not paused. It names the state of sign-ups:
 * Waitlist on, with Turn off the waitlist beside Pause sign-ups, or Open
 * during open sign-up, with Pause sign-ups, while the notice of the switch
 * holds Turn on the waitlist. So Open shows only during open sign-up. The
 * switch has its own read. While it loads, a placeholder takes the place of
 * its line, and a switch that did not load shows its failure with Try
 * again. Pause sign-ups stays in each case.
 */
function SignUpsSection(props: { ask: (question: Question) => void }) {
  const waitlist = useOperatorSwitch()
  const state = useStore(waitlist.state.value)
  const pause = (
    <ActionButton icon={Pause} onPress={() => props.ask({ kind: 'pause' })}>
      {pauseWords.pause}
    </ActionButton>
  )
  switch (state.state) {
    case 'loading':
      return (
        <Section actions={pause} title={pauseWords.box}>
          <SkeletonBar height={12} width={320} />
        </Section>
      )
    case 'failed':
      return (
        <Section actions={pause} title={pauseWords.box}>
          <LoadFailure
            error={state.error}
            retry={() => waitlist.state.refresh()}
            title="The waitlist switch could not load"
          />
        </Section>
      )
    case 'ready': {
      const { waitlistOn, waiting } = state.value
      if (!waitlistOn) {
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
              <ActionButton
                icon={DoorOpen}
                onPress={() => props.ask({ kind: 'turn-off', waiting })}
              >
                {waitlistWords.turnOff}
              </ActionButton>
              {pause}
            </>
          }
          description={pauseWords.openLine}
          status={<StatusText label={waitlistWords.on} tone="neutral" />}
          title={pauseWords.box}
        />
      )
    }
  }
}

/**
 * The Sign-ups box at the top of the Invite codes tab, with the two
 * controls of sign-ups. Pause sign-ups and Turn off the waitlist ask first.
 * While the pause is on, the notice at the top of the page takes the place
 * of the whole box, so Turn off the waitlist shows only while sign-ups are
 * not paused. A pause that did not load shows its failure, with Try again.
 */
export function SignUpsBox() {
  const pause = useOperatorPause()
  const waitlist = useOperatorSwitch()
  const state = useStore(pause.state.value)
  const [question, ask] = useState<Question | null>(null)
  const close = () => ask(null)
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
        return state.value.paused ? null : <SignUpsSection ask={ask} />
    }
  }
  return (
    <>
      {box()}
      {question?.kind === 'pause' ? (
        <PauseDialog close={close} pause={() => pause.pause()} />
      ) : null}
      {question?.kind === 'turn-off' ? (
        <TurnOffDialog
          close={close}
          turnOff={() => waitlist.turnOff()}
          waiting={question.waiting}
        />
      ) : null}
    </>
  )
}
