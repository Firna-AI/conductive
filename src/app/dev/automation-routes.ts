import type { MessageSender } from '../../shared/generated/MessageSender'
import {
  automationPath,
  automationsPath,
  type Automation,
  type AutomationResponse,
  type AutomationsResponse,
} from '../../shared/automations'
import { flag, record, text, type JsonObject } from '../api/parse'
import { requireOrg, type DevBackend } from './backend'
import { ID, json, noContent, optional, type Route } from './router'
import {
  choiceOf,
  nextRunOf,
  promptOf,
  repositoryOf,
  sectionOf,
  storedTriggers,
  timeZoneOf,
} from './automation-input'
import {
  ownerRequired,
  requireAutomation,
  automationRuns,
} from './automation-records'
import { slugify, uniqueId, type OrgState } from './state'

function reply(automation: Automation, status = 200): Response {
  return json({ automation } satisfies AutomationResponse, status)
}

/** The signed-in person, as the owner of an automation. */
function senderOf(backend: DevBackend): MessageSender {
  const { user } = backend.state.account
  return {
    id: user.id,
    githubLogin: user.githubLogin,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}

/** A new automation of the signed-in person, as the Worker checks and stores it. */
function createAutomation(backend: DevBackend, org: OrgState, body: unknown) {
  const fields = record(body)
  const now = backend.now()
  const name = optional(fields, 'name', text)?.trim() || 'Untitled automation'
  const automation: Automation = {
    id: uniqueId(
      slugify(name, 'automation'),
      org.automations.map((item) => item.id),
    ),
    orgId: org.org.id,
    owner: senderOf(backend),
    movedFrom: null,
    name,
    repositoryId: repositoryOf(org, fields),
    sectionId: sectionOf(org, optional(fields, 'sectionId', text)),
    prompt: promptOf(fields),
    choice: choiceOf(fields),
    active: optional(fields, 'active', flag) ?? true,
    inactiveReason: null,
    failedRunsInARow: 0,
    timeZone: timeZoneOf(fields),
    triggers: storedTriggers(org, fields.triggers),
    nextRunAt: null,
    createdAt: now,
    updatedAt: now,
  }
  const saved = { ...automation, nextRunAt: nextRunOf(automation, now) }
  org.automations = [saved, ...org.automations]
  return reply(saved, 201)
}

/** The fields of an update that the owner sent, each checked as on create. */
function updated(
  org: OrgState,
  automation: Automation,
  fields: JsonObject,
): Automation {
  const has = (key: string) => fields[key] !== undefined
  const active = optional(fields, 'active', flag) ?? automation.active
  const turnedOn = active && !automation.active
  return {
    ...automation,
    name: has('name')
      ? text(fields, 'name').trim() || 'Untitled automation'
      : automation.name,
    repositoryId: has('repositoryId')
      ? repositoryOf(org, fields)
      : automation.repositoryId,
    sectionId: has('sectionId')
      ? sectionOf(org, text(fields, 'sectionId'))
      : automation.sectionId,
    prompt: has('prompt') ? promptOf(fields) : automation.prompt,
    choice: has('choice') ? choiceOf(fields) : automation.choice,
    active,
    inactiveReason:
      active || automation.active ? null : automation.inactiveReason,
    failedRunsInARow: turnedOn ? 0 : automation.failedRunsInARow,
    timeZone: has('timeZone') ? timeZoneOf(fields) : automation.timeZone,
    triggers: has('triggers')
      ? storedTriggers(org, fields.triggers)
      : automation.triggers,
  }
}

/**
 * An update of an automation. Its owner changes each field. An admin, or the
 * owner, can also turn it off alone, with `{ "active": false }`.
 */
function updateAutomation(
  backend: DevBackend,
  org: OrgState,
  automationId: string,
  body: unknown,
) {
  const fields = record(body)
  const automation = requireAutomation(org, automationId)
  const owner = automation.owner.id === backend.state.account.user.id
  const turnOff =
    fields.active === false &&
    Object.keys(fields).every((key) => key === 'active')
  if (!owner && !(turnOff && org.org.role === 'admin')) throw ownerRequired()
  const now = backend.now()
  const next = updated(org, automation, fields)
  const saved = { ...next, nextRunAt: nextRunOf(next, now), updatedAt: now }
  org.automations = org.automations.map((item) =>
    item.id === automationId ? saved : item,
  )
  return reply(saved)
}

/** Deletes an automation of its owner, or of an admin. Its runs go with it. */
function deleteAutomation(
  backend: DevBackend,
  org: OrgState,
  automationId: string,
) {
  const automation = requireAutomation(org, automationId)
  const owner = automation.owner.id === backend.state.account.user.id
  if (!owner && org.org.role !== 'admin') throw ownerRequired()
  org.automations = org.automations.filter((item) => item.id !== automationId)
  org.runs = org.runs.filter((run) => run.automationId !== automationId)
  return noContent()
}

/** The automations of an org: the list with the newest run of each, and one automation. */
export function automationRoutes(backend: DevBackend): Route[] {
  const orgOf = (org: string) => requireOrg(backend.state, org)
  return [
    {
      method: 'GET',
      path: automationsPath(ID.org),
      answer: ({ params }) => {
        const org = orgOf(params.org)
        return json({
          automations: org.automations.map((automation) => ({
            ...automation,
            lastRun: automationRuns(org, automation.id)[0] ?? null,
          })),
        } satisfies AutomationsResponse)
      },
    },
    {
      method: 'POST',
      path: automationsPath(ID.org),
      answer: ({ params, body }) =>
        createAutomation(backend, orgOf(params.org), body),
    },
    {
      method: 'GET',
      path: automationPath(ID.org, ID.automation),
      answer: ({ params }) =>
        reply(requireAutomation(orgOf(params.org), params.automation)),
    },
    {
      method: 'PATCH',
      path: automationPath(ID.org, ID.automation),
      answer: ({ params, body }) =>
        updateAutomation(backend, orgOf(params.org), params.automation, body),
    },
    {
      method: 'DELETE',
      path: automationPath(ID.org, ID.automation),
      answer: ({ params }) =>
        deleteAutomation(backend, orgOf(params.org), params.automation),
    },
  ]
}
