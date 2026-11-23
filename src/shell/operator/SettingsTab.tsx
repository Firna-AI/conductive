import { useEffect, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { StopTimeChoice } from '../../ui/components/operator/StopTimeChoice'
import {
  stopTimeChangedLine,
  stopTimeWords,
} from '../../ui/components/operator/stopTimeCopy'
import { Section, SectionText } from '../../ui/components/settings/Section'
import styles from '../../ui/screens/OperatorProvidersScreen.module.css'
import { OperatorIdleStop } from '../../app/operator-idle-stop'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import type {
  IdleStopMinutes,
  OperatorIdleStopResponse,
} from '../../shared/operator-idle-stop'
import { useApp } from '../context'
import { Loaded } from '../settings/LoadState'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { formatMoment } from './format'
import { OperatorPage } from './OperatorPage'

/**
 * The Stop time box: the choice of the stop time, the line of its last
 * change, and Save stop time. Save stop time is on only while the choice
 * differs from the saved time, and not while a save runs. A failed save
 * keeps the time that the operator chose, with its error under it.
 */
function StopTimeBox(props: {
  idleStop: OperatorIdleStop
  reply: OperatorIdleStopResponse
}) {
  const { minutes, updatedAt, operator } = props.reply
  const { now, timeZone } = useServices()
  const [draft, setDraft] = useState<IdleStopMinutes | null>(null)
  const chosen = draft ?? minutes
  const save = useAction(async () => {
    await props.idleStop.save(chosen)
    setDraft(null)
  })
  const when =
    updatedAt === null ? null : formatMoment(updatedAt, now(), timeZone)
  const changedLine = stopTimeChangedLine(when, operator?.login ?? null)
  return (
    <Section
      actions={
        <ActionButton
          busy={save.pending}
          disabled={chosen === minutes}
          keepFocus
          onPress={() => save.run()}
          tone="primary"
        >
          {stopTimeWords.save}
        </ActionButton>
      }
      description={stopTimeWords.line}
      title={stopTimeWords.title}
    >
      <StopTimeChoice
        disabled={save.pending}
        onChange={(next) => {
          setDraft(next)
          save.reset()
        }}
        value={chosen}
      />
      {save.error ? (
        <span className={styles.error} role="alert">
          <CircleAlert aria-hidden className={styles.icon} size={13} />
          <span>{stopTimeWords.notSaved}</span>
        </span>
      ) : null}
      {changedLine ? <SectionText muted>{changedLine}</SectionText> : null}
    </Section>
  )
}

/**
 * The Settings tab of the operator: the settings of the whole app, with
 * the stop time of idle cloud computers from the reply of the Worker.
 * While the read runs, it shows a quiet spinner, and a failed read shows
 * Try again with no choice, because a time that did not load is not the
 * default.
 */
export function SettingsTab() {
  const app = useApp()
  const [idleStop] = useState(() => new OperatorIdleStop(app))
  useEffect(() => idleStop.state.watch(), [idleStop])
  const value = useStore(idleStop.state.value)
  return (
    <OperatorPage tab="settings" title="Operator">
      <Loaded
        failure={stopTimeWords.notLoaded}
        retry={() => idleStop.state.refresh()}
        value={value}
      >
        {(reply) => <StopTimeBox idleStop={idleStop} reply={reply} />}
      </Loaded>
    </OperatorPage>
  )
}
