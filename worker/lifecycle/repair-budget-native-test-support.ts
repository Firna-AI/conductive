import type { AppEnv } from '../env'
import type { WarningRecord } from '../warnings'
import { imageRuntime } from './runtime'
import { repairLifecycleAlarms } from './repair'

/** Runs the budget check beside D1, without a Node bridge for each query. */
export async function exerciseRepairBudget(env: AppEnv, now: number) {
  const workspaceCalls: string[] = []
  const orgCalls: string[] = []
  const warnings: WarningRecord[] = []
  const dependencies = {
    now: () => now,
    fetch,
    randomToken: () => 'unused-repair-token',
  }
  const runtime = {
    env,
    dependencies,
    workspace(id: string): never {
      workspaceCalls.push(id)
      throw new Error('Workspace RPC unavailable')
    },
  }
  const images = {
    ...imageRuntime(env, dependencies),
    scheduler: {
      async schedule(orgId: string) {
        orgCalls.push(orgId)
        throw new Error('Image coordinator RPC unavailable')
      },
    },
  }
  const software = () => ({
    url: 'https://software.conductive.test/runner.tar.gz',
    sha256: 'a'.repeat(64),
  })
  const warn = console.warn
  console.warn = (message: WarningRecord) => {
    warnings.push(message)
  }
  try {
    const first = await repairLifecycleAlarms(runtime, images, software)
    const firstWorkspaces = [...workspaceCalls]
    const firstOrgs = [...orgCalls]
    const firstWarnings = [...warnings]
    const movedWorkspaces = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspaces WHERE next_disk_keepalive_at = ?',
    )
      .bind(now)
      .first<number>('count')
    const movedOrgs = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM org_images WHERE next_image_refresh_at = ?',
    )
      .bind(now)
      .first<number>('count')
    const second = await repairLifecycleAlarms(runtime, images, software)
    const secondWorkspaces = [...workspaceCalls]
    const secondOrgs = [...orgCalls]
    const third = await repairLifecycleAlarms(runtime, images, software)
    return {
      first,
      second,
      third,
      firstWorkspaces,
      firstOrgs,
      firstWarnings,
      secondWorkspaces,
      secondOrgs,
      workspaceCalls,
      orgCalls,
      movedWorkspaces,
      movedOrgs,
    }
  } finally {
    console.warn = warn
  }
}
