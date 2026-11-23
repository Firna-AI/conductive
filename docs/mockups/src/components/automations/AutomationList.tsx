import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import type { AutomationRow } from '../../fixtures/automationRows'
import { offAfterFailedRuns, repositoryOf } from '../../fixtures/automations'
import { classes } from '../../../../../src/ui/components/common/classes'
import { ScreenLink } from '../common/ScreenLink'
import type { StatusTone } from '../../../../../src/ui/components/common/StatusText'
import { statusText } from '../../entries/components/common/StatusText.mockup'
import { personAvatar } from '../../entries/components/orgs/OrgTile.mockup'
import { statusGlyph } from '../../entries/components/workspaces/StatusGlyph.mockup'
import { runStateLabels } from './runCopy'
import { triggersSummary } from '../../../../../src/ui/components/automations/triggerCopy'
import styles from '../../../../../src/ui/components/automations/AutomationList.module.css'

/** The state of the last run and its time, or no run yet. */
function LastRun(props: { row: AutomationRow }) {
  const run = props.row.lastRun
  if (!run) return <span className={styles.lastRun}>No runs</span>
  return (
    <span
      className={styles.lastRun}
      title={`Last run: ${runStateLabels[run.state]}, ${run.when}`}
    >
      <statusGlyph.Component
        moklyInstance={`last-run-${props.row.automation.key}`}
        status={run.state}
      />
      <span className={styles.when}>{run.when}</span>
    </span>
  )
}

function Owner(props: { row: AutomationRow }) {
  const { owner } = props.row.automation
  return (
    <span className={styles.owner} title={`By ${owner.name}`}>
      <personAvatar.Component
        initials={owner.initials}
        moklyInstance={`owner-${props.row.automation.key}`}
        size={18}
      />
      <span className={styles.ownerName}>{owner.name}</span>
    </span>
  )
}

/**
 * Whether the automation is on. An automation that turned off after failed runs
 * says so in short, under Off (decision 513 B).
 */
function State(props: { row: AutomationRow }) {
  const { automation } = props.row
  const failed = offAfterFailedRuns(automation)
  let tone: StatusTone = automation.active ? 'success' : 'muted'
  if (failed) tone = 'danger'
  return (
    <span className={styles.state}>
      <statusText.Component
        label={automation.active ? 'Active' : 'Off'}
        moklyInstance={`state-${automation.key}`}
        tone={tone}
      />
      {failed ? <span className={styles.reason}>3 failed runs</span> : null}
    </span>
  )
}

function Row(props: { row: AutomationRow; to?: string; viewport: Viewport }) {
  const { row, to } = props
  const { automation } = row
  const detail = `${repositoryOf(automation)} · ${triggersSummary(automation.triggers)}`
  const mobile = props.viewport === 'mobile'
  const content = (
    <>
      <span className={styles.text}>
        <span className={styles.name}>{automation.name}</span>
        <span className={classes(styles.detail, mobile && styles.wrap)}>
          {detail}
        </span>
        {mobile ? (
          <span className={styles.facts}>
            <Owner row={row} />
            <LastRun row={row} />
          </span>
        ) : null}
      </span>
      {mobile ? null : <LastRun row={row} />}
      {mobile ? null : <Owner row={row} />}
      <State row={row} />
    </>
  )
  return (
    <li className={styles.item}>
      {to ? (
        <ScreenLink className={classes(styles.row, styles.link)} to={to}>
          {content}
        </ScreenLink>
      ) : (
        <span className={styles.row}>{content}</span>
      )}
    </li>
  )
}

/**
 * The automations of the org. Every member sees each automation (decision 502).
 * Each row shows the name, the repository, the triggers, the state of the
 * last run, the person whose logins the runs use, and whether it is on.
 */
export function AutomationList(props: {
  rows: readonly AutomationRow[]
  /** The automation pages that the mockups draw, by automation. */
  links: Readonly<Record<string, string>>
  viewport: Viewport
}) {
  return (
    <ul aria-label="Automations" className={styles.list}>
      {props.rows.map((row) => (
        <Row
          key={row.automation.key}
          row={row}
          to={props.links[row.automation.key]}
          viewport={props.viewport}
        />
      ))}
    </ul>
  )
}
