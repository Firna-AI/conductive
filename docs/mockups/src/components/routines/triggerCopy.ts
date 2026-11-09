import type {
  AuthorFilter,
  ClockTime,
  PullRequestEvent,
  ScheduleTrigger,
  Trigger,
  Weekday,
} from '../../fixtures/routines'

/** The pull request events, as the Add trigger menu names them. */
export const eventLabels: Readonly<Record<PullRequestEvent, string>> = {
  opened: 'PR opened',
  pushed: 'PR pushed',
  merged: 'PR merged',
}

/** The schedules, as the Add trigger menu names them. */
export const scheduleLabels: Readonly<Record<ScheduleTrigger['kind'], string>> =
  {
    hourly: 'Hourly',
    daily: 'Daily',
    weekdays: 'Weekdays',
    weekly: 'Weekly',
    custom: 'Custom (cron)',
  }

export const weekdayLabels: Readonly<Record<Weekday, string>> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

/** A number of the clock with two digits, such as "09". */
export function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/** A time on the 24-hour clock, such as "09:00". */
function clock(time: ClockTime): string {
  return `${twoDigits(time.hour)}:${twoDigits(time.minute)}`
}

/** A trigger in words, such as "Weekly on Monday at 08:00". */
export function triggerSummary(trigger: Trigger): string {
  switch (trigger.kind) {
    case 'hourly':
      return `Hourly at minute ${trigger.minute}`
    case 'daily':
      return `Daily at ${clock(trigger.time)}`
    case 'weekdays':
      return `Weekdays at ${clock(trigger.time)}`
    case 'weekly':
      return `Weekly on ${weekdayLabels[trigger.day]} at ${clock(trigger.time)}`
    case 'custom':
      return `Custom cron ${trigger.cron}`
    case 'pull-request':
      return eventLabels[trigger.event]
  }
}

/** The triggers of a routine in words, for its row in the list. */
export function triggersSummary(triggers: readonly Trigger[]): string {
  if (triggers.length === 0) return 'No triggers'
  return triggers.map(triggerSummary).join(', ')
}

/** GitHub logins in words, such as "@priyaraman, @jonasweber". */
function logins(list: readonly string[]): string {
  return list.map((login) => `@${login}`).join(', ')
}

/** The entry of "Author is" that stands for every member of the org. */
export function membersEntry(org: string): string {
  return `Members of ${org}`
}

/** An author filter in words, one line for each list that has entries. */
export function authorSummary(filter: AuthorFilter, org: string): string[] {
  const lines: string[] = []
  const is = [
    ...(filter.members ? [membersEntry(org)] : []),
    ...filter.is.map((login) => `@${login}`),
  ]
  if (is.length > 0) lines.push(`Author is ${is.join(', ')}`)
  if (filter.isNot.length > 0) {
    lines.push(`Author is not ${logins(filter.isNot)}`)
  }
  return lines
}

/** The routine has a schedule, so its page shows its time zone. */
export function hasSchedule(triggers: readonly Trigger[]): boolean {
  return triggers.some((trigger) => trigger.kind !== 'pull-request')
}
