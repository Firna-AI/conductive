import { DISK_KEEPALIVE_MS } from './durable-types'
import { repositoryDirectory, writeFileCommand } from './commands'
import { readImageSettings, workspaceEnvironment } from './settings-data'
import { readWorkspaceToken } from './tokens'
import { readRetention, setRetention, clearRetention } from './retention-data'
import {
  actionResources,
  type WorkspaceActionContext,
} from './workspace-actions'
import { revokeWorkspacePreviews } from './workspace-data'
import type { DurableLifecycle } from './durable'

/** The caller serializes this action with user starts in the workspace object. */
export async function keepWorkspaceDisk(
  context: WorkspaceActionContext,
): Promise<boolean> {
  const { env, dependencies, workspaceId, orgId } = context
  const { provider, sandboxId, row } = await actionResources(context)
  if (row.state !== 'stopped') {
    await clearRetention(env.DB, workspaceId)
    return true
  }
  const progress = (await readRetention(env.DB, workspaceId)) ?? {
    phase: 'resume',
    error: null,
  }
  const machine = await provider.get(sandboxId)
  if (progress.phase === 'resume') {
    await setRetention(env.DB, workspaceId, 'resume')
    if (machine.state === 'archived' || machine.state === 'cancelled') {
      const environment = await workspaceEnvironment(env, orgId)
      const token = await readWorkspaceToken(env, workspaceId)
      await provider.resume(
        sandboxId,
        {
          ...environment,
          WORKSPACE_TOKEN: token,
          CONDUCTING_WORKSPACE_ID: workspaceId,
          CONDUCTING_MACHINE_ORIGIN: env.MACHINE_ORIGIN ?? '',
          CONDUCTING_REPOSITORY_DIR: repositoryDirectory(row.repositoryId),
          CONDUCTING_TURN_ID: '',
          CONDUCTING_DISK_KEEPALIVE: '1',
        },
        1_800,
      )
    }
    await setRetention(env.DB, workspaceId, 'wait')
    return false
  }
  if (progress.phase === 'wait') {
    if (machine.state === 'archived' || machine.state === 'cancelled') {
      await setRetention(env.DB, workspaceId, 'resume')
      return false
    }
    if (
      machine.state === 'ready' ||
      machine.state === 'running' ||
      machine.state === 'idle'
    )
      await setRetention(env.DB, workspaceId, 'startup')
    return false
  }
  if (progress.phase === 'startup') {
    const settings = await readImageSettings(env.DB, orgId)
    let error: string | null = null
    try {
      const result = await provider.runCommand(
        sandboxId,
        [
          'set -eu',
          'umask 077',
          'sudo -n install -d -m 700 -o user -g user /run/conducting',
          writeFileCommand(
            '/run/conducting/retention-startup.sh',
            settings.startupScript,
          ),
          'set -a',
          '. /run/ascii-secrets/env.sh',
          'set +a',
          'cd "$CONDUCTING_REPOSITORY_DIR"',
          'sh /run/conducting/retention-startup.sh',
        ].join('\n'),
      )
      if (result.exitCode !== 0 || result.timedOut)
        error = 'The startup script failed during disk retention.'
    } catch {
      error = 'The startup script could not run during disk retention.'
    }
    await setRetention(env.DB, workspaceId, 'stop', error)
    return false
  }
  let stopped = machine.state === 'archived' || machine.state === 'cancelled'
  if (!stopped) {
    const result = await provider.stop(sandboxId)
    stopped = result.state === 'archived' || result.state === 'cancelled'
  }
  if (!stopped) return false
  await revokeWorkspacePreviews(env.DB, workspaceId, dependencies.now())
  await env.DB.prepare(
    'UPDATE workspaces SET stopped_at = ?, next_disk_keepalive_at = ? WHERE id = ? AND org_id = ? AND state = ?',
  )
    .bind(
      dependencies.now(),
      dependencies.now() + DISK_KEEPALIVE_MS,
      workspaceId,
      orgId,
      'stopped',
    )
    .run()
  await clearRetention(env.DB, workspaceId)
  return true
}

export async function finishDiskMaintenance(
  context: WorkspaceActionContext,
  lifecycle: DurableLifecycle,
): Promise<void> {
  await lifecycle.exclusive(async () => {
    while (await readRetention(context.env.DB, context.workspaceId)) {
      if (await keepWorkspaceDisk(context)) return
      await new Promise<void>((resolve) => setTimeout(resolve, 1_000))
    }
  })
}
