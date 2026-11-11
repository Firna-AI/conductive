import type {
  RoutineAuthorAccount,
  RoutineAuthorFilter,
  RoutineTrigger,
  RoutineTriggerInput,
} from '../../src/shared/routines'
import { isRecord } from '../http'
import { invalidRoutineInput } from './errors'
import { parseRoutineTriggers } from './triggers'

function accounts(value: unknown): RoutineAuthorAccount[] {
  if (!Array.isArray(value)) throw invalidRoutineInput()
  return value.map((account: unknown) => {
    if (
      !isRecord(account) ||
      typeof account.githubId !== 'number' ||
      !Number.isSafeInteger(account.githubId) ||
      typeof account.login !== 'string'
    )
      throw invalidRoutineInput()
    return { githubId: account.githubId, login: account.login }
  })
}

export function readRoutineTriggers(json: string): RoutineTrigger[] {
  const value: unknown = JSON.parse(json)
  if (!Array.isArray(value)) throw invalidRoutineInput()
  return value.map((entry: unknown): RoutineTrigger => {
    if (!isRecord(entry)) throw invalidRoutineInput()
    const [trigger] = parseRoutineTriggers([{ ...entry, authors: undefined }])
    if (trigger.kind !== 'pull-request') return trigger
    if (entry.authors === undefined)
      return { kind: trigger.kind, event: trigger.event }
    return {
      ...trigger,
      authors: readAuthors(entry.authors),
    }
  })
}

function readAuthors(value: unknown): RoutineAuthorFilter {
  if (!isRecord(value) || typeof value.members !== 'boolean')
    throw invalidRoutineInput()
  return {
    members: value.members,
    is: accounts(value.is),
    isNot: accounts(value.isNot),
  }
}

export function routineTriggerInputs(
  triggers: readonly RoutineTrigger[],
): RoutineTriggerInput[] {
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
