import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { WORKSPACE_ID } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { continueFixture } from './continue.test-support'
import { LostHostReply } from './lifecycle-host-test-support'
import {
  CONTINUE_JOB_KEY,
  continueJobKey,
  readContinueJob,
} from './continue-types'
import { readWorkspace } from './workspace-data'

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
afterEach(() => vi.restoreAllMocks())

it('stores cancellation and provider preparation causes before starting a move', async () => {
  const f = await continueFixture(harness)
  for (const stopCause of ['cancelled', 'provider-preparation-failed']) {
    await f.resetContinue()
    const pending = await f.start()
    if (pending.state !== 'pending')
      throw new Error('Expected pending Continue.')
    await f.advanceTo('move')
    if (stopCause === 'cancelled') await f.coordinator.cancel()
    else f.boat.failDeadline = true
    const commands = f.boat.commands.length
    await f.finish()
    await expect(f.result(pending.continueId)).rejects.toMatchObject({
      status: 409,
      code: 'workspace_continue_failed',
      message: 'Continue could not finish.',
    })
    expect(
      await f.storage.get(continueJobKey(pending.continueId)),
    ).toMatchObject({ stopCause })
    expect(f.boat.commands).toHaveLength(commands)
    expect((await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).branch).toBe(
      'octocat/test',
    )
  }
})

it('stores a start failure when resume rejects or the saved start ends in error', async () => {
  const f = await continueFixture(harness)
  for (const rejected of [true, false]) {
    await f.resetContinue()
    await f.env.DB.prepare(
      "UPDATE workspaces SET state = 'stopped' WHERE id = ?",
    )
      .bind(WORKSPACE_ID)
      .run()
    f.options.resume = async () => {
      if (rejected) throw new Error('untrusted provider body')
      await f.env.DB.prepare(
        "UPDATE workspaces SET state = 'error' WHERE id = ?",
      )
        .bind(WORKSPACE_ID)
        .run()
    }
    const pending = await f.start()
    if (pending.state !== 'pending')
      throw new Error('Expected pending Continue.')
    await f.finish()
    await expect(f.result(pending.continueId)).rejects.toMatchObject({
      status: 409,
      code: 'workspace_continue_failed',
      message: 'Continue could not finish.',
    })
    expect(
      await f.storage.get(continueJobKey(pending.continueId)),
    ).toMatchObject({ stopCause: 'sandbox-start-failed' })
    expect(f.boat.commandRequests.filter(({ detached }) => detached)).toEqual(
      [],
    )
    expect((await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).branch).toBe(
      'octocat/test',
    )
  }
})

it('keeps an uncertain command start through reconstruction and never repeats its move', async () => {
  const f = await continueFixture(harness)
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  await f.advanceTo('move')
  const beforeCommand = f.boat.beforeCommand
  let lost = false
  f.boat.beforeCommand = async (command, detached) => {
    await beforeCommand?.(command, detached)
    if (detached && !lost) {
      lost = true
      throw new LostHostReply()
    }
  }
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({
    stopCause: 'command-start-uncertain',
    commandStarted: true,
    processId: null,
  })
  f.reconstruct()
  await f.host.connect('bx_continue')
  f.boat.commandExitCode = 125
  await f.finish()
  await expect(f.result(pending.continueId)).rejects.toMatchObject({
    status: 409,
    code: 'workspace_continue_failed',
    message: 'Continue could not finish.',
  })
  expect(await f.storage.get(continueJobKey(pending.continueId))).toMatchObject(
    { stopCause: 'command-start-uncertain' },
  )
  expect(
    f.boat.commands.filter((command) => command.startsWith('test -L ')),
  ).toHaveLength(1)
  expect((await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).branch).toBe(
    'octocat/test',
  )
})

it('reads older and unrecognized stored causes as unknown without changing saved errors', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const f = await continueFixture(harness)
  const failure = {
    status: 409,
    code: 'workspace_branch_changed',
    message: 'The workspace branch changed. Open the workspace and try again.',
  }
  for (const stopCause of [undefined, 'untrusted stored cause']) {
    await f.resetContinue()
    const pending = await f.start()
    if (pending.state !== 'pending')
      throw new Error('Expected pending Continue.')
    const job = await f.advanceTo('fetch')
    await f.storage.put(CONTINUE_JOB_KEY, { ...job, stopCause, failure })
    expect(await readContinueJob(f.storage)).toMatchObject({
      stopCause: 'unknown',
      failure,
    })
    f.reconstruct()
    await f.finish()
    await expect(f.result(pending.continueId)).rejects.toMatchObject(failure)
    expect(await f.storage.get(continueJobKey(job.id))).toMatchObject({
      stopCause: 'unknown',
      failure,
      outcome: { ok: false, error: failure },
    })
  }
  await f.resetContinue()
  const fetchPending = await f.start()
  if (fetchPending.state !== 'pending')
    throw new Error('Expected pending Continue.')
  await f.advanceTo('fetch')
  f.boat.commandExitCode = 1
  await f.finish()
  await expect(f.result(fetchPending.continueId)).rejects.toMatchObject({
    status: 409,
    code: 'workspace_continue_failed',
    message: 'Continue could not finish. Check GitHub access and try again.',
  })
  expect((await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).branch).toBe(
    'octocat/test',
  )
  expect(warn.mock.calls).toEqual([
    [
      {
        kind: 'workspace_continue_ended',
        message: 'Continue ended as failed.',
        workspaceId: 'unknown',
        phase: 'fetch',
        stopCause: 'unknown',
      },
    ],
    [
      {
        kind: 'workspace_continue_ended',
        message: 'Continue ended as failed.',
        workspaceId: 'unknown',
        phase: 'fetch',
        stopCause: 'unknown',
      },
    ],
    [
      {
        kind: 'workspace_continue_ended',
        message: 'Continue ended as failed.',
        workspaceId: 'unknown',
        phase: 'fetch',
        stopCause: 'unknown',
      },
    ],
  ])
})
