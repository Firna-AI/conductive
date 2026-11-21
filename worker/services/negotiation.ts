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
  active.state.services = false
  active.state.serviceBinding = undefined
  if (!offered) return
  try {
    const target = await workspaceTarget(
      env,
      active.state.workspace.orgId,
      active.state.workspace.id,
    )
    if (
      connections.current() !== active ||
      !(await active.peer.authorize()) ||
      connections.current() !== active
    )
      throw new Error('Service connection ended.')
    active.state.serviceBinding = serviceBinding(active, target)
    active.state.services = true
  } catch (error) {
    if (connections.current() !== active) throw error
    warnWorker({ kind: 'runner_service_negotiation_unavailable' })
  }
}
