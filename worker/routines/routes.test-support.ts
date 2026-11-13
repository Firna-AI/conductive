import type { User } from '../../src/shared/api'
import {
  routinePath,
  routinesPath,
  type CreateRoutineRequest,
  type RoutineResponse,
} from '../../src/shared/routines'
import {
  memberFixture,
  membersClient,
  write,
} from '../members/members-test-support'
import { TEST_TIME, type TestHarness } from '../test-support/harness'

export async function routineFixture(harness: TestHarness) {
  const people = await memberFixture(harness)
  const { org, member } = people
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      `INSERT INTO sections (id, org_id, name, position, is_default, created_at)
      VALUES ('general-members-org', ?, 'General', 0, 1, ?)`,
    ).bind(org.id, TEST_TIME),
    harness.env.DB.prepare(
      `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, selected, installation_id)
      VALUES ('routine-repository', ?, 101, 'example/routines', 'main', 1, 91)`,
    ).bind(org.id),
  ])
  const input: CreateRoutineRequest = {
    name: 'Morning summary',
    repositoryId: 'routine-repository',
    sectionId: 'general-members-org',
    prompt: 'Summarize the work.',
    choice: {
      agent: 'codex',
      model: 'test-model',
      effort: 'medium',
      fast: false,
    },
    active: true,
    timeZone: 'Europe/London',
    triggers: [{ kind: 'daily', time: { hour: 9, minute: 0 } }],
  }
  const seed = async (id = 'routine-one', owner: User = member.user) => {
    await harness.env.DB.prepare(
      `INSERT INTO routines
      (id, org_id, owner_user_id, name, repository_id, section_id, prompt, agent, model, effort,
       time_zone, triggers_json, next_run_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        org.id,
        owner.id,
        input.name,
        input.repositoryId,
        input.sectionId,
        input.prompt,
        input.choice.agent,
        input.choice.model,
        input.choice.effort,
        input.timeZone,
        JSON.stringify([
          { kind: 'daily', time: { hour: 9, minute: 0 }, cron: '0 9 * * *' },
        ]),
        TEST_TIME + 60_000,
        TEST_TIME,
        TEST_TIME,
      )
      .run()
    return routinePath(org.id, id)
  }
  const create = async (overrides: Partial<CreateRoutineRequest> = {}) => {
    const response = await harness.request(
      routinesPath(org.id),
      member.session,
      write({ ...input, ...overrides }),
    )
    if (response.status !== 201)
      throw new Error(
        `Routine create: ${response.status}: ${await response.text()}`,
      )
    const result: RoutineResponse = await response.json()
    return result.routine
  }
  return { ...people, input, seed, create, members: membersClient(harness) }
}
