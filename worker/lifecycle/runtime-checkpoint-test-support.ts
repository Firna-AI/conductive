import { START_JOB_KEY, START_RESULT_KEY } from './start-storage'
import type { StoredWorkspaceStartJob } from './start-job-codec'
import type { WorkspaceStartResult } from './start-types'
import { FIRST_MESSAGE_ADMISSION_KEY } from './workspace-runtime'
import {
  LIFECYCLE_STATE_KEY,
  type DurableLifecycleState,
} from './durable-types'

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

export function holdResumeCompletionCheckpoint(
  storage: DurableObjectStorage,
  attempt: string,
) {
  let reached: () => void = () => {}
  const entered = new Promise<void>((resolve) => {
    reached = resolve
  })
  const pending = new Promise<void>(() => {})
  const transaction = storage.transaction.bind(storage)
  storage.transaction = async (operation) => {
    const previous = await storage.get<StoredWorkspaceStartJob>(START_JOB_KEY)
    const result = await transaction(operation)
    if (previous?.kind !== 'resume' || previous.attempt !== attempt)
      return result
    const job = await storage.get<StoredWorkspaceStartJob>(START_JOB_KEY)
    const completed = await storage.get<WorkspaceStartResult>(START_RESULT_KEY)
    if (
      !job &&
      completed?.ok === false &&
      (await storage.get<number>('alarm:lifecycle:start')) === undefined
    ) {
      await storage.sync()
      reached()
      await pending
    }
    return result
  }
  return { entered }
}

export async function readCompletionCheckpoint(
  storage: DurableObjectStorage,
  now: number,
) {
  const alarms = await storage.list<number>({ prefix: 'alarm:' })
  return {
    now,
    job: await storage.get<StoredWorkspaceStartJob>(START_JOB_KEY),
    result: await storage.get<WorkspaceStartResult>(START_RESULT_KEY),
    state: await storage.get<DurableLifecycleState>(LIFECYCLE_STATE_KEY),
    alarms: [...alarms],
    runLease: alarms.get('alarm:lifecycle:run'),
    alarmAt: await storage.getAlarm(),
  }
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
