import type { AppEnv } from '../env'
import { encryptBuildMachineToken } from '../lifecycle/build-machine-token'
import { newMachineToken, softwareImageMachineOwner } from '../machines/client'
import { saveSoftwareImage } from './data'
import { AttemptChanged } from './resources'
import type { SoftwareImage } from './types'

export async function beginSoftwareImageAllocation(
  env: AppEnv,
  image: SoftwareImage,
): Promise<void> {
  const owner = softwareImageMachineOwner(image.id)
  const machineTokenCiphertext = await encryptBuildMachineToken(
    env,
    owner,
    newMachineToken(env, owner),
  )
  if (
    !(await saveSoftwareImage(env.DB, image, {
      phase: 'allocating',
      machineTokenCiphertext,
    }))
  )
    throw new AttemptChanged()
}
