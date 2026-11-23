import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { ListFilter, Pause, Play, type LucideIcon } from 'lucide-react'
import { ActionButton } from '../../../../src/ui/components/common/actions'
import { Linked } from '../components/common/ScreenLink'
import { LimitDialog } from '../components/operator/LimitDialog'
import { jobWords } from '../components/operator/migrationCopy'
import {
  withSettings,
  type JobRecord,
  type JobSettings,
} from '../fixtures/migrationRecord'
import { migrationPageOf } from './migrationPages'

/**
 * A control of the job. Its result is its page with the settings that it
 * changes, and the same facts, so its action takes the time of the page.
 * It links to the page that draws that result, and with no such page it
 * draws the control with no link.
 */
function Control(props: {
  label: string
  record: JobRecord
  change: Partial<JobSettings>
  icon?: LucideIcon
  primary?: boolean
}) {
  return (
    <Linked to={migrationPageOf(withSettings(props.record, props.change))}>
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
 * holds, then Pause job, or Continue job after a pause. Limit to one org
 * and Remove limit change only the limit, and Pause job and Continue job
 * change only the pause request, so a pause keeps the wait, the limit, and
 * the pace. A finished job has none. None of them asks first, because each
 * one can be undone.
 */
export function jobControls(record: JobRecord, done: boolean): ReactNode {
  if (done) return undefined
  const { settings } = record
  return (
    <>
      {settings.limit === 'hexwave' ? (
        <Control
          change={{ limit: 'none' }}
          label={jobWords.removeLimit}
          record={record}
        />
      ) : (
        <Control
          change={{ limit: 'question' }}
          icon={ListFilter}
          label={jobWords.limit}
          record={record}
        />
      )}
      {settings.pause === 'asked' ? (
        <Control
          change={{ pause: 'none' }}
          icon={Play}
          label={jobWords.continue}
          primary
          record={record}
        />
      ) : (
        <Control
          change={{ pause: 'asked' }}
          icon={Pause}
          label={jobWords.pause}
          record={record}
        />
      )}
    </>
  )
}

/**
 * The question before the limit to one org, over the job of its page.
 * Cancel takes the limit back to none, and Limit job sets the limit to
 * Hexwave. Each keeps the pause, the pace, and the facts.
 */
export function limitQuestion(
  record: JobRecord | undefined,
  viewport: Viewport,
): ReactNode | undefined {
  if (record?.settings.limit !== 'question') return undefined
  return (
    <LimitDialog
      cancelTo={migrationPageOf(withSettings(record, { limit: 'none' }))}
      limitTo={migrationPageOf(withSettings(record, { limit: 'hexwave' }))}
      viewport={viewport}
    />
  )
}

/**
 * The page of Save pace: the typed pace becomes the saved pace, and the
 * other settings and the facts stay. With no typed pace, Save pace is off
 * and has none.
 */
export function savePaceTo(record: JobRecord): string | undefined {
  if (record.settings.typedPace === 'none') return undefined
  const saved = { savedPace: 'faster', typedPace: 'none' } as const
  return migrationPageOf(withSettings(record, saved))
}
