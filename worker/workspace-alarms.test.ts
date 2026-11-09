import { expect, it, vi } from 'vitest'

import { MemoryWorkspaceStorage } from './lifecycle/platform-test-storage'
import { workspaceTaskAlarms } from './lifecycle/workspace-task-alarms'
import { runWorkspaceAlarms } from './workspace-alarms'

function fixture() {
  const storage = new MemoryWorkspaceStorage()
  return {
    storage,
    alarms: workspaceTaskAlarms(storage),
    tasks: {
      lifecycle: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      github: async () => {},
      previews: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      devices: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      publishRevocations: async () => {},
    },
  }
}

it('defers a pending preview alarm when lifecycle work fails before the preview handler', async () => {
  const { storage, alarms, tasks } = fixture()
  const failure = new Error('The lifecycle write failed')
  await alarms.set('lifecycle', 100)
  await alarms.set('previews', 100)
  tasks.lifecycle.mockRejectedValueOnce(failure)
  await storage.deleteAlarm()
  await expect(runWorkspaceAlarms(alarms, () => 100, tasks)).rejects.toBe(
    failure,
  )
  expect(tasks.previews).toHaveBeenCalledTimes(0)
  expect(await storage.get('number', 'alarm:previews')).toBe(30_100)
  expect(storage.alarmAt).toBe(100)
})

it('moves only unchanged due markers owned by each run to the next future time or fallback', async () => {
  const { storage, alarms } = fixture()
  for (const source of [
    'lifecycle',
    'lifecycle:access',
    'lifecycle:changed',
    'devices',
    'previews',
    'github',
  ] as const)
    await alarms.set(source, 100)
  await alarms.set('lifecycle:cleanup', 120)
  await alarms.set('lifecycle:image', 200)
  const outer = await alarms.begin(
    100,
    (source) => !source.startsWith('lifecycle'),
  )
  expect(await storage.get('number', 'alarm:lifecycle:run')).toBeUndefined()
  expect(await alarms.take(100)).toEqual(outer.due)
  expect(await storage.get('number', 'alarm:lifecycle:run')).toBeUndefined()
  const nested = await alarms.begin(100, (source) =>
    source.startsWith('lifecycle'),
  )
  expect(await storage.get('number', 'alarm:lifecycle:run')).toBe(30_100)
  await alarms.set('github', 90)
  await alarms.set('lifecycle:changed', null)
  await alarms.set('lifecycle:publication', 100)
  await alarms.set('lifecycle:start', 150)
  await nested.finish(125)
  expect(await storage.list('number', { prefix: 'alarm:' })).toEqual(
    new Map([
      ['alarm:lifecycle', 150],
      ['alarm:lifecycle:access', 150],
      ['alarm:lifecycle:cleanup', 120],
      ['alarm:lifecycle:image', 200],
      ['alarm:lifecycle:publication', 100],
      ['alarm:lifecycle:start', 150],
      ['alarm:devices', 100],
      ['alarm:previews', 100],
      ['alarm:github', 90],
    ]),
  )
  const gate = storage.holdTransaction()
  const finishing = outer.finish(125)
  await gate.entered
  await alarms.set('previews', 100)
  gate.release()
  await finishing
  expect(await storage.get('number', 'alarm:devices')).toBe(150)
  expect(await storage.get('number', 'alarm:previews')).toBe(100)
  expect(await storage.get('number', 'alarm:github')).toBe(90)
  expect(await storage.get('number', 'alarm:lifecycle:cleanup')).toBe(120)
  expect(await storage.get('number', 'alarm:lifecycle:publication')).toBe(100)
  expect(storage.alarmAt).toBe(90)

  const fallback = fixture()
  let now = 100
  await fallback.alarms.set('previews', 100)
  await fallback.alarms.set('github', 120)
  fallback.tasks.previews.mockImplementationOnce(async () => {
    now = 125
  })
  await runWorkspaceAlarms(fallback.alarms, () => now, fallback.tasks)
  expect(await fallback.storage.get('number', 'alarm:previews')).toBe(30_125)
  expect(await fallback.storage.get('number', 'alarm:github')).toBe(120)
  expect(fallback.storage.alarmAt).toBe(120)

  const lifecycle = fixture()
  await lifecycle.alarms.set('lifecycle', 100)
  const run = await lifecycle.alarms.begin(100, (source) =>
    source.startsWith('lifecycle'),
  )
  await run.finish(125)
  expect(await lifecycle.storage.get('number', 'alarm:lifecycle')).toBe(30_125)
  expect(
    await lifecycle.storage.get('number', 'alarm:lifecycle:run'),
  ).toBeUndefined()
  expect(lifecycle.storage.alarmAt).toBe(30_125)
})

it('clears an expired device alarm but preserves a replacement lease at the same time', async () => {
  const { storage, alarms, tasks } = fixture()
  await alarms.set('devices', 100)
  let acknowledge: (
    gate: ReturnType<MemoryWorkspaceStorage['holdTransaction']>,
  ) => void = () => {}
  const acknowledging = new Promise<
    ReturnType<MemoryWorkspaceStorage['holdTransaction']>
  >((resolve) => {
    acknowledge = resolve
  })
  tasks.devices.mockImplementationOnce(async () =>
    acknowledge(storage.holdTransaction()),
  )
  await storage.deleteAlarm()
  const running = runWorkspaceAlarms(alarms, () => 100, tasks)
  const gate = await acknowledging
  await gate.entered
  await alarms.set('devices', 100)
  gate.release()
  await running
  expect(storage.alarmAt).toBe(100)
  await storage.deleteAlarm()
  await runWorkspaceAlarms(alarms, () => 100, tasks)
  expect(tasks.devices).toHaveBeenCalledTimes(2)
  expect(storage.alarmAt).toBeNull()
})
