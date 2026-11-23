import { HOST_PATH } from '../../src/shared/host'
import type { AppEnv } from '../env'
import { machinesBinding } from './authorization'
import { machineObjectName, type MachineOwner } from './identity'

export async function machineTokenStatus(
  env: AppEnv,
  owner: MachineOwner,
  token: string,
): Promise<number> {
  const machines = machinesBinding(env)
  const response = await machines.getByName(machineObjectName(owner)).fetch(
    new Request(`${env.MACHINE_ORIGIN}${HOST_PATH}`, {
      headers: { Upgrade: 'websocket', Authorization: `Bearer ${token}` },
    }),
  )
  if (response.webSocket) {
    response.webSocket.accept()
    response.webSocket.close()
  }
  return response.status
}
