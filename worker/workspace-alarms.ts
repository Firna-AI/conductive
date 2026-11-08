import type { WorkspaceAlarms } from './features/alarms'
import type { WorkspaceFeatures } from './features/workspace'
import type { ReceiverStorage } from './members/receiver-storage'

export async function expireWorkspacePreviews(
  storage: ReceiverStorage,
  alarms: WorkspaceAlarms,
  previews: WorkspaceFeatures['previews'],
): Promise<void> {
  await previews.expire()
  const id = await storage.get<string>('previews:workspace-id')
  if (id) await alarms.set('previews', await previews.nextExpiry(id))
}

export async function runWorkspaceAlarms(
  alarms: WorkspaceAlarms,
  now: number,
  tasks: {
    lifecycle(): Promise<void>
    github(): Promise<void>
    previews(): Promise<void>
    devices(): Promise<void>
    publishRevocations(): Promise<void>
  },
): Promise<void> {
  const due = await alarms.take(now)
  try {
    if (!due.size || [...due].some((source) => source.startsWith('lifecycle')))
      await tasks.lifecycle()
    if (due.has('github')) await tasks.github()
    if (due.has('previews')) await tasks.previews()
    await alarms.run('devices', now, tasks.devices)
    await tasks.publishRevocations()
  } finally {
    await alarms.schedule()
  }
}
