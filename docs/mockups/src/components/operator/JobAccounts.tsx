import {
  CircleCheck,
  CirclePause,
  Hourglass,
  type LucideIcon,
} from 'lucide-react'
import { classes } from '../../../../../src/ui/components/common/classes'
import { InlineText } from '../../../../../src/ui/components/common/InlineText'
import {
  StatusText,
  type StatusTone,
} from '../../../../../src/ui/components/common/StatusText'
import { SectionText } from '../../../../../src/ui/components/settings/Section'
import {
  accountStageLabel,
  expectedLine,
  jobRowLabels,
  jobWords,
  leftLine,
  refusalLine,
  rowProgress,
} from './migrationCopy'
import {
  accountStage,
  beforeFirstStart,
  expectedStarts,
  jobRows,
  startsLeft,
  type AccountStage,
  type JobAccount,
  type MigrationJob,
} from './migrationModel'
import styles from './MigrationJob.module.css'
import rows from '../../../../../src/ui/components/operator/WorkspaceStates.module.css'

/** The glyph and the colour of each stage, so no stage is colour alone. */
const stageLooks: Readonly<
  Record<
    AccountStage['kind'],
    { tone: StatusTone; busy?: true; icon?: LucideIcon }
  >
> = {
  running: { tone: 'active', busy: true },
  refused: { tone: 'warning', icon: Hourglass },
  pausing: { tone: 'neutral', busy: true },
  paused: { tone: 'neutral', icon: CirclePause },
  limited: { tone: 'neutral', icon: Hourglass },
  done: { tone: 'success', icon: CircleCheck },
}

/** The state of the job on one account, as a glyph and its words. */
function StageText(props: { stage: AccountStage }) {
  const look = stageLooks[props.stage.kind]
  return (
    <StatusText
      busy={look.busy}
      icon={look.icon}
      label={accountStageLabel(props.stage)}
      tone={look.tone}
    />
  )
}

/**
 * The lines under the rows of an account: why it waits after a refusal of
 * its provider, also during a pause, which keeps the wait, then the starts
 * that it expects before its first start, or the starts that are left,
 * with the time that they take at its pace. A done account has no line.
 */
function AccountLines(props: { account: JobAccount; stage: AccountStage }) {
  const { account, stage } = props
  const { pace, wait } = account
  if (stage.kind === 'done') return null
  const time = beforeFirstStart(account)
    ? expectedLine(
        expectedStarts(account),
        pace.perHour,
        account.rows.running.handled < account.rows.running.count,
      )
    : leftLine(startsLeft(account), pace.perHour)
  return (
    <>
      {wait ? (
        <p className={styles.refusal}>
          <InlineText text={refusalLine(account.id, wait.reason)} />
        </p>
      ) : null}
      <SectionText muted>{time}</SectionText>
    </>
  )
}

/** One account: its ID with its stage, its rows, and its lines. */
function AccountItem(props: { account: JobAccount; job: MigrationJob }) {
  const { account } = props
  const stage = accountStage(account, props.job)
  return (
    <li className={styles.account}>
      <div className={styles.head}>
        <span className={styles.id}>{account.id}</span>
        <StageText stage={stage} />
      </div>
      <ul aria-label={account.id} className={rows.list}>
        {jobRows
          .filter((row) => account.rows[row].count > 0)
          .map((row) => {
            const { count, handled } = account.rows[row]
            const label = jobRowLabels[row]
            return (
              <li className={rows.row} key={row}>
                <span className={rows.label}>
                  {label.state}
                  <span className={styles.kind}> · {label.kind}</span>
                </span>
                <span
                  className={classes(
                    styles.progress,
                    handled === count && styles.handled,
                  )}
                >
                  {rowProgress(handled, count)}
                </span>
              </li>
            )
          })}
      </ul>
      <AccountLines account={account} stage={stage} />
    </li>
  )
}

/**
 * The job on each provider account, by its ID: the state of the job there,
 * as the rule of `accountStage` derives it, then a row for each state and
 * kind of machine that the job counted before its first start, with how
 * many of them it handled. A machine that failed or that the job skipped
 * counts as handled. An account shows only the rows that it has machines
 * in. It imports no fixture, so the app can use it too.
 */
export function JobAccounts(props: { job: MigrationJob }) {
  const { job } = props
  return (
    <ul aria-label={jobWords.accountsLabel} className={styles.accounts}>
      {job.accounts.map((account) => (
        <AccountItem account={account} job={job} key={account.id} />
      ))}
    </ul>
  )
}
