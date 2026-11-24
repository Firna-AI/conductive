import type { AppEnv } from '../env'
import { MACHINE_TOKEN_PATTERN } from '../machines/authorization'
import { machineTokenEnvironment } from '../machines/client'
import { machineObjectName, type MachineOwner } from '../machines/identity'
import { decrypt, encrypt } from '../security/crypto'

type BuildOwner = Exclude<MachineOwner, { kind: 'workspace' }>

function tokenContext(owner: BuildOwner): string {
  return JSON.stringify([
    'build-machine-token',
    machineObjectName(owner),
    ...(owner.kind === 'build' ? [owner.orgId] : []),
  ])
}

export function encryptBuildMachineToken(
  env: AppEnv,
  owner: BuildOwner,
  token: string,
): Promise<string> {
  return encrypt(token, tokenContext(owner), env.BOAT_KEY_ENCRYPTION_KEY)
}

export function decryptBuildMachineToken(
  env: AppEnv,
  owner: BuildOwner,
  ciphertext: string,
): Promise<string> {
  return decrypt(ciphertext, tokenContext(owner), env.BOAT_KEY_ENCRYPTION_KEY)
}

export async function buildMachineEnvironment(
  env: AppEnv,
  owner: BuildOwner,
  ciphertext: string | null,
): Promise<Record<string, string> | undefined> {
  if (ciphertext === null) return undefined
  return machineTokenEnvironment(
    env,
    await decryptBuildMachineToken(env, owner, ciphertext),
  )
}

export function hideMachineTokens(text: string): string {
  return text.replace(new RegExp(MACHINE_TOKEN_PATTERN, 'g'), '[hidden]')
}
