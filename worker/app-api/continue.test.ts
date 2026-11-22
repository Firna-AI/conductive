import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import {
  workspacePaths,
  type ContinueWorkspaceResponse,
} from '../../src/shared/workspaces'
import type { FeatureResult } from '../features/result'
import { errorResponse } from '../http'
import * as outputSecrets from '../lifecycle/output-secrets'
import { orgEnvironmentContext } from '../lifecycle/settings-data'
import { encrypt } from '../security/crypto'
import type { RequestContext } from '../security/gate'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from '../chat/harness.test-support'
import { continueRoute } from './continue'

const remote = vi.hoisted(() => ({
  start: vi.fn<() => Promise<FeatureResult<ContinueWorkspaceResponse>>>(),
  read: vi.fn<() => Promise<FeatureResult<ContinueWorkspaceResponse>>>(),
}))
vi.mock('./workspace-state', () => ({
  workspaceBinding: () => ({
    getByName: () => ({
      continueWorkspace: remote.start,
      readWorkspaceContinue: remote.read,
    }),
  }),
}))

const context: RequestContext = {
  user: {
    id: 'member',
    githubId: 8,
    githubLogin: 'teammate',
    displayName: null,
    avatarUrl: null,
  },
  sessionId: 'session',
  org: { id: 'org', name: 'Example org', role: 'member' },
  body: { expectedBranch: 'old/fixture-secret', allowLocalWork: true },
}
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(outputSecrets, 'runningOutputSecrets').mockResolvedValue([
    'fixture-secret',
  ])
})
afterEach(() => vi.restoreAllMocks())
afterAll(async () => {
  await harness.dispose()
})
const path = workspacePaths.continue('org', 'workspace')
const route = async (method: 'POST' | 'GET', continueId?: string) => {
  const env = harness.env
  const request = new Request(
    `${env.APP_ORIGIN}${continueId ? workspacePaths.continueResult('org', 'workspace', continueId) : path}`,
    { method },
  )
  try {
    const response = await continueRoute(request, env, context)
    if (!response) throw new Error('Expected Continue route.')
    return response
  } catch (error) {
    return errorResponse(error, request)
  }
}

it('adds separate masked labels to POST and GET questions while preserving raw request and reply identities', async () => {
  const stored = {
    state: 'confirmation-required',
    branch: 'old/fixture-secret',
    baseBranch: 'latest/fixture-secret',
    localWork: {
      uncommittedFiles: ['src/fixture-secret.ts', 'src/visible.ts'],
      unpushedCommits: 3,
    },
  } satisfies ContinueWorkspaceResponse
  remote.start.mockResolvedValue({ ok: true, value: stored })
  remote.read.mockResolvedValue({ ok: true, value: stored })
  const expected = {
    ...stored,
    displayBaseBranch: 'latest/[redacted]',
    localWork: {
      ...stored.localWork,
      displayUncommittedFiles: ['src/[redacted].ts', 'src/visible.ts'],
    },
  }
  const posted = await route('POST')
  expect(posted.status).toBe(200)
  expect.soft(await posted.json()).toEqual(expected)
  expect(remote.start).toHaveBeenCalledWith(
    'org',
    'workspace',
    context.user,
    { expectedBranch: 'old/fixture-secret', allowLocalWork: true },
    harness.env.APP_ORIGIN,
  )
  const read = await route('GET', 'job')
  expect(read.status).toBe(200)
  expect.soft(await read.json()).toEqual(expected)
  expect(stored).toEqual({
    state: 'confirmation-required',
    branch: 'old/fixture-secret',
    baseBranch: 'latest/fixture-secret',
    localWork: {
      uncommittedFiles: ['src/fixture-secret.ts', 'src/visible.ts'],
      unpushedCommits: 3,
    },
  })
  const plain = {
    ...stored,
    baseBranch: 'main',
    localWork: { uncommittedFiles: ['src/visible.ts'], unpushedCommits: 0 },
  }
  remote.read.mockResolvedValue({ ok: true, value: plain })
  expect(await (await route('GET', 'plain')).json()).toEqual(plain)
})

it('masks POST and stopped-job GET errors at the outer route without changing the stored stop copy', async () => {
  const stored = {
    status: 409,
    code: 'workspace_continue_failed',
    message:
      'Continue stopped: the changed files clash with the latest target/fixture-secret. The workspace stays on old/fixture-secret.',
  }
  remote.start.mockResolvedValue({ ok: false, error: stored })
  remote.read.mockResolvedValue({ ok: false, error: stored })
  for (const method of ['POST', 'GET'] as const) {
    const response = await route(
      method,
      method === 'GET' ? 'stopped-job' : undefined,
    )
    expect(response.status).toBe(409)
    expect.soft(await response.json()).toEqual({
      error: {
        code: 'workspace_continue_failed',
        message:
          'Continue stopped: the changed files clash with the latest target/[redacted]. The workspace stays on old/[redacted].',
      },
    })
  }
  expect(stored.message).toBe(
    'Continue stopped: the changed files clash with the latest target/fixture-secret. The workspace stays on old/fixture-secret.',
  )
})

it('preserves denied Continue outcomes before reading a missing or another org workspace captured environment', async () => {
  vi.restoreAllMocks()
  const f = await createChatFixture(harness)
  const ciphertext = await encrypt(
    JSON.stringify({ DUMMY: 'fixture-secret' }),
    orgEnvironmentContext(f.org.id),
    f.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await f.env.DB.prepare(
    `INSERT INTO workspace_runtime
     (workspace_id, org_id, created_by_user_id, session_id, first_turn_id,
      environment_ciphertext, agent, model, effort, first_message_id)
     VALUES (?, ?, ?, 'unused', 'unused', ?, 'claude', 'test', 'high', 'unused')`,
  )
    .bind(WORKSPACE_ID, f.org.id, f.owner.id, ciphertext)
    .run()
  const readSecrets = vi.spyOn(outputSecrets, 'runningOutputSecrets')
  const error = {
    status: 404,
    code: 'workspace_not_found',
    message: 'The workspace is not available.',
  }
  remote.start.mockResolvedValue({ ok: false, error })
  remote.read.mockResolvedValue({ ok: false, error })
  for (const id of [WORKSPACE_ID, 'missing-workspace']) {
    for (const method of ['POST', 'GET'] as const) {
      const path =
        method === 'POST'
          ? workspacePaths.continue('other-org', id)
          : workspacePaths.continueResult('other-org', id, 'job')
      const request = new Request(`${f.env.APP_ORIGIN}${path}`, { method })
      await expect
        .soft(
          continueRoute(request, f.env, {
            ...context,
            org: { id: 'other-org', name: 'Another org', role: 'member' },
          }),
        )
        .rejects.toMatchObject(error)
    }
  }
  expect(readSecrets.mock.calls.length).toBe(0)
})
