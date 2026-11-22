import type { User } from '../../src/shared/api'
import {
  automationPath,
  automationsPath,
  type CreateAutomationRequest,
  type AutomationResponse,
} from '../../src/shared/automations'
import {
  memberFixture,
  membersClient,
  write,
} from '../members/members-test-support'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { seedAutomation } from '../test-support/d1-seeds'

export async function automationFixture(harness: TestHarness) {
  const people = await memberFixture(harness)
  const { org, member } = people
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      `INSERT INTO sections (id, org_id, name, position, is_default, created_at)
      VALUES ('general-members-org', ?, 'General', 0, 1, ?)`,
    ).bind(org.id, TEST_TIME),
    harness.env.DB.prepare(
      `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, selected, installation_id)
      VALUES ('automation-repository', ?, 101, 'example/automations', 'main', 1, 91)`,
    ).bind(org.id),
  ])
  const input: CreateAutomationRequest & {
    name: string
    sectionId: string
  } = {
    name: 'Morning summary',
    repositoryId: 'automation-repository',
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
  const seed = async (id = 'automation-one', owner: User = member.user) => {
    await seedAutomation(harness.env.DB, {
      id,
      orgId: org.id,
      ownerUserId: owner.id,
      name: input.name,
      repositoryId: input.repositoryId,
      sectionId: input.sectionId,
      prompt: input.prompt,
      agent: input.choice.agent,
      model: input.choice.model,
      effort: input.choice.effort,
      timeZone: input.timeZone,
      triggersJson: JSON.stringify([
        { kind: 'daily', time: { hour: 9, minute: 0 }, cron: '0 9 * * *' },
      ]),
      nextRunAt: TEST_TIME + 60_000,
      createdAt: TEST_TIME,
      updatedAt: TEST_TIME,
    }).run()
    return automationPath(org.id, id)
  }
  const create = async (overrides: Partial<CreateAutomationRequest> = {}) => {
    const response = await harness.request(
      automationsPath(org.id),
      member.session,
      write({ ...input, ...overrides }),
    )
    if (response.status !== 201)
      throw new Error(
        `Automation create: ${response.status}: ${await response.text()}`,
      )
    const result: AutomationResponse = await response.json()
    return result.automation
  }
  return { ...people, input, seed, create, members: membersClient(harness) }
}
