import type { QueueTurn } from '../chat/queue-turn'
import type { WorkspacePlatform } from './workspace-platform'
import { START_JOB_KEY } from './start-storage'

export class StartSuperseded extends Error {
  constructor() {
    super('The workspace start changed during an outside call.')
    this.name = 'StartSuperseded'
  }
}

export type StartCall = <T>(call: () => Promise<T>) => Promise<T>

export const startCallInPlace: StartCall = (call) => call()

export function startGuard(
  platform: WorkspacePlatform,
  turn?: QueueTurn,
): StartCall {
  if (!turn) return startCallInPlace
  const checkpoint = async () => {
    const job = await platform.storage.get('job', START_JOB_KEY)
    const epoch =
      (await platform.storage.get('number', 'lifecycle:stop-epoch')) ?? 0
    try {
      await platform.assertStartActive?.(turn)
    } catch {
      throw new StartSuperseded()
    }
    if (!job) throw new StartSuperseded()
    return { job: JSON.stringify(job), epoch }
  }
  return async (call) => {
    const before = await checkpoint()
    const result = await turn.outside(async () => {
      try {
        return { ok: true as const, value: await call() }
      } catch (error) {
        return { ok: false as const, error }
      }
    })
    const after = await checkpoint()
    if (before.job !== after.job || before.epoch !== after.epoch)
      throw new StartSuperseded()
    if (!result.ok) throw result.error
    return result.value
  }
}
