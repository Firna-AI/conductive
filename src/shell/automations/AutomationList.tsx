import { classes } from '../../ui/components/common/classes'
import {
  StatusText,
  type StatusTone,
} from '../../ui/components/common/StatusText'
import styles from '../../ui/components/automations/AutomationList.module.css'
import { StatusGlyph } from '../../ui/components/workspaces/StatusGlyph'
import type { ListedAutomation } from '../../app/api/read-automations'
import { personName } from '../../app/people'
import { routes } from '../../app/router'
import { formatAgo, useNow } from '../../app/time'
import type { Repository } from '../../shared/org-settings'
import { AppLink } from '../ui/AppLink'
import { PersonAvatar } from '../ui/Avatars'
import ui from '../ui/ui.module.css'
import { useViewport } from '../ui/viewport'
import { runStateLabel, triggersText } from './automation-copy'
import { runMark } from './run-copy'

/** The state of the last run and its time, or no run yet. */
function LastRun(props: { automation: ListedAutomation; now: number }) {
  const run = props.automation.lastRun
  if (!run) return <span className={styles.lastRun}>No runs</span>
  const label = runStateLabel(run.state)
  const when = formatAgo(props.now, run.createdAt)
  return (
    <span className={styles.lastRun} title={`Last run: ${label}, ${when}`}>
      <StatusGlyph status={runMark(run)} />
      <span className={ui.hidden}>{`Last run: ${label}, `}</span>
      <span className={styles.when}>{when}</span>
    </span>
  )
}

/** The member whose logins the runs use. */
function Owner(props: { automation: ListedAutomation }) {
  const { owner } = props.automation
  const name = personName(owner)
  return (
    <span className={styles.owner} title={`By ${name}`}>
      <PersonAvatar person={owner} size={18} />
      <span className={ui.hidden}>By </span>
      <span className={styles.ownerName}>{name}</span>
    </span>
  )
}

/**
 * Whether the automation is on. An automation that turned off after three failed
 * runs in a row says so in short, under Off.
 */
function State(props: { automation: ListedAutomation }) {
  const { automation } = props
  const failed =
    !automation.active && automation.inactiveReason === 'failed_runs'
  let tone: StatusTone = automation.active ? 'success' : 'muted'
  if (failed) tone = 'danger'
  return (
    <span className={styles.state}>
      <StatusText label={automation.active ? 'Active' : 'Off'} tone={tone} />
      {failed ? <span className={styles.reason}>3 failed runs</span> : null}
    </span>
  )
}

/**
 * One automation, with a link to its page. A phone puts the owner and the
 * last run on a third line.
 */
function Row(props: {
  orgId: string
  automation: ListedAutomation
  /** The name of its repository, when the org's list has it. */
  repository: string | undefined
  now: number
  phone: boolean
}) {
  const { automation, phone } = props
  const triggers = triggersText(automation.triggers)
  const detail = props.repository
    ? `${props.repository} · ${triggers}`
    : triggers
  return (
    <li className={styles.item}>
      <AppLink
        className={classes(styles.row, styles.link)}
        to={routes.automation(props.orgId, automation.id)}
      >
        <span className={styles.text}>
          <span className={styles.name}>{automation.name}</span>
          <span className={classes(styles.detail, phone && styles.wrap)}>
            {detail}
          </span>
          {phone ? (
            <span className={styles.facts}>
              <Owner automation={automation} />
              <LastRun now={props.now} automation={automation} />
            </span>
          ) : null}
        </span>
        {phone ? null : <LastRun now={props.now} automation={automation} />}
        {phone ? null : <Owner automation={automation} />}
        <State automation={automation} />
      </AppLink>
    </li>
  )
}

/**
 * The automations of the org. Every member sees each automation. Each row shows
 * the name, the repository, the triggers, the state and the time of the
 * last run, the person whose logins the runs use, and whether it is on.
 */
export function AutomationList(props: {
  orgId: string
  automations: readonly ListedAutomation[]
  repositories: readonly Repository[]
}) {
  const phone = useViewport() === 'phone'
  const now = useNow(30_000)
  const names = new Map(
    props.repositories.map((repository) => [
      repository.id,
      repository.fullName,
    ]),
  )
  return (
    <ul aria-label="Automations" className={styles.list}>
      {props.automations.map((automation) => (
        <Row
          key={automation.id}
          now={now}
          orgId={props.orgId}
          phone={phone}
          repository={names.get(automation.repositoryId)}
          automation={automation}
        />
      ))}
    </ul>
  )
}
