import type {
  Automation,
  AutomationCapabilities,
  AutomationAuthorAccount,
  AutomationAuthorFilter,
  AutomationInactiveReason,
  AutomationResponse,
  AutomationsResponse,
  AutomationTrigger,
  AutomationWeekday,
} from '../../shared/automations'
import type { OrgSecret } from '../../shared/secrets'
import {
  choice,
  count,
  flag,
  items,
  maybeCount,
  maybeNested,
  maybeText,
  nested,
  record,
  text,
  texts,
} from './parse'
import { readChoice, readSender, readSessionLogin } from './read-core'
import { EVENTS, readRun, SCHEDULES } from './read-automation-runs'

/** An automation of the list of its org, with its newest run, or null. */
export type ListedAutomation = AutomationsResponse['automations'][number]

const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const satisfies readonly AutomationWeekday[]
const INACTIVE_REASONS = [
  'owner_left',
  'repository_removed',
  'failed_runs',
] as const satisfies readonly AutomationInactiveReason[]

function readClock(value: unknown): { hour: number; minute: number } {
  const time = record(value, 'time')
  return { hour: count(time, 'hour'), minute: count(time, 'minute') }
}

function readAccount(value: unknown): AutomationAuthorAccount {
  const account = record(value, 'account')
  return { githubId: count(account, 'githubId'), login: text(account, 'login') }
}

function readAuthors(value: unknown): AutomationAuthorFilter {
  const filter = record(value, 'authors')
  return {
    members: flag(filter, 'members'),
    is: items(filter, 'is', readAccount),
    isNot: items(filter, 'isNot', readAccount),
  }
}

function readTrigger(value: unknown): AutomationTrigger {
  const trigger = record(value, 'trigger')
  const kind = choice(trigger, 'kind', [...SCHEDULES, 'pull-request'])
  switch (kind) {
    case 'pull-request': {
      const authors = maybeNested(trigger, 'authors', readAuthors)
      return {
        kind,
        event: choice(trigger, 'event', EVENTS),
        ...(authors === null ? {} : { authors }),
      }
    }
    case 'hourly':
      return {
        kind,
        minute: count(trigger, 'minute'),
        cron: text(trigger, 'cron'),
      }
    case 'daily':
      return {
        kind,
        time: nested(trigger, 'time', readClock),
        cron: text(trigger, 'cron'),
      }
    case 'weekdays':
      return {
        kind,
        time: nested(trigger, 'time', readClock),
        cron: text(trigger, 'cron'),
      }
    case 'weekly':
      return {
        kind,
        day: choice(trigger, 'day', WEEKDAYS),
        time: nested(trigger, 'time', readClock),
        cron: text(trigger, 'cron'),
      }
    case 'custom':
      return { kind, cron: text(trigger, 'cron') }
  }
}

function readAutomation(value: unknown): Automation {
  const automation = record(value, 'automation')
  return {
    id: text(automation, 'id'),
    orgId: text(automation, 'orgId'),
    owner: nested(automation, 'owner', readSender),
    movedFrom: maybeText(automation, 'movedFrom'),
    name: text(automation, 'name'),
    repositoryId: text(automation, 'repositoryId'),
    sectionId: text(automation, 'sectionId'),
    prompt: text(automation, 'prompt'),
    choice: nested(automation, 'choice', readChoice),
    capabilities: readAutomationCapabilities(automation.capabilities),
    active: flag(automation, 'active'),
    inactiveReason: maybeNested(automation, 'inactiveReason', (reason) =>
      choice({ reason }, 'reason', INACTIVE_REASONS),
    ),
    failedRunsInARow: count(automation, 'failedRunsInARow'),
    timeZone: text(automation, 'timeZone'),
    triggers: items(automation, 'triggers', readTrigger),
    nextRunAt: maybeCount(automation, 'nextRunAt'),
    createdAt: count(automation, 'createdAt'),
    updatedAt: count(automation, 'updatedAt'),
  }
}

export function readAutomationCapabilities(
  value: unknown,
): AutomationCapabilities {
  if (value === undefined) return { preapprovedSecretIds: [] }
  return {
    preapprovedSecretIds: texts(
      record(value, 'capabilities'),
      'preapprovedSecretIds',
    ),
  }
}

/** A chosen secret as an automation reply names it: its ID and its name, with no value. */
function readChosenSecret(value: unknown): Pick<OrgSecret, 'id' | 'name'> {
  const secret = record(value, 'chosen secret')
  return { id: text(secret, 'id'), name: text(secret, 'name') }
}

/**
 * The automation of a read, a create, or an update, with the login of its
 * runs: the default login of its owner for its agent, as the server names
 * it, or null when no login serves the owner. An older reply names none.
 * The reply also names each chosen secret that the org has. The reply of a
 * previous Worker leaves the names out, so the result has none.
 */
export function readAutomationResponse(value: unknown): AutomationResponse {
  const reply = record(value, 'automation response')
  return {
    automation: nested(reply, 'automation', readAutomation),
    runLogin: maybeNested(reply, 'runLogin', readSessionLogin),
    ...(reply.chosenSecrets === undefined
      ? {}
      : { chosenSecrets: items(reply, 'chosenSecrets', readChosenSecret) }),
  }
}

/** The automations of an org, each with its newest run, in the order of the reply. */
export function readAutomations(value: unknown): ListedAutomation[] {
  return items(record(value, 'automations'), 'automations', (item) => ({
    ...readAutomation(item),
    lastRun: maybeNested(record(item, 'automation'), 'lastRun', readRun),
  }))
}
