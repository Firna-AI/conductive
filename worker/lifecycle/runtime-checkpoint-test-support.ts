import { START_JOB_KEY } from './start-storage'
import type { StoredWorkspaceStartJob } from './start-job-codec'
import { FIRST_MESSAGE_ADMISSION_KEY } from './workspace-runtime'
import { LIFECYCLE_STATE_KEY } from './durable-types'

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

export function failAfterFirstMessageAdmission(
  storage: DurableObjectStorage,
  afterLifecycleWrite = false,
) {
  const transaction = storage.transaction.bind(storage)
  storage.transaction = async (operation) => {
    const result = await transaction(operation)
    if (
      (await storage.get(FIRST_MESSAGE_ADMISSION_KEY)) &&
      !(await storage.get(LIFECYCLE_STATE_KEY))
    ) {
      storage.transaction = async (next) => {
        storage.transaction = transaction
        if (afterLifecycleWrite) await transaction(next)
        throw new Error(
          'The first lifecycle write failed after chat admission.',
        )
      }
    }
    return result
  }
}
