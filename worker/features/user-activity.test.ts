import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { sessionPaths, sessionsPath } from '../../src/shared/sessions'
import { workspacesPath } from '../../src/shared/workspaces'
import { CLAUDE } from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_SOFTWARE,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { featureFixture, type FeatureFixture } from './fixture.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/features/checkpoint-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
})

it('records the last active time of a new workspace and a sent message, and not of a new session', async () => {
  const active = (fixture = await featureFixture(bundle, {
    configuration: {
      CONDUCTIVE_RUNNER_ARCHIVE_URL: OUTER_SOFTWARE.url,
      CONDUCTIVE_RUNNER_ARCHIVE_SHA256: OUTER_SOFTWARE.sha256,
    },
  }))
  const lastActive = async (userId: string) => {
    const row = await active.env.DB.prepare(
      'SELECT last_active_at AS at FROM users WHERE id = ?',
    )
      .bind(userId)
      .first<{ at: number | null }>()
    return row?.at ?? null
  }
  expect(await lastActive('member')).toBeNull()
  expect(await lastActive('owner')).toBeNull()

  const created = await active.request(workspacesPath(OUTER_ORG), {
    method: 'POST',
    headers: { Cookie: active.cookies.memberCookie },
    body: JSON.stringify({
      repositoryId: OUTER_REPOSITORY,
      firstMessage: {
        id: 'activity-create-message',
        text: 'Start the work',
        choice: CLAUDE,
        attachmentIds: [],
      },
    }),
  })
  expect(created.status).toBe(201)
  await vi.waitFor(async () =>
    expect(typeof (await lastActive('member'))).toBe('number'),
  )
  expect(await lastActive('owner')).toBeNull()

  const session = await active.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: JSON.stringify({ choice: CLAUDE }) },
  )
  expect(session.status).toBe(201)
  const sessionId = string(record(record(await session.json()).session).id)
  expect(await lastActive('owner')).toBeNull()

  const sent = await active.request(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, sessionId),
    {
      method: 'POST',
      body: JSON.stringify({
        id: 'activity-message',
        text: 'Check this code',
        choice: CLAUDE,
        attachmentIds: [],
      }),
    },
  )
  expect(sent.status).toBe(202)
  await vi.waitFor(async () =>
    expect(typeof (await lastActive('owner'))).toBe('number'),
  )
})
