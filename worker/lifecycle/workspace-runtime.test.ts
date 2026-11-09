import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { FIRST_MESSAGE } from './durable-test-support'
import { realRuntimeFixture, runtimeBundle } from './real-runtime-test-support'
import { claimCreation } from './creation-claims'
import type { WorkspaceStartJob } from './start-types'
import { readSavedScript } from './saved-script'
import { serializeStartJob } from './start-job-codec'
import { IDLE_MS } from './durable-types'
import {
  hasStartStep,
  liveEvents,
  publicHistory,
} from './runtime-events-test-support'

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
  for (const path of ['/boat', '/signin', '/refresh', '/installation'])
    bodies.push(await (await fixture.fetch(path)).json())
  expect(bodies).toEqual([
    { error: 'unavailable', status: 302 },
    { error: 'github_sign_in_failed', status: 502 },
    { error: 'github_refresh_failed', status: 502 },
    { error: 'installation_refused' },
  ])
  expect(fixture.requests).toEqual([
    'https://boat.dev/api/v1/sandboxes/bx_one',
    'https://github.com/login/oauth/access_token',
    'https://github.com/login/oauth/access_token',
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
    providerAccount: 'boat',
    workspaceId: id,
    orgId: 'runtime-org',
    kind: 'create',
    imageName: 'base-runtime-image',
    startupScript: readSavedScript(''),
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
  await claimCreation(
    fixture.env.DB,
    {
      orgId: job.orgId,
      senderUserId: user.id,
      messageId: FIRST_MESSAGE.id,
    },
    job,
  )
  fixture.boat.commandOutput = 'part'
  fixture.boat.commandRunning = true
  const caller = fixture.actor(id)
  expect(await caller.queueLifecycleStart(serializeStartJob(job))).toBe(true)
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
  const [browser] = await Promise.all([
    fixture.openEvents(id),
    caller.lifecycleStep('during', 'During connection', 'completed'),
  ])
  expect(browser.response.status).toBe(101)
  const opening = await publicHistory(browser.inbox)
  expect(
    opening.events.some((event) => hasStartStep(event, 'fetch', 'running')),
  ).toBe(true)
  await caller.lifecycleStep('last', 'After connection', 'completed')
  const captured = await fixture.openEvents(id)
  const beforeRestart = await publicHistory(captured.inbox)
  const openingLive = await liveEvents(
    browser.inbox,
    opening.throughEventNumber,
    beforeRestart.throughEventNumber,
  )
  expect([...opening.events, ...openingLive]).toEqual(beforeRestart.events)
  expect(
    beforeRestart.events.slice(0, 3).map((event) => event.eventNumber),
  ).toEqual([1, 2, 3])
  expect(beforeRestart.events.map((event) => event.eventNumber)).toEqual(
    Array.from(
      { length: beforeRestart.throughEventNumber },
      (_, index) => index + 1,
    ),
  )
  const statusCount = fixture.boat.statusRequests.length
  await fixture.restart()
  await abandoned
  const resumedBrowser = await fixture.openEvents(id)
  const resumedHistory = await publicHistory(resumedBrowser.inbox)
  expect(resumedHistory).toEqual(beforeRestart)
  fixture.boat.commandOutput = 'part-restored'
  fixture.boat.commandRunning = false
  const restored = fixture.actor(id)
  for (let step = 0; step < 15 && (await restored.checkpoint()); step++) {
    if ((await restored.checkpoint())?.phase === 'runner')
      await restored.reportRunnerLifecycle({ type: 'runner.ready' })
    await restored.tick()
  }
  expect(await restored.checkpoint()).toBeUndefined()
  expect(await restored.waitCreationLifecycle()).toEqual({ ok: true })
  expect(fixture.boat.statusRequests[statusCount]).toEqual({
    processId: 1,
    stdoutOffset: 4,
    stderrOffset: 0,
  })
  expect(fixture.boat.starts).toHaveLength(1)
  expect(fixture.boat.commands).toHaveLength(4)
  expect(fixture.boat.commandRequests.at(-1)).toMatchObject({
    detached: false,
    command: expect.stringContaining(
      'systemctl start conductive-terminal.service',
    ),
  })
  expect(await restored.readLifecycle()).toMatchObject({
    startupPrepared: true,
    pendingFirstMessage: FIRST_MESSAGE,
  })
  await restored.tick()
  // Finish the restore watch before checking the idle alarm.
  await restored.tick()
  const ready = await restored.readLifecycle()
  expect(await restored.alarmAt()).toBe((ready?.lastActivityAt ?? 0) + IDLE_MS)
  const completedBrowser = await fixture.openEvents(id)
  const before = await publicHistory(completedBrowser.inbox)
  expect(
    before.events.some((event) => hasStartStep(event, 'fetch', 'completed')),
  ).toBe(true)
  const completedLive = await liveEvents(
    resumedBrowser.inbox,
    resumedHistory.throughEventNumber,
    before.throughEventNumber,
  )
  expect([...resumedHistory.events, ...completedLive]).toEqual(before.events)
  await restored.lifecyclePrepared()
  const unchangedBrowser = await fixture.openEvents(id)
  expect(await publicHistory(unchangedBrowser.inbox)).toEqual(before)
  await restored.becomeIdle()
  expect(await restored.readLifecycle()).toMatchObject({
    state: 'stopped',
    pendingFirstMessage: FIRST_MESSAGE,
  })
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  expect(fixture.boat.deletedIds).toEqual([])
  const stoppedLive = await liveEvents(
    resumedBrowser.inbox,
    before.throughEventNumber,
    before.throughEventNumber + 2,
  )
  expect(stoppedLive).toMatchObject([
    { event: { type: 'workspace.updated', workspace: { state: 'stopped' } } },
    { event: { type: 'start.updated' } },
  ])
  const stoppedBrowser = await fixture.openEvents(id)
  const after = await publicHistory(stoppedBrowser.inbox)
  expect(after.events.slice(0, before.events.length)).toEqual(before.events)
  expect(after.throughEventNumber).toBe(before.throughEventNumber + 2)
  expect(after.events).toEqual([...before.events, ...stoppedLive])
}, 20_000)
