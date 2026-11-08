import { expect, it } from 'vitest'

import { FIRST_MESSAGE, lifecycleFixture } from './durable-test-support'

it('keeps the first draft and timed start steps across a durable restart', async () => {
  const fixture = lifecycleFixture()
  const lifecycle = fixture.lifecycle
  const startedAt = fixture.now()
  await lifecycle.initialize({
    workspaceId: 'workspace-one',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  await lifecycle.beginStart('create')
  await lifecycle.step('image', 'Starting from the newest image', 'running')
  fixture.setTime(startedAt + 17)
  await lifecycle.step('image', 'Starting from the newest image', 'completed')
  await lifecycle.step('branch', 'Creating your branch', 'running')
  fixture.setTime(startedAt + 21)
  await lifecycle.step('branch', 'Creating your branch', 'failed')
  await lifecycle.fail({
    code: 'start_failed',
    message: 'The cloud computer could not start. Try again.',
    log: 'exit 1',
  })
  const restored = fixture.recreate()
  expect(await restored.read()).toMatchObject({
    state: 'error',
    pendingFirstMessage: FIRST_MESSAGE,
    start: {
      kind: 'create',
      startedAt,
      steps: [
        {
          id: 'image',
          state: 'completed',
          startedAt,
          completedAt: startedAt + 17,
        },
        {
          id: 'branch',
          state: 'failed',
          startedAt: startedAt + 17,
          completedAt: startedAt + 21,
        },
      ],
    },
    error: { code: 'start_failed', log: 'exit 1' },
  })
  expect(
    fixture.hooks.changed.mock.calls.map(([state]) =>
      state.start?.steps.map((step) => step.state),
    ),
  ).toEqual([
    undefined,
    [],
    ['running'],
    ['completed'],
    ['completed', 'running'],
    ['completed', 'failed'],
    ['completed', 'failed'],
  ])
  await restored.beginStart('resume')
  expect(fixture.alarmAt()).toBe(startedAt + 1_800_021)
  expect(await restored.read()).toMatchObject({
    state: 'starting',
    start: { kind: 'resume', startedAt: startedAt + 21, steps: [] },
    pendingFirstMessage: FIRST_MESSAGE,
  })
  await restored.runnerReady()
  expect((await restored.read())?.state).toBe('starting')
  fixture.setTime(startedAt + 300)
  await restored.reportStart({
    kind: 'resume',
    startedAt: startedAt + 21,
    steps: [
      {
        id: 'runner',
        label: 'Starting the agent',
        state: 'completed',
        startedAt: startedAt + 22,
        completedAt: startedAt + 42,
      },
    ],
  })
  await restored.step('runner', 'Starting the agent', 'completed')
  expect(await restored.read()).toMatchObject({
    lastActivityAt: startedAt + 21,
    start: {
      steps: [
        {
          id: 'runner',
          startedAt: startedAt + 22,
          completedAt: startedAt + 42,
        },
      ],
    },
  })
  await restored.prepared()
  await restored.acknowledgeFirstMessage()
  expect(await restored.read()).toMatchObject({
    state: 'ready',
    runnerConnected: true,
    pendingFirstMessage: null,
  })
})

it('stops after idle input and preserves disks near day fourteen', async () => {
  const fixture = lifecycleFixture()
  const lifecycle = fixture.lifecycle
  const startedAt = fixture.now()
  await lifecycle.initialize({
    workspaceId: 'workspace-one',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  await lifecycle.runnerReady()
  fixture.setTime(startedAt + 1_799_999)
  await lifecycle.runnerDisconnected()
  await lifecycle.runnerReady()
  expect(fixture.alarmAt()).toBe(startedAt + 1_800_000)
  await lifecycle.alarm()
  expect(fixture.hooks.stop).toHaveBeenCalledTimes(0)
  fixture.setTime(startedAt + 1_800_000)
  await lifecycle.alarm()
  expect(fixture.hooks.stop).toHaveBeenCalledTimes(1)
  expect(await lifecycle.read()).toMatchObject({
    state: 'stopped',
    stoppedAt: startedAt + 1_800_000,
    nextDiskKeepaliveAt: startedAt + 1_125_000_000,
  })
  expect(fixture.alarmAt()).toBe(startedAt + 1_125_000_000)
  fixture.setTime(startedAt + 1_125_000_000)
  await fixture.recreate().alarm()
  expect(fixture.hooks.keepalive).toHaveBeenCalledTimes(1)
  expect(await lifecycle.read()).toMatchObject({
    state: 'stopped',
    nextDiskKeepaliveAt: startedAt + 2_248_200_000,
  })
})

it('extends the safety deadline for input and every running session', async () => {
  const fixture = lifecycleFixture()
  const lifecycle = fixture.lifecycle
  const startedAt = fixture.now()
  await lifecycle.initialize({
    workspaceId: 'workspace-one',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  await lifecycle.runnerReady()
  fixture.setTime(startedAt + 1_799_999)
  await lifecycle.activity()
  expect(fixture.alarmAt()).toBe(startedAt + 3_599_999)
  await lifecycle.turn('session-one', true)
  await lifecycle.turn('session-two', true)
  await lifecycle.turn('session-one', false)
  fixture.setTime(startedAt + 5_400_000)
  await lifecycle.alarm()
  expect(fixture.hooks.stop).toHaveBeenCalledTimes(0)
  expect(fixture.hooks.extendDeadline).toHaveBeenCalledTimes(5)
  expect(fixture.alarmAt()).toBe(startedAt + 5_700_000)
  expect(await lifecycle.read()).toMatchObject({
    state: 'working',
    runningSessions: ['session-two'],
  })
  await lifecycle.turn('session-two', false)
  fixture.setTime(startedAt + 7_200_000)
  await lifecycle.alarm()
  expect(fixture.hooks.stop).toHaveBeenCalledTimes(1)
})

it.each([
  { idleSource: 'turn end', activityAt: null, idleAt: 100 },
  { idleSource: 'newer activity', activityAt: 200, idleAt: 200 },
])(
  'recovers committed turn ends and keeps the original $idleSource idle stop across restart and hello',
  async ({ activityAt, idleAt }) => {
    const fixture = lifecycleFixture()
    const lifecycle = fixture.lifecycle
    const startedAt = fixture.now()
    await lifecycle.initialize({
      workspaceId: 'workspace-one',
      orgId: 'org-one',
      firstMessage: FIRST_MESSAGE,
    })
    await lifecycle.runnerReady()
    await lifecycle.turn('session-one', true)
    if (activityAt !== null) {
      fixture.setTime(startedAt + activityAt)
      await lifecycle.activity()
    }
    fixture.setTime(startedAt + 300)
    fixture.hooks.extendDeadline.mockRejectedValueOnce(
      new Error('Deadline failed'),
    )
    await expect(lifecycle.turn('session-one', false)).rejects.toThrow(
      'Deadline failed',
    )
    fixture.hooks.recoverTurns.mockResolvedValue({
      runningSessions: [],
      lastTurnEndedAt: startedAt + 100,
    })
    fixture.setTime(startedAt + 1_200_000)
    const restored = fixture.recreate()
    await restored.alarm()
    await restored.runnerReady()
    expect(await restored.read()).toMatchObject({
      state: 'ready',
      runningSessions: [],
      lastActivityAt: startedAt + idleAt,
    })
    expect(fixture.alarmAt()).toBe(startedAt + idleAt + 1_800_000)
    fixture.setTime(startedAt + idleAt + 1_799_999)
    await restored.alarm()
    expect(fixture.hooks.stop).toHaveBeenCalledTimes(0)
    fixture.setTime(startedAt + idleAt + 1_800_000)
    await restored.alarm()
    expect(fixture.hooks.stop).toHaveBeenCalledTimes(1)
    expect((await restored.read())?.state).toBe('stopped')
  },
)
