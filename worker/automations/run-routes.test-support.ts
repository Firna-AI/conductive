import {
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_SECTION,
} from '../chat/integration/outer-seed.test-support'
import type { OuterRuntime } from '../chat/integration/outer-runtime.test-support'
import { saveGitHubTokens } from '../security/github-tokens'
import { isRecord } from '../http'
import { seedAutomation, seedAutomationRun } from '../test-support/d1-seeds'

export async function readRunPage(response: { json(): Promise<unknown> }) {
  const body = await response.json()
  if (
    !isRecord(body) ||
    !Array.isArray(body.runs) ||
    (body.nextCursor !== null && typeof body.nextCursor !== 'string')
  )
    throw new Error('Invalid runs reply')
  const runs = body.runs.map((run: unknown) => {
    if (!isRecord(run) || typeof run.id !== 'string')
      throw new Error('Invalid run')
    return { ...run, id: run.id }
  })
  return { runs, nextCursor: body.nextCursor }
}

export async function seedOuterAutomation(fixture: OuterRuntime) {
  const now = Date.now()
  await seedAutomation(fixture.env.DB, {
    id: 'outer-automation',
    orgId: OUTER_ORG,
    ownerUserId: 'owner',
    name: 'Morning summary',
    repositoryId: OUTER_REPOSITORY,
    sectionId: OUTER_SECTION,
    prompt: 'Summarize the work.',
    agent: 'claude',
    model: 'test-claude',
    effort: 'high',
    active: 0,
    timeZone: 'UTC',
    triggersJson: '[]',
    createdAt: now,
    updatedAt: now,
  }).run()
  await saveGitHubTokens(
    fixture.env,
    'owner',
    {
      accessToken: 'outer-github-access',
      expiresAt: null,
      refreshToken: null,
      refreshExpiresAt: null,
    },
    now,
  )
}

export async function seedOuterRun(
  fixture: OuterRuntime,
  id: string,
  options: {
    state?: string
    workspaceId?: string
    code?: string
    message?: string
    at?: number
  } = {},
) {
  await seedAutomationRun(fixture.env.DB, {
    id,
    automationId: 'outer-automation',
    orgId: OUTER_ORG,
    ownerUserId: 'owner',
    runKey: `manual:outer-automation:${id}`,
    messageId: `message-${id}`,
    triggerJson: '{"kind":"run-now"}',
    state: options.state ?? 'queued',
    workspaceId: options.workspaceId ?? null,
    errorCode: options.code ?? null,
    errorMessage: options.message ?? null,
    createdAt: options.at ?? 1,
    updatedAt: options.at ?? 1,
  }).run()
}
