/**
 * The routines of Acme: saved prompts that run an agent without a person,
 * on a schedule or on a pull request event. Each run opens a new workspace
 * (decision 501). A run acts as the person who created the routine, with
 * the agent login and the GitHub access of that person (decision 502).
 */

import { defaultChoice, type AgentChoice } from './agents'
import { people, type Person } from './members'
import type { RepositoryKey } from './repositories'
import type { SectionKey } from './sections'

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

/** A time of day on the 24-hour clock, in the time zone of the routine. */
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

export type Routine = {
  key: string
  /** The name. A new routine has none, and saves as "Untitled routine". */
  name: string
  repository: RepositoryKey
  /** The section that the run workspaces join (decision 504). */
  section: SectionKey
  /**
   * The member whose logins the runs use: the creator, or the admin who
   * got the routine when its creator left the org (decision 508 E).
   */
  owner: Person
  /**
   * The name of the member who left the org, from whom the routine moved,
   * turned off, to its owner (decision 508 E).
   */
  movedFrom?: string
  /**
   * The runs that failed in a row. A failed run, a failed start, and a
   * failed first turn count. A finished first turn resets the count.
   */
  failedRunsInARow?: number
  active: boolean
  /** The one time zone of every schedule of the routine. */
  timeZone: string
  triggers: readonly Trigger[]
  /** The first message of each run, before the facts of its trigger. */
  prompt: string
  choice: AgentChoice
  /** The routine exists. A new routine is not saved yet. */
  saved: boolean
}

/** The routines that the routine page draws. */
export const routineKeys = [
  'review-prs',
  'new',
  'morning-draft',
  'morning-summary',
  'dependency-updates',
  'copy-review',
  'error-triage',
] as const

export type RoutineKey = (typeof routineKeys)[number]

const london = 'Europe/London'

const opened: Trigger = { kind: 'pull-request', event: 'opened' }
const pushed: Trigger = { kind: 'pull-request', event: 'pushed' }

/** The routine that the flow creates and starts with Run now. */
const morningSummary: Routine = {
  key: 'morning-summary',
  name: 'Morning summary',
  repository: 'storefront',
  section: 'general',
  owner: people.cal,
  active: true,
  timeZone: london,
  triggers: [{ kind: 'weekdays', time: { hour: 9, minute: 0 } }],
  prompt:
    'List the pull requests merged into main since the last workday, with one line on each. Name each one that changed the checkout.',
  choice: defaultChoice,
  saved: true,
}

export const routines: Readonly<Record<RoutineKey, Routine>> = {
  'review-prs': {
    key: 'review-prs',
    name: 'Review pull requests',
    repository: 'storefront',
    section: 'general',
    owner: people.cal,
    active: true,
    timeZone: london,
    triggers: [opened, pushed],
    prompt:
      'Review this pull request for bugs, missing tests, and unclear names. Post your findings as one review on the pull request, and push no commits.',
    choice: defaultChoice,
    saved: true,
  },
  new: {
    key: 'new',
    name: '',
    repository: 'storefront',
    section: 'general',
    owner: people.cal,
    active: true,
    timeZone: london,
    triggers: [],
    prompt: '',
    choice: defaultChoice,
    saved: false,
  },
  'morning-draft': {
    ...morningSummary,
    key: 'morning-draft',
    triggers: [],
    saved: false,
  },
  'morning-summary': morningSummary,
  'dependency-updates': {
    key: 'dependency-updates',
    name: 'Weekly dependency updates',
    repository: 'storefront',
    section: 'infra',
    owner: people.priya,
    active: true,
    timeZone: london,
    triggers: [{ kind: 'weekly', day: 'monday', time: { hour: 8, minute: 0 } }],
    prompt:
      'Update the npm packages that have new minor or patch versions. Run the tests, and open one pull request with the updates.',
    choice: { agent: 'codex', model: 'GPT-6.1 Sol', effort: 'medium' },
    saved: true,
  },
  'copy-review': {
    key: 'copy-review',
    name: 'Check the site copy',
    repository: 'marketing-site',
    section: 'general',
    owner: people.cal,
    movedFrom: 'Lena Park',
    active: false,
    timeZone: london,
    triggers: [
      { kind: 'weekly', day: 'friday', time: { hour: 16, minute: 0 } },
    ],
    prompt:
      'Read the pages that changed this week. Fix typos, broken links, and words that break the style guide, and open one pull request.',
    choice: defaultChoice,
    saved: true,
  },
  'error-triage': {
    key: 'error-triage',
    name: 'Triage new errors',
    repository: 'billing-service',
    section: 'infra',
    owner: people.cal,
    failedRunsInARow: 3,
    active: false,
    timeZone: london,
    triggers: [{ kind: 'hourly', minute: 15 }],
    prompt:
      'Read the errors of the last hour. Group them by cause, and open an issue for each new cause.',
    choice: defaultChoice,
    saved: true,
  },
}

/** The failed runs in a row that turn a routine off (decision 513 B). */
const failedRunsToTurnOff = 3

/** The routine turned off because its last runs failed in a row. */
export function offAfterFailedRuns(routine: Routine): boolean {
  return (
    !routine.active && (routine.failedRunsInARow ?? 0) >= failedRunsToTurnOff
  )
}

/** A routine that Jonas turned off, which only the list shows. */
export const changelog: Routine = {
  key: 'changelog',
  name: 'Update the changelog',
  repository: 'marketing-site',
  section: 'general',
  owner: people.jonas,
  active: false,
  timeZone: london,
  triggers: [{ kind: 'pull-request', event: 'merged' }],
  prompt:
    'Add a line for this pull request to the changelog page, and open a pull request with it.',
  choice: defaultChoice,
  saved: true,
}
