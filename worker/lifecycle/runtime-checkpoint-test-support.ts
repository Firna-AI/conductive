import { START_JOB_KEY } from './start-storage'
import type { StoredWorkspaceStartJob } from './start-job-codec'

export function holdMachineCheckpoint(storage: DurableObjectStorage) {
  let reached: () => void = () => {}
  let release: () => void = () => {}
  const entered = new Promise<void>((resolve) => {
    reached = resolve
  })
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  const transaction = storage.transaction.bind(storage)
  storage.transaction = async (operation) => {
    const result = await transaction(operation)
    const job = await storage.get<StoredWorkspaceStartJob>(START_JOB_KEY)
    if (job?.phase === 'machine') {
      await storage.sync()
      reached()
      await pending
    }
    return result
  }
  return { entered, release }
}
