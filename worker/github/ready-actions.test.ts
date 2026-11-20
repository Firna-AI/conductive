import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { createMergeHarness } from './merge.test-support'

let fixture: Awaited<ReturnType<typeof createMergeHarness>>
beforeAll(async () => {
  fixture = await createMergeHarness()
})
beforeEach(async () => {
  await fixture.harness.reset()
  fixture.harness.api.pulls[2].isDraft = true
})
afterAll(async () => {
  await fixture.base.dispose()
})

const ready = (orgId: string, session: string, body: unknown) =>
  fixture.request(githubPaths.ready(orgId, 'workspace-1'), session, {
    method: 'POST',
    body: JSON.stringify(body),
  })

async function readyWrites(): Promise<unknown[]> {
  const writes: unknown[] = []
  for (const request of fixture.harness.api.requests) {
    const body: unknown = await request.clone().json()
    if (JSON.stringify(body).includes('mutation MarkReady')) {
      writes.push({
        authorization: request.headers.get('Authorization'),
        body,
      })
    }
  }
  return writes
}

it('marks the draft ready as the member and publishes the new state', async () => {
  const { orgId, session } = await fixture.seed()
  const response = await ready(orgId, session, { pullNumber: 2 })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ state: 'ready' })
  expect(fixture.harness.api.pulls[2].isDraft).toBe(false)
  const writes = await readyWrites()
  expect(writes).toHaveLength(1)
  expect(writes[0]).toMatchObject({
    authorization: 'Bearer github-test-token',
    body: { variables: { id: 'PR_2' } },
  })
  expect(
    (await fixture.harness.inspect('workspace-1')).published.at(-1)?.event,
  ).toMatchObject({
    type: 'github.updated',
    banner: { state: 'ready-to-merge', pullRequest: { number: 2 } },
  })
})

it('changes nothing on GitHub for a pull request that is no longer a draft', async () => {
  const { orgId, session } = await fixture.seed()
  fixture.harness.api.pulls[2].isDraft = false
  const response = await ready(orgId, session, { pullNumber: 2 })
  expect(response.status).toBe(200)
  expect(await readyWrites()).toEqual([])
  expect(
    (await fixture.harness.inspect('workspace-1')).published.at(-1)?.event,
  ).toMatchObject({ banner: { state: 'ready-to-merge' } })
})

it('refuses a member without write access before a GitHub write', async () => {
  const { orgId, session } = await fixture.seed()
  fixture.harness.api.merges.permission = 'READ'
  const response = await ready(orgId, session, { pullNumber: 2 })
  expect(response.status).toBe(403)
  expect(await response.json()).toMatchObject({
    error: { code: 'github_ready_forbidden' },
  })
  expect(await readyWrites()).toEqual([])
  expect(fixture.harness.api.pulls[2].isDraft).toBe(true)
})

it('refuses another pull request than the one that the bar showed', async () => {
  const { orgId, session } = await fixture.seed()
  const response = await ready(orgId, session, { pullNumber: 3 })
  expect(response.status).toBe(409)
  expect(await response.json()).toMatchObject({
    error: { code: 'github_pull_changed' },
  })
  expect(await readyWrites()).toEqual([])
})

it('keeps the words of a GitHub refusal on the server', async () => {
  const { orgId, session } = await fixture.seed()
  fixture.harness.api.readyRefused = true
  const response = await ready(orgId, session, { pullNumber: 2 })
  expect(response.status).toBe(409)
  const text = await response.text()
  expect(JSON.parse(text)).toMatchObject({
    error: { code: 'github_ready_refused' },
  })
  expect(text).not.toContain('GitHub detail')
  expect((await fixture.harness.inspect('workspace-1')).published).toEqual([])
})

it('refuses a request without a pull request number', async () => {
  const { orgId, session } = await fixture.seed()
  for (const body of [{}, { pullNumber: '2' }, { pullNumber: 0 }]) {
    const response = await ready(orgId, session, body)
    expect(response.status, JSON.stringify(body)).toBe(400)
  }
  expect(fixture.harness.api.requests).toEqual([])
})
