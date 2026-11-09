import type { Viewport } from '@mokly/mokly'
import { ChevronDown, ChevronUp, Clock, GitPullRequest, X } from 'lucide-react'
import type { TriggerEdit } from '../../fixtures/routineTriggers'
import type { Trigger } from '../../fixtures/routines'
import { paths } from '../../paths'
import { ActionButton, IconButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { AuthorFilter } from './AuthorFilter'
import { CronField, ScheduleControls } from './ScheduleControls'
import {
  authorSummary,
  eventLabels,
  scheduleLabels,
  triggerSummary,
} from './triggerCopy'
import styles from './TriggerRow.module.css'

/** The mark of a trigger: a clock for a schedule, or a pull request. */
function TriggerIcon(props: { trigger: Trigger }) {
  return props.trigger.kind === 'pull-request' ? (
    <GitPullRequest aria-hidden className={styles.icon} size={14} />
  ) : (
    <Clock aria-hidden className={styles.icon} size={14} />
  )
}

function nameOf(trigger: Trigger): string {
  return trigger.kind === 'pull-request'
    ? eventLabels[trigger.event]
    : scheduleLabels[trigger.kind]
}

/** The author filter of a pull request trigger in words, under its name. */
function FilterSummary(props: { trigger: Trigger }) {
  const { trigger } = props
  if (trigger.kind !== 'pull-request' || !trigger.authors) return null
  return (
    <span className={styles.summary}>
      {authorSummary(trigger.authors).map((line) => (
        <span key={line}>{line}</span>
      ))}
    </span>
  )
}

/** Opens and closes the author filter of a pull request trigger. */
function AuthorsToggle(props: { open: boolean }) {
  const Chevron = props.open ? ChevronUp : ChevronDown
  const button = (
    <ActionButton
      tone="plain"
      trailing={<Chevron aria-hidden className={styles.chevron} size={13} />}
    >
      Authors
    </ActionButton>
  )
  if (props.open) return button
  return (
    <ScreenLink asChild to={paths.authorFilter}>
      {button}
    </ScreenLink>
  )
}

/**
 * A trigger in the form of the owner, with its controls: the time of a
 * schedule, the field of a custom cron, or the author filter of a pull
 * request trigger. Desktop opens the filter under the row, and a phone in
 * a sheet.
 */
export function TriggerRow(props: { edit: TriggerEdit; viewport: Viewport }) {
  const { edit } = props
  const { trigger } = edit
  const name = nameOf(trigger)
  const open = edit.filterOpen === true
  return (
    <li className={styles.row}>
      <TriggerIcon trigger={trigger} />
      <div className={styles.main}>
        <div className={styles.line}>
          <span className={styles.name}>{name}</span>
          {trigger.kind === 'pull-request' ? null : (
            <ScheduleControls trigger={trigger} />
          )}
        </div>
        {open ? null : <FilterSummary trigger={trigger} />}
        {trigger.kind === 'custom' ? (
          <CronField cron={trigger.cron} refused={edit.refused} />
        ) : null}
        {open && props.viewport === 'desktop' ? (
          <AuthorFilter edit={edit} />
        ) : null}
      </div>
      <span className={styles.end}>
        {trigger.kind === 'pull-request' ? <AuthorsToggle open={open} /> : null}
        <IconButton icon={X} label={`Remove ${name}`} quiet />
      </span>
    </li>
  )
}

/** A trigger as another member reads it, with its author filter. */
export function TriggerFact(props: { trigger: Trigger }) {
  const { trigger } = props
  return (
    <li className={styles.row}>
      <TriggerIcon trigger={trigger} />
      <div className={styles.main}>
        <div className={styles.line}>
          <span className={styles.name}>{triggerSummary(trigger)}</span>
        </div>
        <FilterSummary trigger={trigger} />
      </div>
    </li>
  )
}
