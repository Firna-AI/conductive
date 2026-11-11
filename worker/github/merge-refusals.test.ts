import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { record, string } from '../chat/inputs'
import { TEST_TIME } from '../test-support/harness'
import { HEAD_SHA } from './fake-pull'
import { createMergeHarness } from './merge.test-support'

let fixture: Awaited<ReturnType<typeof createMergeHarness>>
beforeAll(async () => {
  fixture = await createMergeHarness()
})
beforeEach(async () => {
  await fixture.harness.reset()
  fixture.jobs.clear()
})
afterAll(async () => {
  await fixture.base.dispose()
})
const input = { headSha: HEAD_SHA, method: 'squash' } as const

it('maps a missing right and a disabled method without a merge write', async () => {
  const { orgId, session } = await fixture.seed()
  fixture.harness.api.merges.permission = 'READ'
  const denied = await fixture.start(orgId, session, input)
  expect(denied.status).toBe(403)
  expect(await denied.json()).toMatchObject({
    error: { code: 'github_merge_forbidden' },
  })
  fixture.harness.api.merges.permission = 'WRITE'
  fixture.harness.api.merges.allowedMethods = ['merge']
  const method = await fixture.start(orgId, session, input)
  expect(method.status).toBe(409)
  expect(await method.json()).toMatchObject({
    error: { code: 'github_merge_refused' },
  })
  expect(
    fixture.harness.api.requests.some((request) => request.method === 'PUT'),
  ).toBe(false)
})

it('follows a compatible existing request and refuses queue or bypass requests', async () => {
  const { orgId, session } = await fixture.seed()
  const first = await fixture.start(orgId, session, input)
  expect(first.status).toBe(202)
  expect((await fixture.start(orgId, session, input)).status).toBe(202)
  expect(fixture.harness.api.merges.jobs.size).toBe(1)
  for (const patch of [
    { merge_action: 'merge_queue' },
    { bypass_rules: true },
    { expected_head_sha: 'another-head' },
    { merge_method: 'rebase' },
  ]) {
    fixture.harness.api.merges.startResponse = Response.json(
      {
        status: 'pending',
        details: {
          message: 'private upstream detail',
          uuid: 'other-job',
          merge_method: 'squash',
          merge_action: 'direct_merge',
          expected_head_sha: HEAD_SHA,
          ...patch,
        },
      },
      { status: 409 },
    )
    const response = await fixture.start(orgId, session, input)
    expect(response.status, JSON.stringify(patch)).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: 'github_merge_refused',
        message: 'GitHub refused the merge.',
      },
    })
  }
})

it('maps failed, expired, and enqueued results without exposing upstream text', async () => {
  const { orgId, session } = await fixture.seed()
  const start = await fixture.start(orgId, session, input)
  expect(start.status).toBe(202)
  const mergeId = string(record(await start.json()).mergeId)
  const path = githubPaths.mergeResult(orgId, 'workspace-1', mergeId)
  for (const state of ['failed', 'enqueued']) {
    fixture.harness.api.merges.resultResponse = Response.json({
      status: state,
      details: { message: 'github-test-token private detail' },
    })
    const response = await fixture.request(path, session)
    expect(response.status, state).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: 'github_merge_refused',
        message: 'GitHub refused the merge.',
      },
    })
  }
  fixture.harness.api.pulls[2].headRefOid = 'new-head'
  fixture.harness.api.branches.set('refs/heads/changes', 'new-head')
  expect(await (await fixture.request(path, session)).json()).toMatchObject({
    error: { code: 'github_head_changed' },
  })
  fixture.harness.api.merges.permission = 'READ'
  expect(await (await fixture.request(path, session)).json()).toMatchObject({
    error: { code: 'github_merge_forbidden' },
  })
  fixture.harness.api.merges.resultResponse = Response.json({}, { status: 404 })
  expect(await (await fixture.request(path, session)).json()).toMatchObject({
    error: { code: 'github_merge_unavailable' },
  })
  expect(fixture.harness.states.size).toBe(0)
})

it('returns an immediate merged result and refreshes shared state', async () => {
  const { orgId, session } = await fixture.seed()
  fixture.harness.api.pulls[2].state = 'MERGED'
  fixture.harness.api.pulls[2].mergedAt = '2026-11-09T22:00:00Z'
  const response = await fixture.start(orgId, session, input)
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ state: 'merged' })
  expect(
    fixture.harness.memory('workspace-1').published.at(-1)?.event,
  ).toMatchObject({ type: 'github.updated', banner: { state: 'merged' } })
})

it('publishes the merge that GitHub reported when the read after it fails, then reads again', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const { orgId, session } = await fixture.seed()
  const { api } = fixture.harness
  const shown = await fixture.harness.read(
    githubPaths.banner(orgId, 'workspace-1'),
    session,
  )
  expect(await shown.json()).toMatchObject({
    banner: { state: 'ready-to-merge' },
  })
  api.pulls[2].state = 'MERGED'
  api.pulls[2].mergedAt = '2026-11-09T22:00:00Z'
  // GitHub takes the merge, then refuses each later read, as at a rate limit.
  api.onRequest = async (operation) => {
    if (operation === 'MergeStart')
      api.failure = Response.json(
        { message: 'API rate limit exceeded' },
        { status: 403 },
      )
  }
  const response = await fixture.start(orgId, session, input)
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ state: 'merged' })
  const memory = fixture.harness.memory('workspace-1')
  expect(memory.published.map((envelope) => envelope.event)).toMatchObject([
    { banner: { state: 'ready-to-merge' } },
    {
      type: 'github.updated',
      banner: {
        state: 'merged',
        pullRequest: { headSha: HEAD_SHA },
        mergedAt: TEST_TIME,
      },
    },
  ])
  expect(warn).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'github_merge_refresh_failed' }),
  )
  api.failure = null
  await fixture.harness.runScheduled('workspace-1')
  expect(memory.published.at(-1)?.event).toMatchObject({
    type: 'github.updated',
    banner: { state: 'merged', mergedAt: Date.parse('2026-11-09T22:00:00Z') },
  })
  warn.mockRestore()
})
