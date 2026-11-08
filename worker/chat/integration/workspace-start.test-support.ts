import type { WorkspaceStartResult } from '../../lifecycle/start-types'

export async function driveWorkspaceStart<T>(
  workspace: { advanceStartAlarm(): Promise<void> },
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
  while (!complete) await workspace.advanceStartAlarm()
  const result = await settled
  if (result.state === 'rejected') throw result.reason
  return result.value
}

/** The public open/resume reply ends at queuing, independently of this job wait. */
export async function completeWorkspaceResume<ResponseType>(
  workspace: {
    advanceStartAlarm(): Promise<void>
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
