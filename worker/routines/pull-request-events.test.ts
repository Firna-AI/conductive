import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { pullRequestFixture } from './pull-request.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('stores all three signed events before starting their work in the background', async () => {
  const h = await pullRequestFixture(harness)
  for (const [index, action] of ['opened', 'synchronize', 'closed'].entries()) {
    const payload = h.payload(action)
    payload.number = index + 2
    payload.pull_request.number = index + 2
    payload.pull_request.html_url = `https://github.com/example/repository/pull/${index + 2}`
    expect((await h.request(payload, action)).status).toBe(204)
    expect(h.boat.starts).toEqual([])
  }
  const rows = (await h.rows()).results
  expect(rows.map((row) => row.state)).toEqual(['queued', 'queued', 'queued'])
  expect(rows.map((row) => JSON.parse(row.triggerJson))).toEqual(
    ['opened', 'pushed', 'merged'].map((event, index) => ({
      kind: 'pull-request',
      event,
      number: index + 2,
      url: `https://github.com/example/repository/pull/${index + 2}`,
      headBranch: 'changes',
      headSha: 'ec26c3e57ca3a959ca5aad62de7213c562f8c821',
      baseBranch: 'release/next',
    })),
  )
  expect(rows.map((row) => row.runKey)).toEqual(
    ['opened', 'synchronize', 'closed'].map((id) => `github:routine-one:${id}`),
  )
  expect(h.background).toHaveLength(3)
  await h.run(() => Promise.all(h.background.map((start) => start())))
  expect((await h.rows()).results.map((row) => row.state)).toEqual([
    'started',
    'started',
    'started',
  ])
  expect(h.acceptFirstMessage).toHaveBeenCalledTimes(3)
  expect((await h.request(h.payload(), 'opened')).status).toBe(204)
  expect((await h.rows()).results).toHaveLength(3)
})

it('ignores unrelated actions, forks, repositories, installations, and off routines', async () => {
  const h = await pullRequestFixture(harness)
  const fork = h.payload()
  fork.pull_request.head.repo.id = 999
  const closed = h.payload('closed')
  closed.pull_request.merged = false
  const values = [
    h.payload('edited'),
    fork,
    closed,
    { ...h.payload(), repository: { id: 999 } },
    { ...h.payload(), installation: { id: 999 } },
  ]
  for (const [i, payload] of values.entries())
    expect((await h.request(payload, `ignored-${i}`)).status).toBe(204)
  await h.db.prepare('UPDATE routines SET active = 0').run()
  expect((await h.request(h.payload(), 'off')).status).toBe(204)
  expect((await h.rows()).results).toEqual([])
  expect(h.background).toEqual([])
})

it('isolates routine storage and banner refresh failures and keeps deliveries retryable', async () => {
  const h = await pullRequestFixture(harness)
  await h.db
    .prepare(
      `INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch, created_at, updated_at)
    VALUES ('banner-workspace', ?, ?, ?, 'Banner', 'changes', 0, 0)`,
    )
    .bind(h.org.id, h.repositoryId, h.user.id)
    .run()
  const refresh = vi.fn(async () => {
    throw new Error('Injected banner failure')
  })
  expect((await h.request(h.payload(), 'banner-failed', refresh)).status).toBe(
    500,
  )
  expect((await h.rows()).results.map((row) => row.state)).toEqual(['queued'])
  expect(h.background).toHaveLength(1)
  const goodRefresh = vi.fn(async () => null)
  expect(
    (await h.request(h.payload(), 'dispatch-failed', goodRefresh, true)).status,
  ).toBe(500)
  expect(goodRefresh).toHaveBeenCalledTimes(1)
  expect(
    await h.db
      .prepare(
        'SELECT processed_at FROM github_webhook_deliveries WHERE delivery_id = ?',
      )
      .bind('dispatch-failed')
      .first('processed_at'),
  ).toBe(null)
  const nextPull = h.payload()
  nextPull.number = 3
  nextPull.pull_request.number = 3
  expect(
    (await h.request(nextPull, 'dispatch-failed', goodRefresh)).status,
  ).toBe(204)
  expect((await h.rows()).results).toHaveLength(2)
})
