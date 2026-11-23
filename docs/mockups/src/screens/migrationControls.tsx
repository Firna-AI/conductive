import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { ListFilter, Pause, Play, type LucideIcon } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { Linked } from '../components/common/ScreenLink'
import { LimitDialog } from '../components/operator/LimitDialog'
import { jobWords } from '../components/operator/migrationCopy'
import type { JobRecord } from '../fixtures/migrationRecord'
import { migrationPageOf } from './migrationPages'

/**
 * A control of the job. Its result is the state of its page with only the
 * part that the control changes. It links to the page that draws that
 * state, and with no such page it draws the control with no link, as
 * during the count, where the catalogue draws no pause.
 */
function Control(props: {
  label: string
  next: JobRecord
  icon?: LucideIcon
  primary?: boolean
}) {
  return (
    <Linked to={migrationPageOf(props.next)}>
      <ActionButton
        icon={props.icon}
        tone={props.primary ? 'primary' : 'secondary'}
      >
        {props.label}
      </ActionButton>
    </Linked>
  )
}

/**
 * The actions of the job: Limit to one org, or Remove limit while a limit
 * holds, then Pause job, or Continue job while it is paused. Limit to one
 * org and Remove limit change only the limit, and Pause job and Continue
 * job change only the run, so a pause keeps the limit and the pace. A
 * finished job has none. None of them asks first, because each one can be
 * undone.
 */
export function jobControls(record: JobRecord): ReactNode {
  if (record.run === 'done') return undefined
  const limited = record.limit === 'hexwave' || record.limit === 'hexwave-done'
  return (
    <>
      {limited ? (
        <Control
          label={jobWords.removeLimit}
          next={{ ...record, limit: 'none' }}
        />
      ) : (
        <Control
          icon={ListFilter}
          label={jobWords.limit}
          next={{ ...record, limit: 'question' }}
        />
      )}
      {record.run === 'paused' ? (
        <Control
          icon={Play}
          label={jobWords.continue}
          next={{ ...record, run: 'running' }}
          primary
        />
      ) : (
        <Control
          icon={Pause}
          label={jobWords.pause}
          next={{ ...record, run: 'paused' }}
        />
      )}
    </>
  )
}

/**
 * The question before the limit to one org, over the job of its page:
 * running or paused. Cancel takes the limit back to none, and Limit job
 * sets the limit to Hexwave. Each keeps the run and the pace.
 */
export function limitQuestion(
  record: JobRecord | undefined,
  viewport: Viewport,
): ReactNode | undefined {
  if (record?.limit !== 'question') return undefined
  return (
    <LimitDialog
      cancelTo={migrationPageOf({ ...record, limit: 'none' })}
      limitTo={migrationPageOf({ ...record, limit: 'hexwave' })}
      viewport={viewport}
    />
  )
}

/**
 * The page of Save pace: the typed pace becomes the saved pace, and the
 * other parts stay. With no typed pace, Save pace is off and has none.
 */
export function savePaceTo(record: JobRecord): string | undefined {
  if (record.typedPace === 'none') return undefined
  return migrationPageOf({ ...record, savedPace: 'faster', typedPace: 'none' })
}
