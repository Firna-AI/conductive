import { useId, useState } from 'react'
import { CircleAlert, Plus } from 'lucide-react'
import form from '../../../docs/mockups/src/components/routines/form.module.css'
import styles from '../../../docs/mockups/src/components/routines/TriggerList.module.css'
import {
  eventLabels,
  hasSchedule,
  scheduleLabels,
} from '../../../docs/mockups/src/components/routines/triggerCopy'
import {
  EVENT_CHOICES,
  newTrigger,
  SCHEDULE_CHOICES,
  type TriggerChoice,
} from '../../app/routine-triggers'
import type { User } from '../../shared/api'
import type { RoutineTriggerInput } from '../../shared/routines'
import { ActionButton } from '../ui/actions'
import { MenuButton, type MenuEntry } from '../ui/Menu'
import { useViewport } from '../ui/viewport'
import { TimeZoneField } from './ScheduleControls'
import { TriggerFact, TriggerRow } from './TriggerRow'

/**
 * Add trigger: one flat menu with two labelled groups, because the menu of
 * the app has no submenus. A phone opens it in a sheet.
 */
function AddTrigger(props: { add: (choice: TriggerChoice) => void }) {
  const item = (choice: TriggerChoice, label: string): MenuEntry => ({
    kind: 'item',
    label,
    onSelect: () => props.add(choice),
  })
  return (
    <MenuButton
      className={styles.add}
      entries={[
        { kind: 'label', label: 'Scheduled' },
        ...SCHEDULE_CHOICES.map((kind) => item(kind, scheduleLabels[kind])),
        { kind: 'divider' },
        { kind: 'label', label: 'GitHub' },
        ...EVENT_CHOICES.map((event) => item(event, eventLabels[event])),
      ]}
      label="Add trigger"
      placement="below-end"
      trigger={({ open, toggle }) => (
        <ActionButton expanded={open} icon={Plus} menu onPress={toggle}>
          Add trigger
        </ActionButton>
      )}
    />
  )
}

/**
 * The triggers in the form of the owner, who adds, changes, and removes
 * them, and sets the one time zone of the schedules. A routine without a
 * trigger runs only with Run now. One author filter is open at a time.
 */
export function TriggerEditor(props: {
  triggers: readonly RoutineTriggerInput[]
  change: (triggers: readonly RoutineTriggerInput[]) => void
  timeZone: string
  changeTimeZone: (timeZone: string) => void
  orgName: string
  members: readonly User[]
  /** The refusal of a save that names a login, which no GitHub account has. */
  refusal: string | null
}) {
  const heading = useId()
  const phone = useViewport() === 'phone'
  const [open, setOpen] = useState<number | null>(null)
  const { triggers, change } = props
  const remove = (index: number) => {
    change(triggers.filter((_, at) => at !== index))
    setOpen((current) => {
      if (current === null || current === index) return null
      return current > index ? current - 1 : current
    })
  }
  return (
    <section aria-labelledby={heading} className={styles.section}>
      <div className={styles.head}>
        <h2 className={form.label} id={heading}>
          Triggers
        </h2>
        <AddTrigger
          add={(choice) => change([...triggers, newTrigger(choice)])}
        />
      </div>
      {triggers.length === 0 ? (
        <p className={styles.empty}>
          No triggers. The routine runs only when you use Run now.
        </p>
      ) : (
        <ul aria-label="Triggers" className={styles.list}>
          {triggers.map((trigger, index) => (
            <TriggerRow
              change={(next) =>
                change(triggers.map((item, at) => (at === index ? next : item)))
              }
              key={index}
              members={props.members}
              open={open === index}
              orgName={props.orgName}
              phone={phone}
              remove={() => remove(index)}
              toggle={() =>
                setOpen((current) => (current === index ? null : index))
              }
              trigger={trigger}
            />
          ))}
        </ul>
      )}
      {props.refusal ? (
        <p className={form.error} role="alert">
          <CircleAlert aria-hidden className={form.errorIcon} size={12} />
          {props.refusal}
        </p>
      ) : null}
      {hasSchedule(triggers) ? (
        <TimeZoneField
          change={props.changeTimeZone}
          timeZone={props.timeZone}
        />
      ) : null}
    </section>
  )
}

/** The triggers as another member reads them, with each author filter. */
export function TriggerFacts(props: {
  triggers: readonly RoutineTriggerInput[]
  orgName: string
}) {
  const heading = useId()
  return (
    <section aria-labelledby={heading} className={styles.section}>
      <div className={styles.head}>
        <h2 className={form.label} id={heading}>
          Triggers
        </h2>
      </div>
      {props.triggers.length === 0 ? (
        <p className={styles.empty}>No triggers.</p>
      ) : (
        <ul aria-label="Triggers" className={styles.list}>
          {props.triggers.map((trigger, index) => (
            <TriggerFact
              key={index}
              orgName={props.orgName}
              trigger={trigger}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
