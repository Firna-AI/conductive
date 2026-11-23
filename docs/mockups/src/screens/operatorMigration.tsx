import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { CircleAlert, ListFilter, Pause, Play } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { JobProblemsSection } from '../components/operator/JobProblems'
import { LimitDialog } from '../components/operator/LimitDialog'
import { MigrationJobSection } from '../components/operator/MigrationJob'
import {
  jobWords,
  paceChangedLine,
  paceWords,
} from '../components/operator/migrationCopy'
import { PaceFields } from '../components/operator/PaceFields'
import { Section, SectionText } from '../components/settings/Section'
import {
  defaultPace,
  migrationJob,
  paceFields,
  paceSavedAt,
  type JobMoment,
} from '../fixtures/migrationJob'
import { jobProblems } from '../fixtures/migrationProblems'
import { account } from '../fixtures/orgs'
import { migrationPaths } from '../paths'
import styles from './OperatorProvidersScreen.module.css'

/**
 * The views of the migration job on the Providers tab: none, as before the
 * deploy that adds the host connection, the count, the count before the
 * first start while the running machines restart, the job that runs,
 * paused, waiting after a refusal of `boat` for its rate limit or its
 * capacity, the question before the limit to one org, the job limited to
 * Hexwave, Hexwave done, and the finished job.
 */
const jobViews = [
  'none',
  'counting',
  'counted',
  'running',
  'paused',
  'refused',
  'capacity',
  'limit',
  'limited',
  'limited-done',
  'done',
] as const

type JobView = (typeof jobViews)[number]

/**
 * The pace of the job: the default on each account, a faster pace of
 * `boat` that the operator typed and has not saved, the same pace after
 * Save pace, or a save that failed and keeps the typed pace.
 */
const paceViews = ['default', 'changed', 'saved', 'not-saved'] as const

type PaceView = (typeof paceViews)[number]

/** The props of the Providers tab that draw the migration job. */
export const migrationStateProperties = {
  job: { enum: jobViews },
  pace: { enum: paceViews },
} as const

/** The moment of the job that a view draws: a question lies over the job. */
function momentOf(view: Exclude<JobView, 'none'>): JobMoment {
  return view === 'limit' ? 'running' : view
}

/** A button that leads to the page of its result. */
function LinkButton(props: {
  to: string
  label: string
  icon?: typeof Pause
  primary?: boolean
}) {
  return (
    <ScreenLink asChild to={props.to}>
      <ActionButton
        icon={props.icon}
        tone={props.primary ? 'primary' : 'secondary'}
      >
        {props.label}
      </ActionButton>
    </ScreenLink>
  )
}

/**
 * The actions of the job: Limit to one org, or Remove limit while a limit
 * holds, then Pause job, or Continue job while it is paused. A finished job
 * has none. None of them asks first, because each one can be undone.
 */
function jobActions(view: Exclude<JobView, 'none'>): ReactNode {
  if (view === 'done') return undefined
  const limited = view === 'limited' || view === 'limited-done'
  return (
    <>
      {limited ? (
        <LinkButton label={jobWords.removeLimit} to={migrationPaths.running} />
      ) : (
        <LinkButton
          icon={ListFilter}
          label={jobWords.limit}
          to={migrationPaths.limit}
        />
      )}
      {view === 'paused' ? (
        <LinkButton
          icon={Play}
          label={jobWords.continue}
          primary
          to={migrationPaths.running}
        />
      ) : (
        <LinkButton
          icon={Pause}
          label={jobWords.pause}
          to={migrationPaths.paused}
        />
      )}
    </>
  )
}

/**
 * The Pace box: the starts in each hour and the machines at once on each
 * account, with the low default in its line. Save pace is on only while
 * the fields hold a pace that is not saved, and it asks no question. A
 * failed save keeps the typed pace and says so. The line under the fields
 * gives the last change, with its time and its operator.
 */
function PaceSection(props: { pace: PaceView }) {
  const { pace } = props
  const unsaved = pace === 'changed' || pace === 'not-saved'
  const save = (
    <ActionButton disabled={!unsaved} tone="primary">
      {paceWords.save}
    </ActionButton>
  )
  return (
    <Section
      actions={
        unsaved ? (
          <ScreenLink asChild to={migrationPaths.paceSaved}>
            {save}
          </ScreenLink>
        ) : (
          save
        )
      }
      description={paceWords.line(defaultPace.perHour, defaultPace.atOnce)}
      title={paceWords.title}
    >
      <PaceFields fields={paceFields(pace !== 'default')} />
      {pace === 'not-saved' ? (
        <span className={styles.error} role="alert">
          <CircleAlert aria-hidden className={styles.icon} size={13} />
          <span>{paceWords.notSaved}</span>
        </span>
      ) : null}
      {pace === 'saved' ? (
        <SectionText muted>
          {paceChangedLine(paceSavedAt, account.login)}
        </SectionText>
      ) : null}
    </Section>
  )
}

/**
 * The boxes of the migration job at the top of the Providers tab: the job
 * with its actions, its pace, and its failures and skips, which show from
 * the end of the count. Without a job, the tab draws none of them.
 */
export function MigrationSections(props: {
  job: JobView
  pace: PaceView
}): ReactNode {
  const { job: view } = props
  if (view === 'none') return null
  const moment = momentOf(view)
  return (
    <>
      <MigrationJobSection
        actions={jobActions(view)}
        job={migrationJob(moment, props.pace === 'saved')}
      />
      <PaceSection pace={props.pace} />
      {moment === 'counting' ? null : (
        <JobProblemsSection problems={jobProblems(moment)} />
      )}
    </>
  )
}

/** The question that lies over the Providers tab, if any. */
export function migrationDialog(
  job: JobView,
  viewport: Viewport,
): ReactNode | undefined {
  return job === 'limit' ? <LimitDialog viewport={viewport} /> : undefined
}
