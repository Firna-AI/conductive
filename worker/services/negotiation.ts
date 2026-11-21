import type { ActiveRunner } from '../chat/types'
import type { AppEnv } from '../env'
import { workspaceTarget } from '../previews/access'
import { warnWorker } from '../warnings'
import { serviceBinding, type ServiceConnection } from './binding'

export async function negotiateServices(
  active: ActiveRunner,
  offered: boolean,
  env: AppEnv,
  connections: ServiceConnection,
): Promise<void> {
  active.services = false
  active.serviceBinding = undefined
  if (!offered) return
  try {
    const target = await workspaceTarget(
      env,
      active.workspace.orgId,
      active.workspace.id,
    )
    if (
      connections.current() !== active ||
      !(await active.peer.authorize()) ||
      connections.current() !== active
    )
      throw new Error('Service connection ended.')
    active.serviceBinding = serviceBinding(active, target)
    active.services = true
  } catch (error) {
    if (connections.current() !== active) throw error
    warnWorker({ kind: 'runner_service_negotiation_unavailable' })
  }
}
