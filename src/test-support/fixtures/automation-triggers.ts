import type {
  AutomationAuthorAccount,
  AutomationAuthorFilterInput,
  AutomationTrigger,
  AutomationTriggerInput,
  AutomationWeekday,
} from '../../shared/automations'
import { fakeUsers } from './core'

/** The day numbers of a cron expression, from Sunday. */
const weekdays: readonly AutomationWeekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

/** The account of a login, as the Worker resolves it at each save. */
export type AccountOf = (login: string) => AutomationAuthorAccount

/** A fake GitHub ID for a login: a fake user's, or one from its letters. */
export function fakeAccount(login: string): AutomationAuthorAccount {
  let githubId = fakeUsers.find((user) => user.githubLogin === login)?.githubId
  if (githubId === undefined) {
    githubId = 9_000
    for (const char of login) {
      githubId = (githubId * 31 + char.charCodeAt(0)) % 1_000_000_007
    }
  }
  return { githubId, login }
}

function accounts(filter: AutomationAuthorFilterInput, accountOf: AccountOf) {
  return {
    members: filter.members,
    is: filter.is.map(accountOf),
    isNot: filter.isNot.map(accountOf),
  }
}

/**
 * A trigger as a reply holds it: each schedule with its cron expression,
 * and each login of an author filter as its account.
 */
export function storedTrigger(
  source: AutomationTriggerInput,
  accountOf: AccountOf,
): AutomationTrigger {
  const at = (time: { hour: number; minute: number }) =>
    `${time.minute} ${time.hour} * *`
  switch (source.kind) {
    case 'hourly':
      return { ...source, cron: `${source.minute} * * * *` }
    case 'daily':
      return { ...source, cron: `${at(source.time)} *` }
    case 'weekdays':
      return { ...source, cron: `${at(source.time)} 1-5` }
    case 'weekly':
      return {
        ...source,
        cron: `${at(source.time)} ${weekdays.indexOf(source.day)}`,
      }
    case 'custom':
      return source
    case 'pull-request':
      return {
        kind: 'pull-request',
        event: source.event,
        ...(source.authors
          ? { authors: accounts(source.authors, accountOf) }
          : {}),
      }
  }
}
