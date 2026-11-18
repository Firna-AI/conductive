import {
  automationPath,
  automationsPath,
  type CreateAutomationRequest,
  type Automation,
  type AutomationRun,
  type UpdateAutomationRequest,
} from '../shared/automations'
import { ignore } from './api/parse'
import {
  readAutomationResponse,
  type ListedAutomation,
} from './api/read-automations'
import type { OrgModel } from './org-model'
import type { Change } from './resource'
import { forgetAutomation, automationModel } from './automation-model'

/*
 * The writes of an automation. Each answer of a create or an update is the
 * whole automation: the automation page shows it, and the Automations list takes it
 * at once, with the last run that the list already has. The writes of a
 * saved automation go through the client of its model, so a refusal with
 * `automation_not_found` reads the automation again.
 */

/** A newer record of an automation. An automation that the list lacks goes first. */
function automationPut(
  automation: Automation,
): Change<readonly ListedAutomation[]> {
  return (list) => {
    if (!list.some((item) => item.id === automation.id)) {
      return [{ ...automation, lastRun: null }, ...list]
    }
    return list.map((item) =>
      item.id === automation.id
        ? { ...automation, lastRun: item.lastRun }
        : item,
    )
  }
}

function automationRemoved(
  automationId: string,
): Change<readonly ListedAutomation[]> {
  return (list) => list.filter((item) => item.id !== automationId)
}

export async function createAutomation(
  org: OrgModel,
  request: CreateAutomationRequest,
): Promise<Automation> {
  const reply = await org.services.api.send(
    'POST',
    automationsPath(org.orgId),
    request,
    readAutomationResponse,
  )
  const { automation } = reply
  // The page of the new automation shows the answer at once, without a read.
  await automationModel(org, automation.id).resource.save(async () => reply)
  org.resources.automations.confirm(
    automationPut(automation),
    `automation ${automation.id}`,
  )
  return automation
}

/** Saves the fields of an automation that changed, after its earlier saves. */
export async function updateAutomation(
  org: OrgModel,
  automationId: string,
  request: UpdateAutomationRequest,
): Promise<Automation> {
  const model = automationModel(org, automationId)
  const { automation } = await model.resource.save(() =>
    model.client.send(
      'PATCH',
      automationPath(org.orgId, automationId),
      request,
      readAutomationResponse,
    ),
  )
  org.resources.automations.confirm(
    automationPut(automation),
    `automation ${automationId}`,
  )
  return automation
}

/**
 * Turn off of the owner or an admin. It sends Active alone, which the
 * Worker also takes from an admin who does not own the automation.
 */
export function turnOffAutomation(
  org: OrgModel,
  automationId: string,
): Promise<Automation> {
  return updateAutomation(org, automationId, { active: false })
}

/** Deletes an automation. Its run workspaces stay, as normal workspaces do. */
export async function deleteAutomation(
  org: OrgModel,
  automationId: string,
): Promise<void> {
  await automationModel(org, automationId).client.send(
    'DELETE',
    automationPath(org.orgId, automationId),
    {},
    ignore,
  )
  forgetAutomation(org, automationId)
  org.resources.automations.confirm(
    automationRemoved(automationId),
    `automation ${automationId}`,
  )
}

/**
 * Run now of the owner. Its run shows first in the Runs list, and as the
 * last run of the automation in the Automations list. The workspace list reads
 * again at once, so the new run workspace shows in it before the next
 * timer.
 */
export async function runAutomation(
  org: OrgModel,
  automationId: string,
): Promise<AutomationRun> {
  const run = await automationModel(org, automationId).runs.runNow()
  org.resources.automations.confirm(
    (list) =>
      list.map((item) =>
        item.id === automationId ? { ...item, lastRun: run } : item,
      ),
    `last run ${automationId}`,
  )
  if (run.workspaceId !== null) void org.reload('list')
  return run
}
