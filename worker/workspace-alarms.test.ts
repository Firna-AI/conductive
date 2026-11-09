import { expect, it, vi } from 'vitest'

import { nativeLifecycleStorage } from './lifecycle/native-storage.test-support'
import { TEST_TIME } from './test-support/harness'
import type { heldOperation } from './test-support/held-operation'
import { workspaceTaskAlarms } from './lifecycle/workspace-task-alarms'
import { runWorkspaceAlarms } from './workspace-alarms'

const at = (offset: number) => TEST_TIME + offset

async function fixture() {
  const { storage, native, holdTransaction } = await nativeLifecycleStorage()
  return {
    storage,
    native,
    holdTransaction,
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
  const { storage, native, alarms, tasks } = await fixture()
  const failure = new Error('The lifecycle write failed')
  await alarms.set('lifecycle', at(100))
  await alarms.set('previews', at(100))
  tasks.lifecycle.mockRejectedValueOnce(failure)
  await storage.deleteAlarm()
  await expect(runWorkspaceAlarms(alarms, () => at(100), tasks)).rejects.toBe(
    failure,
  )
  expect(tasks.previews).toHaveBeenCalledTimes(0)
  expect(await storage.get('number', 'alarm:previews')).toBe(at(30_100))
  expect(await native.getAlarm()).toBe(at(100))
})

it('moves only unchanged due markers owned by each run to the next future time or fallback', async () => {
  const { storage, native, holdTransaction, alarms } = await fixture()
  for (const source of [
    'lifecycle',
    'lifecycle:access',
    'lifecycle:changed',
    'devices',
    'previews',
    'github',
  ] as const)
    await alarms.set(source, at(100))
  await alarms.set('lifecycle:cleanup', at(120))
  await alarms.set('lifecycle:image', at(200))
  const outer = await alarms.begin(
    at(100),
    (source) => !source.startsWith('lifecycle'),
  )
  expect(await storage.get('number', 'alarm:lifecycle:run')).toBeUndefined()
  expect(await alarms.take(at(100))).toEqual(outer.due)
  expect(await storage.get('number', 'alarm:lifecycle:run')).toBeUndefined()
  const nested = await alarms.begin(at(100), (source) =>
    source.startsWith('lifecycle'),
  )
  expect(await storage.get('number', 'alarm:lifecycle:run')).toBe(at(30_100))
  await alarms.set('github', at(90))
  await alarms.set('lifecycle:changed', null)
  await alarms.set('lifecycle:publication', at(100))
  await alarms.set('lifecycle:start', at(150))
  await nested.finish(at(125))
  expect(await storage.list('number', { prefix: 'alarm:' })).toEqual(
    new Map([
      ['alarm:lifecycle', at(150)],
      ['alarm:lifecycle:access', at(150)],
      ['alarm:lifecycle:cleanup', at(120)],
      ['alarm:lifecycle:image', at(200)],
      ['alarm:lifecycle:publication', at(100)],
      ['alarm:lifecycle:start', at(150)],
      ['alarm:devices', at(100)],
      ['alarm:previews', at(100)],
      ['alarm:github', at(90)],
    ]),
  )
  const gate = await holdTransaction()
  const finishing = outer.finish(at(125))
  await gate.entered
  await alarms.set('previews', at(100))
  gate.release()
  await finishing
  expect(await storage.get('number', 'alarm:devices')).toBe(at(150))
  expect(await storage.get('number', 'alarm:previews')).toBe(at(100))
  expect(await storage.get('number', 'alarm:github')).toBe(at(90))
  expect(await storage.get('number', 'alarm:lifecycle:cleanup')).toBe(at(120))
  expect(await storage.get('number', 'alarm:lifecycle:publication')).toBe(
    at(100),
  )
  expect(await native.getAlarm()).toBe(at(90))

  const fallback = await fixture()
  let now = at(100)
  await fallback.alarms.set('previews', at(100))
  await fallback.alarms.set('github', at(120))
  fallback.tasks.previews.mockImplementationOnce(async () => {
    now = at(125)
  })
  await runWorkspaceAlarms(fallback.alarms, () => now, fallback.tasks)
  expect(await fallback.storage.get('number', 'alarm:previews')).toBe(
    at(30_125),
  )
  expect(await fallback.storage.get('number', 'alarm:github')).toBe(at(120))
  expect(await fallback.native.getAlarm()).toBe(at(120))

  const lifecycle = await fixture()
  await lifecycle.alarms.set('lifecycle', at(100))
  const run = await lifecycle.alarms.begin(at(100), (source) =>
    source.startsWith('lifecycle'),
  )
  await run.finish(at(125))
  expect(await lifecycle.storage.get('number', 'alarm:lifecycle')).toBe(
    at(30_125),
  )
  expect(
    await lifecycle.storage.get('number', 'alarm:lifecycle:run'),
  ).toBeUndefined()
  expect(await lifecycle.native.getAlarm()).toBe(at(30_125))
})

it('clears an expired device alarm but preserves a replacement lease at the same time', async () => {
  const { storage, native, holdTransaction, alarms, tasks } = await fixture()
  await alarms.set('devices', at(100))
  let acknowledge: (gate: ReturnType<typeof heldOperation>) => void = () => {}
  const acknowledging = new Promise<ReturnType<typeof heldOperation>>(
    (resolve) => {
      acknowledge = resolve
    },
  )
  tasks.devices.mockImplementationOnce(async () =>
    acknowledge(await holdTransaction()),
  )
  await storage.deleteAlarm()
  const running = runWorkspaceAlarms(alarms, () => at(100), tasks)
  const gate = await acknowledging
  await gate.entered
  await alarms.set('devices', at(100))
  gate.release()
  await running
  expect(await native.getAlarm()).toBe(at(100))
  await storage.deleteAlarm()
  await runWorkspaceAlarms(alarms, () => at(100), tasks)
  expect(tasks.devices).toHaveBeenCalledTimes(2)
  expect(await native.getAlarm()).toBeNull()
})
