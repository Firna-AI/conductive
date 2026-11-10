import { ChevronDown, ChevronUp, Clock, GitPullRequest, X } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/routines/TriggerRow.module.css'
import {
  authorSummary,
  triggerSummary,
} from '../../../docs/mockups/src/components/routines/triggerCopy'
import sheet from '../../../docs/mockups/src/screens/RoutineScreen.module.css'
import type { User } from '../../shared/api'
import type { RoutineTriggerInput } from '../../shared/routines'
import { ActionButton, IconButton } from '../ui/actions'
import { Sheet } from '../ui/Sheet'
import { AuthorFilter } from './AuthorFilter'
import { triggerName } from './routine-copy'
import { CronField, ScheduleControls } from './ScheduleControls'
import type { RefusedLogin } from './useRoutineSave'

/** The mark of a trigger: a clock for a schedule, or a pull request. */
function TriggerIcon(props: { trigger: RoutineTriggerInput }) {
  return props.trigger.kind === 'pull-request' ? (
    <GitPullRequest aria-hidden className={styles.icon} size={14} />
  ) : (
    <Clock aria-hidden className={styles.icon} size={14} />
  )
}

/** The author filter of a pull request trigger in words, under its name. */
function FilterSummary(props: {
  trigger: RoutineTriggerInput
  orgName: string
}) {
  const { trigger } = props
  if (trigger.kind !== 'pull-request' || !trigger.authors) return null
  return (
    <span className={styles.summary}>
      {authorSummary(trigger.authors, props.orgName).map((line) => (
        <span key={line}>{line}</span>
      ))}
    </span>
  )
}

/**
 * A trigger in the form of the owner, with its controls: the time of a
 * schedule, the field of a custom cron, or the author filter of a pull
 * request trigger. Desktop opens the filter under the row, and a phone in
 * a sheet.
 */
export function TriggerRow(props: {
  trigger: RoutineTriggerInput
  change: (trigger: RoutineTriggerInput) => void
  remove: () => void
  /** The author filter of the trigger is open. */
  open: boolean
  toggle: () => void
  orgName: string
  members: readonly User[]
  phone: boolean
  /** A login of the filter of this trigger that a save refused. */
  unknown: RefusedLogin | null
}) {
  const { trigger } = props
  const name = triggerName(trigger)
  const inline = props.open && !props.phone
  const Chevron = props.open ? ChevronUp : ChevronDown
  const filter =
    trigger.kind === 'pull-request' ? (
      <AuthorFilter
        change={(authors) =>
          props.change({ kind: trigger.kind, event: trigger.event, authors })
        }
        filter={trigger.authors}
        members={props.members}
        orgName={props.orgName}
        unknown={props.unknown}
      />
    ) : null
  return (
    <li className={styles.row}>
      <TriggerIcon trigger={trigger} />
      <div className={styles.main}>
        <div className={styles.line}>
          <span className={styles.name}>{name}</span>
          {trigger.kind === 'pull-request' ? null : (
            <ScheduleControls
              change={props.change}
              name={name}
              trigger={trigger}
            />
          )}
        </div>
        {inline ? null : (
          <FilterSummary orgName={props.orgName} trigger={trigger} />
        )}
        {trigger.kind === 'custom' ? (
          <CronField
            change={(cron) => props.change({ kind: trigger.kind, cron })}
            cron={trigger.cron}
          />
        ) : null}
        {inline ? filter : null}
      </div>
      <span className={styles.end}>
        {trigger.kind === 'pull-request' ? (
          <ActionButton
            accessibilityLabel={`Authors of ${name}`}
            expanded={props.open}
            onPress={props.toggle}
            tone="plain"
            trailing={
              <Chevron aria-hidden className={styles.chevron} size={13} />
            }
          >
            Authors
          </ActionButton>
        ) : null}
        <IconButton
          icon={X}
          label={`Remove ${name}`}
          onPress={props.remove}
          quiet
        />
      </span>
      {props.open && props.phone && filter ? (
        <Sheet close={props.toggle} title={`Authors for ${name}`}>
          <div className={sheet.sheetBody}>
            {filter}
            <ActionButton onPress={props.toggle} tone="primary">
              Done
            </ActionButton>
          </div>
        </Sheet>
      ) : null}
    </li>
  )
}

/** A trigger as another member reads it, with its author filter. */
export function TriggerFact(props: {
  trigger: RoutineTriggerInput
  orgName: string
}) {
  return (
    <li className={styles.row}>
      <TriggerIcon trigger={props.trigger} />
      <div className={styles.main}>
        <div className={styles.line}>
          <span className={styles.name}>{triggerSummary(props.trigger)}</span>
        </div>
        <FilterSummary orgName={props.orgName} trigger={props.trigger} />
      </div>
    </li>
  )
}
