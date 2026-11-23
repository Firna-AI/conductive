import {
  CircleCheck,
  CirclePause,
  Hourglass,
  type LucideIcon,
} from 'lucide-react'
import { classes } from '../common/classes'
import { InlineText } from '../common/InlineText'
import { StatusText, type StatusTone } from '../common/StatusText'
import { SectionText } from '../settings/Section'
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
  beforeFirstStart,
  expectedStarts,
  jobRows,
  startsLeft,
  type AccountStage,
  type JobAccount,
} from './migrationModel'
import styles from './MigrationJob.module.css'
import rows from './WorkspaceStates.module.css'

/** The glyph and the colour of each stage, so no stage is colour alone. */
const stageLooks: Readonly<
  Record<
    AccountStage['kind'],
    { tone: StatusTone; busy?: true; icon?: LucideIcon }
  >
> = {
  running: { tone: 'active', busy: true },
  refused: { tone: 'warning', icon: Hourglass },
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
 * its provider, then the starts that it expects before its first start, or
 * the starts that are left, with the time that they take at its pace. A
 * done account has no line.
 */
function AccountLines(props: { account: JobAccount }) {
  const { account } = props
  const { stage, pace } = account
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
      {stage.kind === 'refused' ? (
        <p className={styles.refusal}>
          <InlineText text={refusalLine(account.id, stage.reason)} />
        </p>
      ) : null}
      <SectionText muted>{time}</SectionText>
    </>
  )
}

/**
 * The job on each provider account, by its ID: the state of the job there,
 * then a row for each state and kind of machine that the job counted
 * before its first start, with how many of them it handled. A machine
 * that failed or that the job skipped counts as handled. An account shows
 * only the rows that it has machines in. It imports no fixture, so the app
 * can use it too.
 */
export function JobAccounts(props: { accounts: readonly JobAccount[] }) {
  return (
    <ul aria-label={jobWords.accountsLabel} className={styles.accounts}>
      {props.accounts.map((account) => (
        <li className={styles.account} key={account.id}>
          <div className={styles.head}>
            <span className={styles.id}>{account.id}</span>
            <StageText stage={account.stage} />
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
          <AccountLines account={account} />
        </li>
      ))}
    </ul>
  )
}
