import { useMemo } from 'react'
import { DropdownSelector } from '@firna/ui/dropdown'
import { Input } from '@firna/ui/input'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import form from '../../../docs/mockups/src/components/routines/form.module.css'
import styles from '../../../docs/mockups/src/components/routines/ScheduleControls.module.css'
import list from '../../../docs/mockups/src/components/routines/TriggerList.module.css'
import {
  twoDigits,
  weekdayLabels,
} from '../../../docs/mockups/src/components/routines/triggerCopy'
import { fonts } from '../../../docs/mockups/src/design/metrics'
import { cronProblem } from '../../app/routine-cron'
import type { RoutineSchedule, RoutineWeekday } from '../../shared/routines'
import { cronRefusals } from './routine-copy'

type Option = { label: string; value: string }
type ClockTime = { hour: number; minute: number }

function numbers(count: number): Option[] {
  return Array.from({ length: count }, (_, value) => ({
    label: twoDigits(value),
    value: String(value),
  }))
}

const hours = numbers(24)
const minutes = numbers(60)

const weekdays = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const satisfies readonly RoutineWeekday[]

const days: Option[] = weekdays.map((day) => ({
  label: weekdayLabels[day],
  value: day,
}))

/**
 * A select of a schedule, such as the hour. `@firna/ui` has no time input,
 * so a time is a select for the hour and one for the minute.
 */
function Select(props: {
  label: string
  options: Option[]
  value: string
  change: (value: string) => void
  wide?: boolean
}) {
  const { field } = useControlSizes()
  return (
    <span className={props.wide ? styles.day : styles.number}>
      <DropdownSelector
        onValueChange={props.change}
        options={props.options}
        size={field}
        triggerLabel={props.label}
        value={props.value}
      />
    </span>
  )
}

/** "at" and a time of day on the 24-hour clock: the hour and the minute. */
function AtTime(props: {
  name: string
  time: ClockTime
  change: (time: ClockTime) => void
}) {
  const { time } = props
  return (
    <span className={styles.group}>
      <span className={form.joiner}>at</span>
      <Select
        change={(hour) => props.change({ ...time, hour: Number(hour) })}
        label={`${props.name} hour`}
        options={hours}
        value={String(time.hour)}
      />
      <span className={form.joiner}>:</span>
      <Select
        change={(minute) => props.change({ ...time, minute: Number(minute) })}
        label={`${props.name} minute`}
        options={minutes}
        value={String(time.minute)}
      />
    </span>
  )
}

/**
 * The controls of a schedule: Hourly asks for a minute, Daily and Weekdays
 * for a time, and Weekly for a day and a time. A custom cron has its own
 * field under the row.
 */
export function ScheduleControls(props: {
  trigger: RoutineSchedule
  /** The name of the trigger, which names its selects, such as "Daily". */
  name: string
  change: (trigger: RoutineSchedule) => void
}) {
  const { trigger, name } = props
  switch (trigger.kind) {
    case 'hourly':
      return (
        <span className={styles.group}>
          <span className={form.joiner}>at minute</span>
          <Select
            change={(minute) =>
              props.change({ ...trigger, minute: Number(minute) })
            }
            label={`${name} minute`}
            options={minutes}
            value={String(trigger.minute)}
          />
        </span>
      )
    case 'daily':
    case 'weekdays':
      return (
        <AtTime
          change={(time) => props.change({ ...trigger, time })}
          name={name}
          time={trigger.time}
        />
      )
    case 'weekly':
      return (
        <span className={styles.controls}>
          <span className={styles.group}>
            <span className={form.joiner}>on</span>
            <Select
              change={(value) => {
                const day = weekdays.find((item) => item === value)
                if (day) props.change({ ...trigger, day })
              }}
              label={`${name} day`}
              options={days}
              value={trigger.day}
              wide
            />
          </span>
          <AtTime
            change={(time) => props.change({ ...trigger, time })}
            name={name}
            time={trigger.time}
          />
        </span>
      )
    case 'custom':
      return null
  }
}

/**
 * The field of a custom cron, in the time zone of the routine. The form
 * refuses a cron that is not valid, or that runs more than once an hour.
 */
export function CronField(props: {
  cron: string
  change: (cron: string) => void
}) {
  const { field } = useControlSizes()
  const problem = cronProblem(props.cron)
  return (
    <Input
      autoCapitalize="none"
      autoCorrect={false}
      error={problem ? cronRefusals[problem] : undefined}
      hint={
        problem
          ? undefined
          : 'Minute, hour, day, month, and weekday. It runs at most once an hour.'
      }
      inputStyle={{ fontFamily: fonts.mono }}
      label="Cron"
      onChangeText={props.change}
      size={field}
      spellCheck={false}
      value={props.cron}
    />
  )
}

/**
 * Every time zone that the browser knows. Its list leaves out UTC, which
 * the field adds. A browser without the list offers UTC and the current
 * zone only.
 */
function browserZones(): readonly string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return []
  }
}

const zones = browserZones()

/** The one time zone of every schedule of the routine, which the owner sets. */
export function TimeZoneField(props: {
  timeZone: string
  change: (timeZone: string) => void
}) {
  const { field } = useControlSizes()
  const options = useMemo(
    () =>
      [...new Set([...zones, 'UTC', props.timeZone])]
        .sort()
        .map((zone) => ({ label: zone, value: zone })),
    [props.timeZone],
  )
  return (
    <div className={list.zone}>
      <DropdownSelector
        hint="Every schedule of this routine uses it."
        label="Time zone"
        onValueChange={props.change}
        options={options}
        searchable
        size={field}
        triggerLabel="Time zone"
        value={props.timeZone}
      />
    </div>
  )
}
