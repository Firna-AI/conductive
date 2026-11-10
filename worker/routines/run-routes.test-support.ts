import {
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_SECTION,
} from '../chat/integration/outer-seed.test-support'
import type { OuterRuntime } from '../chat/integration/outer-runtime.test-support'
import { saveGitHubTokens } from '../security/github-tokens'
import { isRecord } from '../http'

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

export async function seedOuterRoutine(fixture: OuterRuntime) {
  const now = Date.now()
  await fixture.env.DB.prepare(
    `INSERT INTO routines
    (id, org_id, owner_user_id, name, repository_id, section_id, prompt, agent, model, effort,
     active, time_zone, triggers_json, created_at, updated_at)
    VALUES ('outer-routine', ?, 'owner', 'Morning summary', ?, ?, 'Summarize the work.',
      'claude', 'test-claude', 'high', 0, 'UTC', '[]', ?, ?)`,
  )
    .bind(OUTER_ORG, OUTER_REPOSITORY, OUTER_SECTION, now, now)
    .run()
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
  await fixture.env.DB.prepare(
    `INSERT INTO routine_runs
    (id, routine_id, org_id, owner_user_id, run_key, message_id, trigger_json, state, workspace_id,
     error_code, error_message, created_at, updated_at)
    VALUES (?, 'outer-routine', ?, 'owner', ?, ?, '{"kind":"run-now"}', ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      OUTER_ORG,
      `manual:outer-routine:${id}`,
      `message-${id}`,
      options.state ?? 'queued',
      options.workspaceId ?? null,
      options.code ?? null,
      options.message ?? null,
      options.at ?? 1,
      options.at ?? 1,
    )
    .run()
}
