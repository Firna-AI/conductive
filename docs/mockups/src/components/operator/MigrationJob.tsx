import type { ReactNode } from 'react'
import {
  CircleCheck,
  CirclePause,
  Hourglass,
  type LucideIcon,
} from 'lucide-react'
import {
  StatusText,
  type StatusTone,
} from '../../../../../src/ui/components/common/StatusText'
import {
  DetailList,
  type Detail,
} from '../../../../../src/ui/components/settings/DetailList'
import {
  Section,
  SectionText,
} from '../../../../../src/ui/components/settings/Section'
import { JobAccounts } from './JobAccounts'
import {
  jobStateLabels,
  jobWords,
  limitLine,
  onlyOrg,
  pausedValue,
} from './migrationCopy'
import { workLeft, type JobState, type MigrationJob } from './migrationModel'

/** The glyph and the colour of each state, so no state is colour alone. */
const stateLooks: Readonly<
  Record<JobState, { tone: StatusTone; busy?: true; icon?: LucideIcon }>
> = {
  counting: { tone: 'active', busy: true },
  running: { tone: 'active', busy: true },
  waiting: { tone: 'warning', icon: Hourglass },
  paused: { tone: 'neutral', icon: CirclePause },
  done: { tone: 'success', icon: CircleCheck },
}

/**
 * The facts of the job: when it started, the orgs that it works on, and
 * when and by whom it was paused, or when it finished.
 */
function jobDetails(job: MigrationJob): Detail[] {
  const details: Detail[] = [
    { term: jobWords.started, value: job.started },
    {
      term: jobWords.orgs,
      value: job.limit ? onlyOrg(job.limit.org) : jobWords.everyOrg,
    },
  ]
  if (job.paused) {
    details.push({
      term: jobWords.paused,
      value: pausedValue(job.paused.at, job.paused.by),
    })
  }
  if (job.done) details.push({ term: jobWords.done, value: job.done })
  return details
}

/**
 * The box of the migration job on the Providers tab of the operator (own
 * computer decision 7 D): the state of the job with its glyph, what it
 * does, its facts, the line of its limit to one org, and the job on each
 * provider account. The line of the limit takes the work that is left in
 * every row of that org, restarts included, so it says Done only when
 * each step there ended. While the job counts, a line says so in place of
 * the accounts. The screen gives the actions, such as Pause job. It
 * imports no fixture, so the app can use it too.
 */
export function MigrationJobSection(props: {
  job: MigrationJob
  actions?: ReactNode
}) {
  const { job } = props
  const look = stateLooks[job.state]
  return (
    <Section
      actions={props.actions}
      description={jobWords.line}
      status={
        <StatusText
          busy={look.busy}
          icon={look.icon}
          label={jobStateLabels[job.state]}
          tone={look.tone}
        />
      }
      title={jobWords.title}
    >
      <DetailList rows={jobDetails(job)} />
      {job.limit ? (
        <SectionText>
          {limitLine(
            job.limit.org,
            job.limit.rows ? workLeft(job.limit.rows) : null,
          )}
        </SectionText>
      ) : null}
      {job.state === 'counting' ? (
        <SectionText muted>{jobWords.counting}</SectionText>
      ) : (
        <JobAccounts accounts={job.accounts} />
      )}
    </Section>
  )
}
