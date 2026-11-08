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

it('keeps a pending preview alarm when lifecycle work fails before the preview handler', async () => {
  const { storage, alarms, tasks } = fixture()
  const failure = new Error('The lifecycle write failed')
  await alarms.set('lifecycle', 100)
  await alarms.set('previews', 100)
  tasks.lifecycle.mockRejectedValueOnce(failure)
  await storage.deleteAlarm()
  await expect(runWorkspaceAlarms(alarms, 100, tasks)).rejects.toBe(failure)
  expect(tasks.previews).toHaveBeenCalledTimes(0)
  expect(await storage.get('number', 'alarm:previews')).toBe(100)
  expect(storage.alarmAt).toBe(100)
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
  const running = runWorkspaceAlarms(alarms, 100, tasks)
  const gate = await acknowledging
  await gate.entered
  await alarms.set('devices', 100)
  gate.release()
  await running
  expect(storage.alarmAt).toBe(100)
  await storage.deleteAlarm()
  await runWorkspaceAlarms(alarms, 100, tasks)
  expect(tasks.devices).toHaveBeenCalledTimes(2)
  expect(storage.alarmAt).toBeNull()
})
