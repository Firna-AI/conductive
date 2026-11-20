import type { AgentChoice } from '../shared/generated/AgentChoice'
import { sameChoice } from '../shared/agents'
import type { Repository } from '../shared/org-settings'
import type {
  CreateAutomationRequest,
  Automation,
  AutomationAuthorFilterInput,
  AutomationCapabilities,
  AutomationTrigger,
  AutomationTriggerInput,
  UpdateAutomationRequest,
} from '../shared/automations'
import type { Section } from '../shared/sections'
import { cronProblem } from './automation-cron'
import { withPreapproval } from './capabilities-model'

/**
 * An automation as its owner edits it. The triggers hold logins, as a save
 * sends them, and no cron for a preset, which the Worker computes.
 * `capabilities` holds the chosen secrets, which each run workspace starts
 * with as pre-approvals.
 */
export interface AutomationDraft {
  name: string
  active: boolean
  repositoryId: string
  sectionId: string
  prompt: string
  choice: AgentChoice
  capabilities: AutomationCapabilities
  timeZone: string
  triggers: readonly AutomationTriggerInput[]
}

/** A saved trigger as the form edits it: logins, and no cron of a preset. */
function triggerInputOf(trigger: AutomationTrigger): AutomationTriggerInput {
  switch (trigger.kind) {
    case 'hourly':
      return { kind: trigger.kind, minute: trigger.minute }
    case 'daily':
    case 'weekdays':
      return { kind: trigger.kind, time: trigger.time }
    case 'weekly':
      return { kind: trigger.kind, day: trigger.day, time: trigger.time }
    case 'custom':
      return { kind: trigger.kind, cron: trigger.cron }
    case 'pull-request': {
      const { authors } = trigger
      if (!authors) return { kind: trigger.kind, event: trigger.event }
      return {
        kind: trigger.kind,
        event: trigger.event,
        authors: {
          members: authors.members,
          is: authors.is.map((account) => account.login),
          isNot: authors.isNot.map((account) => account.login),
        },
      }
    }
  }
}

export function draftOf(automation: Automation): AutomationDraft {
  return {
    name: automation.name,
    active: automation.active,
    repositoryId: automation.repositoryId,
    sectionId: automation.sectionId,
    prompt: automation.prompt,
    choice: automation.choice,
    capabilities: automation.capabilities,
    timeZone: automation.timeZone,
    triggers: automation.triggers.map(triggerInputOf),
  }
}

/**
 * The draft of a new automation: active, without a name, a prompt, a chosen
 * secret, or a trigger, in the first chosen repository of the org and its
 * General section, with the owner's default model and the time zone of the
 * browser.
 */
export function newAutomationDraft(defaults: {
  repositories: readonly Repository[]
  sections: readonly Section[]
  choice: AgentChoice
  timeZone: string
}): AutomationDraft {
  const repository = defaults.repositories.find((item) => item.selected)
  const general =
    defaults.sections.find((section) => section.isDefault) ??
    defaults.sections[0]
  return {
    name: '',
    active: true,
    repositoryId: repository?.id ?? '',
    sectionId: general?.id ?? '',
    prompt: '',
    choice: defaults.choice,
    capabilities: { preapprovedSecretIds: [] },
    timeZone: defaults.timeZone,
    triggers: [],
  }
}

/** The draft with one chosen secret added or taken out. */
export function withChosenSecret(
  draft: AutomationDraft,
  secretId: string,
  on: boolean,
): AutomationDraft {
  const { preapprovedSecretIds } = draft.capabilities
  return {
    ...draft,
    capabilities: {
      preapprovedSecretIds: withPreapproval(preapprovedSecretIds, secretId, on),
    },
  }
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index])
}

/**
 * Whether two lists of chosen secrets name the same secrets. The order does
 * not count: the Worker gives them in its own order, and a check that the
 * owner takes back leaves the secrets as they were.
 */
function sameCapabilities(
  a: AutomationCapabilities,
  b: AutomationCapabilities,
): boolean {
  const left = new Set(a.preapprovedSecretIds)
  const right = new Set(b.preapprovedSecretIds)
  return left.size === right.size && [...left].every((id) => right.has(id))
}

function sameAuthors(
  a: AutomationAuthorFilterInput | undefined,
  b: AutomationAuthorFilterInput | undefined,
): boolean {
  if (!a || !b) return a === b
  return (
    a.members === b.members &&
    sameList(a.is, b.is) &&
    sameList(a.isNot, b.isNot)
  )
}

function sameTrigger(
  a: AutomationTriggerInput,
  b: AutomationTriggerInput,
): boolean {
  switch (a.kind) {
    case 'hourly':
      return b.kind === a.kind && b.minute === a.minute
    case 'daily':
    case 'weekdays':
      return (
        b.kind === a.kind &&
        b.time.hour === a.time.hour &&
        b.time.minute === a.time.minute
      )
    case 'weekly':
      return (
        b.kind === a.kind &&
        b.day === a.day &&
        b.time.hour === a.time.hour &&
        b.time.minute === a.time.minute
      )
    case 'custom':
      return b.kind === a.kind && b.cron === a.cron
    case 'pull-request':
      return (
        b.kind === a.kind &&
        b.event === a.event &&
        sameAuthors(a.authors, b.authors)
      )
  }
}

function sameTriggers(
  a: readonly AutomationTriggerInput[],
  b: readonly AutomationTriggerInput[],
): boolean {
  return (
    a.length === b.length &&
    a.every((item, index) => sameTrigger(item, b[index]))
  )
}

/** The equality of each field of a record. */
type FieldEqualities<T> = {
  readonly [K in keyof T]-?: (a: T[K], b: T[K]) => boolean
}

/** Whether the field `key` of two records differs. */
function differs<T, K extends keyof T>(
  fields: FieldEqualities<T>,
  key: K,
  a: T,
  b: T,
): boolean {
  return !fields[key](a[key], b[key])
}

/**
 * The equality of each field of a draft. A save sends the fields that
 * differ from the saved automation, and the form follows a newer automation field
 * by field with the same equality.
 */
export const draftFields: FieldEqualities<AutomationDraft> = {
  name: Object.is,
  active: Object.is,
  repositoryId: Object.is,
  sectionId: Object.is,
  prompt: Object.is,
  choice: sameChoice,
  capabilities: sameCapabilities,
  timeZone: Object.is,
  triggers: sameTriggers,
}

export function sameDraft(a: AutomationDraft, b: AutomationDraft): boolean {
  return Object.keys(updateRequest(a, b)).length === 0
}

/**
 * The request that creates an automation from its draft. It names the
 * chosen secrets, also when the list is empty.
 */
export function createRequest(draft: AutomationDraft): CreateAutomationRequest {
  return { ...draft, triggers: [...draft.triggers] }
}

/**
 * The fields of the draft that differ from the saved automation. The Worker
 * keeps each field that an update leaves out. So an edit sends Active only
 * when the owner changed it, and keeps a turn-off of the app since the read.
 * It sends the chosen secrets only when the owner changed which secrets
 * they are, and then the whole list.
 */
export function updateRequest(
  saved: AutomationDraft,
  draft: AutomationDraft,
): UpdateAutomationRequest {
  const changed = (key: keyof AutomationDraft) =>
    differs(draftFields, key, draft, saved)
  const request: UpdateAutomationRequest = {}
  if (changed('name')) request.name = draft.name
  if (changed('active')) request.active = draft.active
  if (changed('repositoryId')) request.repositoryId = draft.repositoryId
  if (changed('sectionId')) request.sectionId = draft.sectionId
  if (changed('prompt')) request.prompt = draft.prompt
  if (changed('choice')) request.choice = draft.choice
  if (changed('capabilities')) {
    const { preapprovedSecretIds } = draft.capabilities
    request.capabilities = { preapprovedSecretIds: [...preapprovedSecretIds] }
  }
  if (changed('timeZone')) request.timeZone = draft.timeZone
  if (changed('triggers')) request.triggers = [...draft.triggers]
  return request
}

/**
 * Whether a save can send the draft: the prompt has text, the automation has
 * a repository, and each custom cron passes.
 */
export function draftReady(draft: AutomationDraft): boolean {
  return (
    draft.prompt.trim() !== '' &&
    draft.repositoryId !== '' &&
    draft.triggers.every(
      (trigger) =>
        trigger.kind !== 'custom' || cronProblem(trigger.cron) === null,
    )
  )
}
