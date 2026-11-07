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
