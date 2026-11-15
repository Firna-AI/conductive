import type { User } from '../../src/shared/api'
import type {
  UpdateRoutineRequest,
  Routine,
  RoutineInactiveReason,
} from '../../src/shared/routines'
import { modelChoice } from '../app-api/models'
import { choice } from '../chat/inputs'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { resolveRoutineAuthors } from './author-filters'
import { invalidRoutineInput } from './errors'
import { routineRepository, routineSection } from './routine-data'
import { routineSchedule } from './schedules'
import { routineTriggerInputs } from './stored-triggers'

export async function prepareRoutine(
  env: AppEnv,
  orgId: string,
  user: User,
  body: Record<string, unknown>,
  previous: Routine | null,
  dependencies: AppDependencies,
): Promise<Routine> {
  const field = (key: keyof UpdateRoutineRequest, fallback: unknown) =>
    body[key] === undefined ? fallback : body[key]
  const name = field('name', previous?.name ?? '')
  const prompt = field('prompt', previous?.prompt)
  const repositoryId = field('repositoryId', previous?.repositoryId)
  const sectionId = field('sectionId', previous?.sectionId)
  const active = field('active', previous?.active ?? true)
  if (
    typeof name !== 'string' ||
    typeof prompt !== 'string' ||
    !prompt.trim() ||
    typeof repositoryId !== 'string' ||
    typeof active !== 'boolean' ||
    (sectionId !== undefined && typeof sectionId !== 'string')
  )
    throw invalidRoutineInput()
  const selectedChoice = modelChoice(
    env,
    choice(field('choice', previous?.choice)),
  )
  await requireRoutineRepository(env.DB, orgId, repositoryId)
  const section = await routineSection(env.DB, orgId, sectionId)
  if (!section) throw sectionNotFound()
  const now = dependencies.now()
  const schedule = routineSchedule(
    field(
      'triggers',
      previous ? routineTriggerInputs(previous.triggers) : undefined,
    ),
    field('timeZone', previous?.timeZone),
    active,
    now,
  )
  const triggers = await resolveRoutineAuthors(
    env,
    user.id,
    schedule.triggers,
    dependencies,
  )
  const inactiveReason: RoutineInactiveReason | null =
    active || previous?.active ? null : (previous?.inactiveReason ?? null)
  return {
    id: previous?.id ?? dependencies.randomToken(),
    orgId,
    owner: previous?.owner ?? user,
    movedFrom: previous?.movedFrom ?? null,
    name: name.trim() || 'Untitled routine',
    repositoryId,
    sectionId: section,
    prompt,
    choice: selectedChoice,
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

export async function requireRoutineRepository(
  db: D1Database,
  orgId: string,
  repositoryId: string,
): Promise<void> {
  if (!(await routineRepository(db, orgId, repositoryId)))
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
