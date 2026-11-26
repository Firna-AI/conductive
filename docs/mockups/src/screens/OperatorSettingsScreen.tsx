import type { SchemaProps, Viewport } from '@mokly/mokly'
import { CircleAlert } from 'lucide-react'
import type { IdleStopMinutes } from '../../../../src/shared/operator-idle-stop'
import { ActionButton } from '../../../../src/ui/components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { OperatorPage } from '../components/operator/OperatorPage'
import { StopTimeChoice } from '../../../../src/ui/components/operator/StopTimeChoice'
import {
  stopTimeChangedLine,
  stopTimeWords,
} from '../../../../src/ui/components/operator/stopTimeCopy'
import {
  Section,
  SectionText,
} from '../../../../src/ui/components/settings/Section'
import { account } from '../fixtures/orgs'
import { paths } from '../paths'
import styles from '../../../../src/ui/screens/OperatorProvidersScreen.module.css'

export const operatorSettingsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['stopTime', 'signUps'],
  properties: {
    /**
     * The stop time of idle cloud computers: the default of 30 minutes,
     * changed by the operator and not saved yet, saved with the time and
     * the operator, or a save that failed and keeps the chosen time.
     */
    stopTime: { enum: ['default', 'changed', 'saved', 'not-saved'] },
    /** Sign-ups are open, or an operator paused them. */
    signUps: { enum: ['open', 'paused'] },
  },
} as const

export type OperatorSettingsState = SchemaProps<typeof operatorSettingsSchema>

type StopTimeState = OperatorSettingsState['stopTime']

/** The time that the control shows in each state. */
function minutesOf(state: StopTimeState): IdleStopMinutes {
  return state === 'default' ? 30 : 60
}

/**
 * Save stop time, on only while the control holds a time that is not
 * saved. It acts at once, with no question, because a running computer
 * takes the new time only at its next activity, or when its time ends.
 */
function SaveStopTime(props: { on: boolean }) {
  const save = (
    <ActionButton disabled={!props.on} tone="primary">
      {stopTimeWords.save}
    </ActionButton>
  )
  if (!props.on) return save
  return (
    <ScreenLink asChild to={paths.operatorSettingsSaved}>
      {save}
    </ScreenLink>
  )
}

/**
 * The Settings tab of the operator: the Stop time box, with the stop time
 * of idle cloud computers as one choice of 15, 30, 60, 90, or 120
 * minutes, the error of a save that failed, the line of the last change,
 * and Save stop time. The setting holds for every workspace of every org.
 */
export function OperatorSettingsScreen(props: {
  state: OperatorSettingsState
  viewport: Viewport
}) {
  const { stopTime } = props.state
  const unsaved = stopTime === 'changed' || stopTime === 'not-saved'
  const changed =
    stopTime === 'saved'
      ? stopTimeChangedLine('20 Nov at 10:14', account.login)
      : null
  return (
    <OperatorPage
      signUps={props.state.signUps}
      tab="settings"
      title="Operator"
      viewport={props.viewport}
    >
      <Section
        actions={<SaveStopTime on={unsaved} />}
        description={stopTimeWords.line}
        title={stopTimeWords.title}
      >
        <StopTimeChoice value={minutesOf(stopTime)} />
        {stopTime === 'not-saved' ? (
          <span className={styles.error} role="alert">
            <CircleAlert aria-hidden className={styles.icon} size={13} />
            <span>{stopTimeWords.notSaved}</span>
          </span>
        ) : null}
        {changed ? <SectionText muted>{changed}</SectionText> : null}
      </Section>
    </OperatorPage>
  )
}
