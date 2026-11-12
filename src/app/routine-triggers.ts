import type {
  RoutineAuthorFilterInput,
  RoutinePullRequestEvent,
  RoutineSchedule,
  RoutineTriggerInput,
} from '../shared/routines'

/** What the owner picks in the Add trigger menu: a schedule or an event. */
export type TriggerChoice = RoutineSchedule['kind'] | RoutinePullRequestEvent

/** The schedules of the menu, in its order. */
export const SCHEDULE_CHOICES = [
  'hourly',
  'daily',
  'weekdays',
  'weekly',
  'custom',
] as const satisfies readonly RoutineSchedule['kind'][]

/** The pull request events of the menu, in its order. */
export const EVENT_CHOICES = [
  'opened',
  'pushed',
  'merged',
] as const satisfies readonly RoutinePullRequestEvent[]

/** Nine in the morning, the time that a new schedule starts with. */
const morning = { hour: 9, minute: 0 }

/**
 * A new trigger as the menu adds it. A schedule starts at 09:00, or at the
 * full hour. A custom cron starts as a valid example, and a pull request
 * trigger starts without an author filter, so every member's events count.
 */
export function newTrigger(choice: TriggerChoice): RoutineTriggerInput {
  switch (choice) {
    case 'hourly':
      return { kind: choice, minute: 0 }
    case 'daily':
    case 'weekdays':
      return { kind: choice, time: morning }
    case 'weekly':
      return { kind: choice, day: 'monday', time: morning }
    case 'custom':
      return { kind: choice, cron: '0 9 * * 1-5' }
    case 'opened':
    case 'pushed':
    case 'merged':
      return { kind: 'pull-request', event: choice }
  }
}

/** The two lists of an author filter: "Author is" and "Author is not". */
export type AuthorList = 'is' | 'isNot'

const noFilter: RoutineAuthorFilterInput = {
  members: false,
  is: [],
  isNot: [],
}

/** No filter in place of an empty one, which also means every member. */
function kept(
  filter: RoutineAuthorFilterInput,
): RoutineAuthorFilterInput | undefined {
  const empty =
    !filter.members && filter.is.length === 0 && filter.isNot.length === 0
  return empty ? undefined : filter
}

function withList(
  filter: RoutineAuthorFilterInput,
  list: AuthorList,
  logins: readonly string[],
): RoutineAuthorFilterInput {
  return list === 'is'
    ? { ...filter, is: logins }
    : { ...filter, isNot: logins }
}

/**
 * Adds a GitHub login to a list, without a leading "@". The first account
 * of an empty "Author is" adds "Members of <org>" first, so the members'
 * pull requests still start runs.
 */
export function addAuthor(
  filter: RoutineAuthorFilterInput | undefined,
  list: AuthorList,
  login: string,
): RoutineAuthorFilterInput | undefined {
  const current = filter ?? noFilter
  const name = login.trim().replace(/^@/, '')
  const listed = current[list].some(
    (item) => item.toLowerCase() === name.toLowerCase(),
  )
  if (name === '' || listed) return filter
  const first = list === 'is' && current.is.length === 0 && !current.members
  return withList({ ...current, members: current.members || first }, list, [
    ...current[list],
    name,
  ])
}

export function removeAuthor(
  filter: RoutineAuthorFilterInput | undefined,
  list: AuthorList,
  login: string,
): RoutineAuthorFilterInput | undefined {
  if (!filter) return undefined
  return kept(
    withList(
      filter,
      list,
      filter[list].filter((item) => item !== login),
    ),
  )
}

/** Adds or removes the entry "Members of <org>" of "Author is". */
export function setMembers(
  filter: RoutineAuthorFilterInput | undefined,
  members: boolean,
): RoutineAuthorFilterInput | undefined {
  return kept({ ...(filter ?? noFilter), members })
}
