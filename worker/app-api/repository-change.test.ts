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
  type ChangeRepositoryResponse,
} from '../../src/shared/workspaces'
import type { FeatureResult } from '../features/result'
import { errorResponse } from '../http'
import * as outputSecrets from '../lifecycle/output-secrets'
import type { RequestContext } from '../security/gate'
import { createHarness, type TestHarness } from '../test-support/harness'
import { repositoryChangeRoute } from './repository-change'

const remote = vi.hoisted(() => ({
  start: vi.fn<() => Promise<FeatureResult<ChangeRepositoryResponse>>>(),
  read: vi.fn<() => Promise<FeatureResult<ChangeRepositoryResponse>>>(),
}))
vi.mock('./workspace-state', () => ({
  workspaceBinding: () => ({
    getByName: () => ({
      changeWorkspaceRepository: remote.start,
      readWorkspaceRepositoryChange: remote.read,
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
  body: {
    expectedRepositoryId: 'repo',
    expectedBranch: 'old/fixture-secret',
    repositoryId: 'billing',
    allowWork: true,
  },
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
const route = async (method: 'POST' | 'GET', changeId?: string) => {
  const env = harness.env
  const path = changeId
    ? workspacePaths.repositoryResult('org', 'workspace', changeId)
    : workspacePaths.repository('org', 'workspace')
  const request = new Request(`${env.APP_ORIGIN}${path}`, { method })
  try {
    const response = await repositoryChangeRoute(request, env, context)
    if (!response) throw new Error('Expected repository change route.')
    return response
  } catch (error) {
    return errorResponse(error, request)
  }
}

it('labels both folders in POST and polled repository questions while keeping raw requests and stored paths', async () => {
  const stored = {
    state: 'confirmation-required',
    repository: { id: 'billing', fullName: 'example/billing' },
    branch: 'old/fixture-secret',
    baseBranch: 'latest/fixture-secret',
    work: {
      localWork: {
        uncommittedFiles: ['src/fixture-secret.ts', 'src/visible.ts'],
        unpushedCommits: 3,
      },
      pullRequest: null,
      pushedCommits: 2,
      carriedFiles: ['notes/fixture-secret.md', 'notes/visible.md'],
    },
  } satisfies ChangeRepositoryResponse
  const before = structuredClone(stored)
  remote.start.mockResolvedValue({ ok: true, value: stored })
  remote.read.mockResolvedValue({ ok: true, value: stored })
  const expected = {
    ...stored,
    work: {
      ...stored.work,
      localWork: {
        ...stored.work.localWork,
        displayUncommittedFiles: ['src/[redacted].ts', 'src/visible.ts'],
      },
      displayCarriedFiles: ['notes/[redacted].md', 'notes/visible.md'],
    },
  }
  for (const method of ['POST', 'GET'] as const) {
    const response = await route(method, method === 'GET' ? 'job' : undefined)
    expect(response.status).toBe(200)
    expect.soft(await response.json()).toEqual(expected)
  }
  expect(remote.start).toHaveBeenCalledWith(
    'org',
    'workspace',
    context.user,
    {
      expectedRepositoryId: 'repo',
      expectedBranch: 'old/fixture-secret',
      repositoryId: 'billing',
      allowWork: true,
    },
    harness.env.APP_ORIGIN,
  )
  expect(stored).toEqual(before)
  const plain = {
    ...stored,
    work: {
      ...stored.work,
      localWork: { uncommittedFiles: ['visible.ts'], unpushedCommits: 0 },
      carriedFiles: ['visible.md'],
    },
  }
  remote.read.mockResolvedValue({ ok: true, value: plain })
  expect(await (await route('GET', 'plain')).json()).toEqual(plain)
  const earlier = {
    ...stored,
    work: {
      ...stored.work,
      localWork: {
        ...stored.work.localWork,
        uncommittedFiles: ['src/earlier-secret-fixture-secret.ts'],
        displayUncommittedFiles: ['src/[redacted]-fixture-secret.ts'],
      },
      carriedFiles: ['notes/earlier-secret-fixture-secret.md'],
      displayCarriedFiles: ['notes/[redacted]-fixture-secret.md'],
    },
  }
  remote.read.mockResolvedValue({ ok: true, value: earlier })
  expect(await (await route('GET', 'earlier-labels')).json()).toEqual({
    ...earlier,
    work: {
      ...earlier.work,
      localWork: {
        ...earlier.work.localWork,
        displayUncommittedFiles: ['src/[redacted]-[redacted].ts'],
      },
      displayCarriedFiles: ['notes/[redacted]-[redacted].md'],
    },
  })
})

it('masks recognized POST and polled repository failures without changing the stored message or its words', async () => {
  const stored = {
    status: 409,
    code: 'workspace_repository_change_failed',
    message:
      'The latest target/fixture-secret of example/billing could not be fetched. Check your GitHub access, then try again.',
  }
  remote.start.mockResolvedValue({ ok: false, error: stored })
  remote.read.mockResolvedValue({ ok: false, error: stored })
  for (const method of ['POST', 'GET'] as const) {
    const response = await route(
      method,
      method === 'GET' ? 'failed' : undefined,
    )
    expect(response.status).toBe(409)
    expect.soft(await response.json()).toEqual({
      error: {
        code: 'workspace_repository_change_failed',
        message:
          'The latest target/[redacted] of example/billing could not be fetched. Check your GitHub access, then try again.',
      },
    })
  }
  expect(stored.message).toBe(
    'The latest target/fixture-secret of example/billing could not be fetched. Check your GitHub access, then try again.',
  )
})

it('keeps denied and unrelated repository outcomes ahead of every secret read', async () => {
  const readSecrets = vi.mocked(outputSecrets.runningOutputSecrets)
  const denied = {
    status: 404,
    code: 'workspace_not_found',
    message: 'The workspace is not available.',
  }
  remote.start.mockResolvedValue({ ok: false, error: denied })
  remote.read.mockResolvedValue({ ok: false, error: denied })
  for (const method of ['POST', 'GET'] as const) {
    const response = await route(
      method,
      method === 'GET' ? 'denied' : undefined,
    )
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: { code: denied.code, message: denied.message },
    })
  }
  remote.start.mockResolvedValue({
    ok: true,
    value: { state: 'pending', changeId: 'pending' },
  })
  expect((await route('POST')).status).toBe(202)
  const request = new Request(`${harness.env.APP_ORIGIN}/api/unrelated`)
  expect(await repositoryChangeRoute(request, harness.env, context)).toBe(null)
  expect(readSecrets.mock.calls).toEqual([])
})
