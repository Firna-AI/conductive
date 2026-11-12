import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { createGitHubHarness, type GitHubTestHarness } from './test-harness'

let harness: GitHubTestHarness
beforeAll(async () => {
  harness = await createGitHubHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.base.dispose()
})

/** The GitHub requests and token requests of `run`. */
async function costOf(run: () => Promise<unknown>) {
  const requests = harness.api.requests.length
  const tokens = harness.tokens.length
  await run()
  return {
    requests: harness.api.requests.length - requests,
    tokens: harness.tokens.length - tokens,
  }
}

it('reads GitHub once for the banner and the checks of one load', async () => {
  const { orgId, session } = await harness.seed()
  const banner = githubPaths.banner(orgId, 'workspace-1')
  const checks = githubPaths.checks(orgId, 'workspace-1')
  const one = await costOf(() => harness.read(banner, session))

  let replies: Response[] = []
  const load = await costOf(async () => {
    replies = await Promise.all([
      harness.read(banner, session),
      harness.read(checks, session),
    ])
  })

  expect(one.requests).toBeGreaterThan(0)
  expect(load).toEqual(one)
  expect(replies.map((reply) => reply.status)).toEqual([200, 200])
  expect(await replies[0].json()).toMatchObject({
    banner: { branch: 'changes', state: 'ready-to-merge' },
  })
  expect(await replies[1].json()).toMatchObject({ state: 'available' })
})

it('keeps a read without a member apart from a tab read', async () => {
  const { orgId, session, workspace } = await harness.seed()
  const banner = githubPaths.banner(orgId, 'workspace-1')
  const one = await costOf(() => harness.read(banner, session))

  const both = await costOf(() =>
    Promise.all([
      harness.read(banner, session),
      harness.refresh(workspace, {}),
    ]),
  )

  expect(both.requests).toBe(one.requests * 2)
})

it('reads again after a shared read ends', async () => {
  const { orgId, session } = await harness.seed()
  const banner = githubPaths.banner(orgId, 'workspace-1')
  const one = await costOf(() => harness.read(banner, session))

  const again = await costOf(() => harness.read(banner, session))

  expect(again).toEqual(one)
})
