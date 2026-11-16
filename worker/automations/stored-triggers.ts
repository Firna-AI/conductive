import type {
  AutomationAuthorAccount,
  AutomationAuthorFilter,
  AutomationTrigger,
  AutomationTriggerInput,
} from '../../src/shared/automations'
import { isRecord } from '../http'
import { invalidAutomationInput } from './errors'
import { parseAutomationTriggers } from './triggers'

function accounts(value: unknown): AutomationAuthorAccount[] {
  if (!Array.isArray(value)) throw invalidAutomationInput()
  return value.map((account: unknown) => {
    if (
      !isRecord(account) ||
      typeof account.githubId !== 'number' ||
      !Number.isSafeInteger(account.githubId) ||
      typeof account.login !== 'string'
    )
      throw invalidAutomationInput()
    return { githubId: account.githubId, login: account.login }
  })
}

export function readAutomationTriggers(json: string): AutomationTrigger[] {
  const value: unknown = JSON.parse(json)
  if (!Array.isArray(value)) throw invalidAutomationInput()
  return value.map((entry: unknown): AutomationTrigger => {
    if (!isRecord(entry)) throw invalidAutomationInput()
    const [trigger] = parseAutomationTriggers([
      { ...entry, authors: undefined },
    ])
    if (trigger.kind !== 'pull-request') return trigger
    if (entry.authors === undefined)
      return { kind: trigger.kind, event: trigger.event }
    return {
      ...trigger,
      authors: readAuthors(entry.authors),
    }
  })
}

function readAuthors(value: unknown): AutomationAuthorFilter {
  if (!isRecord(value) || typeof value.members !== 'boolean')
    throw invalidAutomationInput()
  return {
    members: value.members,
    is: accounts(value.is),
    isNot: accounts(value.isNot),
  }
}

export function automationTriggerInputs(
  triggers: readonly AutomationTrigger[],
): AutomationTriggerInput[] {
  return triggers.map((trigger) => {
    if (trigger.kind !== 'pull-request') return trigger
    if (!trigger.authors) return { kind: trigger.kind, event: trigger.event }
    return {
      ...trigger,
      authors: {
        members: trigger.authors.members,
        is: trigger.authors.is.map((account) => account.login),
        isNot: trigger.authors.isNot.map((account) => account.login),
      },
    }
  })
}
