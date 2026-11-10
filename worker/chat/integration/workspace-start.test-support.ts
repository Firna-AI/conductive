import type { WorkspaceStartResult } from '../../lifecycle/start-types'
import type { DurableLifecycleState } from '../../lifecycle/durable-types'

interface AlarmWorkspace {
  readStartAlarm(): Promise<number | null>
  advanceStartAlarm(at?: number): Promise<void>
}

export async function advanceNextWorkspaceAlarm(
  workspace: AlarmWorkspace,
): Promise<void> {
  const at = await workspace.readStartAlarm()
  if (at === null)
    throw new Error('Work remains, but the workspace has no stored alarm.')
  await workspace.advanceStartAlarm(at)
}

export async function prepareWorkspaceStart(
  workspace: AlarmWorkspace & {
    readLifecycle(): Promise<Pick<DurableLifecycleState, 'start'> | undefined>
  },
): Promise<void> {
  while (
    !(await workspace.readLifecycle())?.start?.steps.some(
      (step) => step.id === 'startup' && step.state === 'completed',
    )
  )
    await advanceNextWorkspaceAlarm(workspace)
}

export async function driveWorkspaceStart<T>(
  workspace: AlarmWorkspace,
  pending: Promise<T>,
): Promise<T> {
  let complete = false
  const settled = pending
    .then(
      (value) => ({ state: 'fulfilled' as const, value }),
      (reason: unknown) => ({ state: 'rejected' as const, reason }),
    )
    .finally(() => {
      complete = true
    })
  while (!complete) {
    const at = await workspace.readStartAlarm()
    if (complete) break
    if (at === null)
      throw new Error('Work remains, but the workspace has no stored alarm.')
    await workspace.advanceStartAlarm(at)
  }
  const result = await settled
  if (result.state === 'rejected') throw result.reason
  return result.value
}

/** The public open/resume reply ends at queuing, independently of this job wait. */
export async function completeWorkspaceResume<ResponseType>(
  workspace: AlarmWorkspace & {
    waitLifecycleStart(): Promise<WorkspaceStartResult<unknown>>
  },
  request: Promise<ResponseType>,
): Promise<ResponseType> {
  const response = await request
  const result = await driveWorkspaceStart(
    workspace,
    workspace.waitLifecycleStart(),
  )
  if (!result.ok)
    throw Object.assign(new Error(result.error.message), result.error)
  return response
}
