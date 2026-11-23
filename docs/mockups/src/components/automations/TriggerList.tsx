import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { DropdownSelector } from '@firna/ui/dropdown'
import type { TriggerEdit } from '../../fixtures/automationTriggers'
import { noop } from '../../../../../src/ui/noop'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { menu } from '../../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import {
  eventLabels,
  hasSchedule,
  scheduleLabels,
} from '../../../../../src/ui/components/automations/triggerCopy'
import { TriggerFact, TriggerRow } from './TriggerRow'
import form from '../../../../../src/ui/components/automations/form.module.css'
import styles from '../../../../../src/ui/components/automations/TriggerList.module.css'

/**
 * The Add trigger menu: one flat menu with two labelled groups, because
 * neither `@firna/ui` nor the menu of the app has submenus. The flow picks
 * Weekdays, so its row shows under the pointer.
 */
export const addTriggerEntries: readonly MenuEntryData[] = [
  { kind: 'label', label: 'Scheduled' },
  ...(['hourly', 'daily', 'weekdays', 'weekly', 'custom'] as const).map(
    (kind): MenuEntryData => ({
      kind: 'item',
      label: scheduleLabels[kind],
      highlighted: kind === 'weekdays',
    }),
  ),
  { kind: 'divider' },
  { kind: 'label', label: 'GitHub' },
  ...(['opened', 'pushed', 'merged'] as const).map((event): MenuEntryData => ({
    kind: 'item',
    label: eventLabels[event],
  })),
]

const timeZones = [
  'Europe/London',
  'Europe/Lisbon',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'UTC',
].map((zone) => ({ label: zone, value: zone }))

/** Add trigger, with its menu open beside it on desktop. */
function AddTrigger(props: { open: boolean; viewport: Viewport }) {
  const button = (
    <actionButton.Component
      expanded={props.open}
      icon="plus"
      menu
      moklyInstance="add-trigger"
    >
      Add trigger
    </actionButton.Component>
  )
  return (
    <span className={styles.add}>
      {props.open ? (
        button
      ) : (
        <ScreenLink asChild to={paths.automationTriggers}>
          {button}
        </ScreenLink>
      )}
      {props.open && props.viewport === 'desktop' ? (
        <menu.Component
          entries={addTriggerEntries}
          label="Add trigger"
          moklyInstance="add-trigger-menu"
          placement="below-end"
        />
      ) : null}
    </span>
  )
}

/** The one time zone of every schedule of the automation, which the owner sets. */
function TimeZoneField(props: { timeZone: string }) {
  const { field } = useControlSizes()
  return (
    <div className={styles.zone}>
      <DropdownSelector
        hint="Every schedule of this automation uses it."
        label="Time zone"
        onValueChange={noop}
        options={timeZones}
        searchable
        size={field}
        value={props.timeZone}
      />
    </div>
  )
}

/**
 * The triggers of an automation. The owner adds and removes them, and sets
 * the time zone of the schedules. Another member reads them. An automation
 * without a trigger runs only with Run now.
 */
export function TriggerList(props: {
  edits: readonly TriggerEdit[]
  /** The Add trigger menu is open. A phone shows it in a sheet. */
  menu: boolean
  timeZone: string
  readOnly: boolean
  /** What the list says when the automation has no trigger. */
  emptyText: string
  viewport: Viewport
}) {
  const { edits } = props
  const schedules = hasSchedule(edits.map((edit) => edit.trigger))
  return (
    <section aria-labelledby="triggers-heading" className={styles.section}>
      <div className={styles.head}>
        <h2 className={form.label} id="triggers-heading">
          Triggers
        </h2>
        {props.readOnly ? null : (
          <AddTrigger open={props.menu} viewport={props.viewport} />
        )}
      </div>
      {edits.length === 0 ? (
        <p className={styles.empty}>{props.emptyText}</p>
      ) : (
        <ul className={styles.list}>
          {edits.map((edit, index) =>
            props.readOnly ? (
              <TriggerFact key={index} trigger={edit.trigger} />
            ) : (
              <TriggerRow edit={edit} key={index} viewport={props.viewport} />
            ),
          )}
        </ul>
      )}
      {schedules && !props.readOnly ? (
        <TimeZoneField timeZone={props.timeZone} />
      ) : null}
    </section>
  )
}
