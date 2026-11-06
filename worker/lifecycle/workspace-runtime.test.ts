import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { FIRST_MESSAGE } from './durable-test-support'
import { realRuntimeFixture, runtimeBundle } from './real-runtime-test-support'
import { registerCreationAttempt } from './creation-attempt-data'
import type { WorkspaceStartJob } from './start-types'

let bundle: string
let fixture: Awaited<ReturnType<typeof realRuntimeFixture>>
beforeAll(async () => {
  bundle = await runtimeBundle()
})
beforeEach(async () => {
  fixture = await realRuntimeFixture(bundle)
})
afterEach(async () => {
  await fixture.dispose()
})

it('refuses credentialed redirects in the actual Worker runtime', async () => {
  fixture.refuseRedirects()
  const bodies: unknown[] = []
  for (const path of [
    '/boat',
    '/signin',
    '/refresh',
    '/source',
    '/installation',
  ])
    bodies.push(await (await fixture.fetch(path)).json())
  expect(bodies).toEqual([
    { error: 'unavailable', status: 302 },
    { error: 'github_sign_in_failed', status: 502 },
    { error: 'github_refresh_failed', status: 502 },
    { error: 'source_refused' },
    { error: 'installation_refused' },
  ])
  expect(fixture.requests).toEqual([
    'https://boat.dev/api/v1/sandboxes/bx_one',
    'https://github.com/login/oauth/access_token',
    'https://github.com/login/oauth/access_token',
    'https://github.com/example/source.git/info/refs?service=git-upload-pack',
    'https://api.github.com/app/installations/91/access_tokens',
  ])
})

it('runs the production Workspace across caller loss, a full runtime restart, and idle stop', async () => {
  const id = 'runtime-workspace'
  const user = {
    id: 'runtime-user',
    githubId: 11,
    githubLogin: 'octocat',
    displayName: null,
    avatarUrl: null,
  }
  const job: WorkspaceStartJob = {
    workspaceId: id,
    orgId: 'runtime-org',
    kind: 'create',
    imageName: 'base-runtime-image',
    startupScript: '',
    environmentCiphertext: null,
    defaultBranch: 'main',
    turnId: 'runtime-turn',
    attempt: 'runtime-attempt',
    phase: 'records',
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
    creation: {
      user,
      sender: user,
      repositoryId: 'runtime-repo',
      city: 'lisbon',
      branch: 'octocat/lisbon-7k2q',
      sessionId: 'runtime-session',
      request: FIRST_MESSAGE,
      createdAt: Date.now(),
    },
  }
  await registerCreationAttempt(fixture.env.DB, {
    id,
    orgId: job.orgId,
    senderUserId: user.id,
    messageId: FIRST_MESSAGE.id,
    now: Date.now(),
  })
  fixture.boat.commandOutput = 'part'
  fixture.boat.commandRunning = true
  const caller = fixture.actor(id)
  expect(await caller.queueLifecycleStart(job)).toBe(true)
  const abandoned = caller.waitCreationLifecycle().catch(() => undefined)
  for (let step = 0; step < 12; step++) {
    const checkpoint = await caller.checkpoint()
    if (checkpoint?.phase === 'fetch' && checkpoint.stdoutOffset === 4) break
    await caller.tick()
  }
  expect(await caller.checkpoint()).toMatchObject({
    phase: 'fetch',
    processId: 1,
    stdoutOffset: 4,
    stderrOffset: 0,
  })
  const statusCount = fixture.boat.statusRequests.length
  await fixture.restart()
  await abandoned
  fixture.boat.commandOutput = 'part-restored'
  fixture.boat.commandRunning = false
  const restored = fixture.actor(id)
  for (let step = 0; step < 15 && (await restored.checkpoint()); step++)
    await restored.tick()
  expect(await restored.checkpoint()).toBeUndefined()
  expect(await restored.waitCreationLifecycle()).toEqual({ ok: true })
  expect(fixture.boat.statusRequests[statusCount]).toEqual({
    processId: 1,
    stdoutOffset: 4,
    stderrOffset: 0,
  })
  expect(fixture.boat.starts).toHaveLength(1)
  expect(fixture.boat.commands).toHaveLength(3)
  expect(await restored.readLifecycle()).toMatchObject({
    startupPrepared: true,
    pendingFirstMessage: FIRST_MESSAGE,
  })
  await restored.tick()
  const before = await restored.history()
  expect(
    before.events.some(
      ({ event }) =>
        event.type === 'start.updated' &&
        event.start.steps.some(
          (step) => step.id === 'fetch' && step.state === 'completed',
        ),
    ),
  ).toBe(true)
  await restored.becomeIdle()
  expect(await restored.readLifecycle()).toMatchObject({
    state: 'stopped',
    pendingFirstMessage: FIRST_MESSAGE,
  })
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  expect(fixture.boat.deletedIds).toEqual([])
  const after = await restored.history()
  expect(after.events.slice(0, before.events.length)).toEqual(before.events)
  expect(after.throughEventNumber).toBe(before.throughEventNumber + 2)
}, 20_000)
