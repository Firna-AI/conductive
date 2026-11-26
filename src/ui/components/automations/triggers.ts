export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

/** A time of day on the 24-hour clock, in the time zone of the automation. */
export type ClockTime = { hour: number; minute: number }

/**
 * A schedule: a preset, or a custom cron. Each runs at most once an hour,
 * so the minute field of a custom cron names one minute (decision 503).
 */
export type ScheduleTrigger =
  | { kind: 'hourly'; minute: number }
  | { kind: 'daily'; time: ClockTime }
  | { kind: 'weekdays'; time: ClockTime }
  | { kind: 'weekly'; day: Weekday; time: ClockTime }
  | { kind: 'custom'; cron: string }

export type PullRequestEvent = 'opened' | 'pushed' | 'merged'

/**
 * The author filter of a pull request trigger (decision 506 C). An author
 * passes "is" when the list names the author, and "is not" when it does
 * not. An empty "is" means every member. `members` is the entry "Members
 * of <org>" in "is", which stands for every member. A first account added
 * to an empty "is" adds that entry first, so the members keep their runs.
 * An account outside the org starts runs only when "is" names it.
 */
export type AuthorFilter = {
  members: boolean
  is: readonly string[]
  isNot: readonly string[]
}

type PullRequestTrigger = {
  kind: 'pull-request'
  event: PullRequestEvent
  authors?: AuthorFilter
}

export type Trigger = ScheduleTrigger | PullRequestTrigger
