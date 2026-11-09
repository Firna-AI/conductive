import { DropdownSelector } from '@firna/ui/dropdown'
import { Input } from '@firna/ui/input'
import { fonts } from '../../design/metrics'
import type { ClockTime, ScheduleTrigger } from '../../fixtures/routines'
import { noop } from '../../noop'
import { useControlSizes } from '../common/touch'
import { twoDigits, weekdayLabels } from './triggerCopy'
import form from './form.module.css'
import styles from './ScheduleControls.module.css'

type Option = { label: string; value: string }

function numbers(count: number): Option[] {
  return Array.from({ length: count }, (_, value) => ({
    label: twoDigits(value),
    value: String(value),
  }))
}

const hours = numbers(24)
const minutes = numbers(60)

const days: Option[] = Object.entries(weekdayLabels).map(([value, label]) => ({
  label,
  value,
}))

/**
 * A select of the schedule, such as the hour. `@firna/ui` has no time
 * input, so a time is a select for the hour and one for the minute.
 */
function Select(props: {
  label: string
  options: Option[]
  value: string
  wide?: boolean
}) {
  const { field } = useControlSizes()
  return (
    <span className={props.wide ? styles.day : styles.number}>
      <DropdownSelector
        onValueChange={noop}
        options={props.options}
        size={field}
        triggerLabel={props.label}
        value={props.value}
      />
    </span>
  )
}

/** "at" and a time of day: the hour and the minute, on the 24-hour clock. */
function AtTime(props: { time: ClockTime }) {
  return (
    <span className={styles.group}>
      <span className={form.joiner}>at</span>
      <Select label="Hour" options={hours} value={String(props.time.hour)} />
      <span className={form.joiner}>:</span>
      <Select
        label="Minute"
        options={minutes}
        value={String(props.time.minute)}
      />
    </span>
  )
}

/**
 * The controls of a schedule: Hourly asks for a minute, Daily and Weekdays
 * for a time, and Weekly for a day and a time. A custom cron has its own
 * field below the row.
 */
export function ScheduleControls(props: { trigger: ScheduleTrigger }) {
  const { trigger } = props
  switch (trigger.kind) {
    case 'hourly':
      return (
        <span className={styles.group}>
          <span className={form.joiner}>at minute</span>
          <Select
            label="Minute"
            options={minutes}
            value={String(trigger.minute)}
          />
        </span>
      )
    case 'daily':
    case 'weekdays':
      return <AtTime time={trigger.time} />
    case 'weekly':
      return (
        <span className={styles.controls}>
          <span className={styles.group}>
            <span className={form.joiner}>on</span>
            <Select label="Day" options={days} value={trigger.day} wide />
          </span>
          <AtTime time={trigger.time} />
        </span>
      )
    case 'custom':
      return null
  }
}

/**
 * The field of a custom cron, in the time zone of the routine. A cron that
 * runs more than once an hour is refused, so its minute names one minute
 * (decision 203).
 */
export function CronField(props: { cron: string; refused?: boolean }) {
  const { field } = useControlSizes()
  return (
    <Input
      error={
        props.refused
          ? 'This runs more than once an hour. Set the first field to one minute, such as 0.'
          : undefined
      }
      hint={
        props.refused
          ? undefined
          : 'Minute, hour, day, month, and weekday. It runs at most once an hour.'
      }
      inputStyle={{ fontFamily: fonts.mono }}
      label="Cron"
      onChangeText={noop}
      size={field}
      value={props.cron}
    />
  )
}
