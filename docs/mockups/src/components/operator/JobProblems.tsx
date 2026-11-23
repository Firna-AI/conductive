import { CircleAlert, Copy } from 'lucide-react'
import { IconButton } from '../common/actions'
import { Section, SectionText } from '../settings/Section'
import { workspaceLabel } from '../workspaces/label'
import { copyComputerLabel } from './longRunsCopy'
import {
  failureText,
  noAdminLine,
  problemWords,
  skipLabels,
} from './jobProblemsCopy'
import type { JobFailure, JobProblems, SkipReason } from './migrationModel'
import styles from './JobProblems.module.css'
import rows from './WorkspaceStates.module.css'

/** The reasons of a skip, in the order of the list. */
const skipOrder: readonly SkipReason[] = [
  'suspended',
  'deleted-org',
  'restore-ends',
  'no-sandbox',
  'provider-error',
  'creating',
  'not-configured',
]

/**
 * One step that failed: its org, the workspace number, and the cloud
 * computer ID with Copy, for a search on the Orgs tab, then the step with
 * its cause, and when. An org image has no workspace and no ID. The glyph
 * and the words carry the failure, so it never depends on colour alone.
 */
function FailureRow(props: { failure: JobFailure }) {
  const { org, number, computer, at } = props.failure
  return (
    <li className={styles.failure}>
      <span className={styles.where}>
        <span className={styles.org}>{org}</span>
        {number === undefined ? (
          <span className={styles.image}>{problemWords.orgImage}</span>
        ) : (
          <span className={styles.number}>{workspaceLabel(number)}</span>
        )}
        {computer ? (
          <span className={styles.computer}>
            <span className={styles.id}>{computer}</span>
            <IconButton icon={Copy} label={copyComputerLabel(computer)} quiet />
          </span>
        ) : null}
      </span>
      <span className={styles.what}>
        <CircleAlert aria-hidden className={styles.icon} size={13} />
        <span>{`${failureText(props.failure)} · ${at}`}</span>
      </span>
    </li>
  )
}

/** A heading in the box, with the number of its items. */
function CountHeading(props: { label: string; count: number }) {
  return (
    <h3 className={styles.heading}>
      {`${props.label} · ${props.count.toLocaleString('en')}`}
    </h3>
  )
}

/**
 * The failures and the skips of the migration job: each step that failed,
 * newest first, the skips of each reason that the job reports, and the
 * orgs with no active admin, whose org images get no refresh. A reason
 * with no skip does not show. The bootstrap covers each such machine at its
 * next start, so the box says so. It shows counts, names, IDs, and codes,
 * and nothing of the work in a machine. It imports no fixture, so the app
 * can use it too.
 */
export function JobProblemsSection(props: { problems: JobProblems }) {
  const { failures, skips, noAdmin } = props.problems
  const skipped = skipOrder.filter((reason) => skips[reason] > 0)
  const skipTotal = skipped.reduce((sum, reason) => sum + skips[reason], 0)
  const empty =
    failures.length === 0 && skipped.length === 0 && noAdmin.length === 0
  return (
    <Section description={problemWords.line} title={problemWords.title}>
      {empty ? <SectionText muted>{problemWords.none}</SectionText> : null}
      {failures.length > 0 ? (
        <div className={styles.group}>
          <CountHeading count={failures.length} label={problemWords.failed} />
          <ul aria-label={problemWords.failed} className={rows.list}>
            {failures.map((failure) => (
              <FailureRow
                failure={failure}
                key={`${failure.org}-${failure.number ?? 'image'}`}
              />
            ))}
          </ul>
        </div>
      ) : null}
      {skipped.length > 0 ? (
        <div className={styles.group}>
          <CountHeading count={skipTotal} label={problemWords.skipped} />
          <ul aria-label={problemWords.skipped} className={rows.list}>
            {skipped.map((reason) => (
              <li className={rows.row} key={reason}>
                <span className={rows.label}>{skipLabels[reason]}</span>
                <span className={rows.count}>
                  {skips[reason].toLocaleString('en')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {noAdmin.length > 0 ? (
        <SectionText muted>{noAdminLine(noAdmin)}</SectionText>
      ) : null}
    </Section>
  )
}
