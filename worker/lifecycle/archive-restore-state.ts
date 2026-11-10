import type { ArchiveContext } from './archive-context'
import { ARCHIVE_STATE_KEY } from './archive-types'
import { readArchiveResource } from './archive-data'
import { DISK_KEEPALIVE_MS } from './durable-types'
import { readWorkspace, workspaceRecord } from './workspace-data'

export async function finishArchiveRestore(
  context: ArchiveContext,
  clear: () => Promise<void>,
  stopPending?: boolean,
): Promise<void> {
  const { env, dependencies, lifecycle, alarms, publish } = context
  const state = await context.storage.get('archive', ARCHIVE_STATE_KEY)
  if (!state) return
  const row = await readArchiveResource(env.DB, state.workspaceId)
  if (!row || row.archivedAt !== null) return
  const current = await lifecycle.read()
  if (current?.state === 'archived')
    await lifecycle.restoreStopped(
      row.stoppedAt,
      row.stoppedAt === null
        ? dependencies.now()
        : row.stoppedAt + DISK_KEEPALIVE_MS,
      stopPending ?? state.phase !== 'retained',
    )
  if (row.ownerSuspended !== null && !(await lifecycle.read())?.startStop)
    await alarms.set('lifecycle', null)
  await publish({
    workspaceId: state.workspaceId,
    event: {
      type: 'workspace.updated',
      workspace: workspaceRecord(
        await readWorkspace(env.DB, state.orgId, state.workspaceId),
      ),
    },
    occurredAt: dependencies.now(),
  })
  await clear()
}
