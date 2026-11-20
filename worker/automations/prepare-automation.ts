import type { User } from '../../src/shared/api'
import type {
  UpdateAutomationRequest,
  Automation,
  AutomationCapabilities,
  AutomationInactiveReason,
} from '../../src/shared/automations'
import { modelChoice } from '../app-api/models'
import { choice } from '../chat/inputs'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError, isRecord } from '../http'
import { resolveAutomationAuthors } from './author-filters'
import { invalidAutomationInput } from './errors'
import { automationRepository, automationSection } from './automation-data'
import { automationSchedule } from './schedules'
import { automationTriggerInputs } from './stored-triggers'

export async function prepareAutomation(
  env: AppEnv,
  orgId: string,
  user: User,
  body: Record<string, unknown>,
  previous: Automation | null,
  dependencies: AppDependencies,
): Promise<Automation> {
  const field = (key: keyof UpdateAutomationRequest, fallback: unknown) =>
    body[key] === undefined ? fallback : body[key]
  const name = field('name', previous?.name ?? '')
  const prompt = field('prompt', previous?.prompt)
  const repositoryId = field('repositoryId', previous?.repositoryId)
  const sectionId = field('sectionId', previous?.sectionId)
  const active = field('active', previous?.active ?? true)
  const capabilities = readCapabilities(
    field(
      'capabilities',
      previous?.capabilities ?? { preapprovedSecretIds: [] },
    ),
  )
  if (
    typeof name !== 'string' ||
    typeof prompt !== 'string' ||
    !prompt.trim() ||
    typeof repositoryId !== 'string' ||
    typeof active !== 'boolean' ||
    (sectionId !== undefined && typeof sectionId !== 'string')
  )
    throw invalidAutomationInput()
  const selectedChoice = modelChoice(
    env,
    choice(field('choice', previous?.choice)),
  )
  await requireAutomationRepository(env.DB, orgId, repositoryId)
  const section = await automationSection(env.DB, orgId, sectionId)
  if (!section) throw sectionNotFound()
  const now = dependencies.now()
  const schedule = automationSchedule(
    field(
      'triggers',
      previous ? automationTriggerInputs(previous.triggers) : undefined,
    ),
    field('timeZone', previous?.timeZone),
    active,
    now,
  )
  const triggers = await resolveAutomationAuthors(
    env,
    user.id,
    schedule.triggers,
    dependencies,
  )
  const inactiveReason: AutomationInactiveReason | null =
    active || previous?.active ? null : (previous?.inactiveReason ?? null)
  return {
    id: previous?.id ?? dependencies.randomToken(),
    orgId,
    owner: previous?.owner ?? user,
    movedFrom: previous?.movedFrom ?? null,
    name: name.trim() || 'Untitled automation',
    repositoryId,
    sectionId: section,
    prompt,
    choice: selectedChoice,
    capabilities,
    active,
    inactiveReason,
    failedRunsInARow:
      active && !previous?.active ? 0 : (previous?.failedRunsInARow ?? 0),
    timeZone: schedule.timeZone,
    triggers,
    nextRunAt: schedule.nextRunAt,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  }
}

function readCapabilities(value: unknown): AutomationCapabilities {
  if (!isRecord(value) || !Array.isArray(value.preapprovedSecretIds))
    throw invalidAutomationInput()
  const preapprovedSecretIds = value.preapprovedSecretIds.map((id: unknown) => {
    if (typeof id !== 'string') throw invalidAutomationInput()
    return id
  })
  return { preapprovedSecretIds: [...new Set(preapprovedSecretIds)] }
}

export async function requireAutomationRepository(
  db: D1Database,
  orgId: string,
  repositoryId: string,
): Promise<void> {
  if (!(await automationRepository(db, orgId, repositoryId)))
    throw new HttpError(
      404,
      'repository_not_found',
      'The repository is not available.',
    )
}

export function sectionNotFound(): HttpError {
  return new HttpError(
    404,
    'section_not_found',
    'The section is not available.',
  )
}
