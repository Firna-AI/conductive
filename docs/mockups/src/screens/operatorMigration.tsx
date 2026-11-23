import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { ActionButton } from '../../../../src/ui/components/common/actions'
import { Linked } from '../components/common/ScreenLink'
import { JobProblemsSection } from '../components/operator/JobProblems'
import { MigrationJobSection } from '../components/operator/MigrationJob'
import {
  paceChangedLine,
  paceWords,
} from '../components/operator/migrationCopy'
import { PaceFields } from '../components/operator/PaceFields'
import { PaceRecord } from '../components/operator/PaceRecord'
import {
  Section,
  SectionText,
} from '../../../../src/ui/components/settings/Section'
import { migrationJob } from '../fixtures/migrationJob'
import {
  defaultPace,
  paceFields,
  paceSavedAt,
  savedPaces,
} from '../fixtures/migrationPace'
import { jobProblems } from '../fixtures/migrationProblems'
import type { JobRecord } from '../fixtures/migrationRecord'
import { account } from '../fixtures/orgs'
import { jobControls, savePaceTo } from './migrationControls'
import styles from '../../../../src/ui/screens/OperatorProvidersScreen.module.css'

/** The line of the last change of the pace, once an operator saved one. */
function ChangedLine(props: { record: JobRecord }) {
  if (props.record.savedPace === 'default') return null
  return (
    <SectionText muted>
      {paceChangedLine(paceSavedAt, account.login)}
    </SectionText>
  )
}

/**
 * The Pace box while the job can still change: the starts in each hour and
 * the machines at once on each account, with the low default in its line.
 * The fields hold the pace that the operator typed, or else the saved
 * pace. Save pace is on only while the fields hold a typed pace, and it
 * asks no question. A failed save keeps the typed pace and says so.
 */
function PaceForm(props: { record: JobRecord }) {
  const { record } = props
  return (
    <Section
      actions={
        <Linked to={savePaceTo(record)}>
          <ActionButton disabled={record.typedPace === 'none'} tone="primary">
            {paceWords.save}
          </ActionButton>
        </Linked>
      }
      description={paceWords.line(defaultPace.perHour, defaultPace.atOnce)}
      title={paceWords.title}
    >
      <PaceFields fields={paceFields(record)} />
      {record.typedPace === 'save-failed' ? (
        <span className={styles.error} role="alert">
          <CircleAlert aria-hidden className={styles.icon} size={13} />
          <span>{paceWords.notSaved}</span>
        </span>
      ) : null}
      <ChangedLine record={record} />
    </Section>
  )
}

/**
 * The Pace box of a finished job, as part of its record: the saved pace of
 * each account as text, with no field and no Save pace. It reads the saved
 * pace only, never a typed one.
 */
function PaceRecordSection(props: { record: JobRecord }) {
  return (
    <Section description={paceWords.record} title={paceWords.title}>
      <PaceRecord paces={savedPaces(props.record)} />
      <ChangedLine record={props.record} />
    </Section>
  )
}

/**
 * The boxes of the migration job at the top of the Providers tab, from the
 * state of the page: the job with its actions, its pace, and its failures
 * and skips, which show from the end of the count. The Pace box takes its
 * mode from the run of the job: a finished job shows its record. Without a
 * job, the tab draws none of them.
 */
export function MigrationSections(props: { record?: JobRecord }): ReactNode {
  const { record } = props
  if (record === undefined) return null
  return (
    <>
      <MigrationJobSection
        actions={jobControls(record)}
        job={migrationJob(record)}
      />
      {record.run === 'done' ? (
        <PaceRecordSection record={record} />
      ) : (
        <PaceForm record={record} />
      )}
      {record.progress === 'counting' && record.run !== 'done' ? null : (
        <JobProblemsSection problems={jobProblems(record)} />
      )}
    </>
  )
}
