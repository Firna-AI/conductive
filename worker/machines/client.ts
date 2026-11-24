import type { HostStreamPort } from '../../src/shared/generated/HostStreamPort'
import type { AppEnv } from '../env'
import { requireFeatureResult, type FeatureResult } from '../features/result'
import { hash, randomToken } from '../security/crypto'
import { machinesBinding } from './authorization'
import { machineObjectName, type MachineOwner } from './identity'
import type { Machine } from './machine'

async function machineResult<T>(
  env: AppEnv,
  owner: MachineOwner,
  operation: (stub: DurableObjectStub<Machine>) => Promise<FeatureResult<T>>,
  streaming = false,
): Promise<T> {
  const namespace = machinesBinding(env)
  const stub = namespace.get(namespace.idFromName(machineObjectName(owner)))
  let call: Promise<FeatureResult<T>> | undefined
  let result: FeatureResult<T> | undefined
  try {
    call = operation(stub)
    result = await call
    return requireFeatureResult(result)
  } finally {
    for (const value of streaming && result?.ok ? [] : [result, call, stub]) {
      if (!value) continue
      const dispose: unknown = Reflect.get(value, Symbol.dispose)
      if (typeof dispose === 'function') Reflect.apply(dispose, value, [])
    }
  }
}

export function workspaceMachineOwner(
  orgId: string,
  workspaceId: string,
): Extract<MachineOwner, { kind: 'workspace' }> {
  return { kind: 'workspace', orgId, workspaceId }
}

export function buildMachineOwner(
  orgId: string,
  buildId: string,
): Extract<MachineOwner, { kind: 'build' }> {
  return { kind: 'build', orgId, buildId }
}

export function softwareImageMachineOwner(
  imageId: string,
): Extract<MachineOwner, { kind: 'software-image' }> {
  return { kind: 'software-image', imageId }
}

export function machineClient(env: AppEnv, owner: MachineOwner) {
  return {
    issue: (digest: string) =>
      machineResult(env, owner, (stub) => stub.issueToken(owner, digest)),
    revoke: () => machineResult(env, owner, (stub) => stub.revokeToken(owner)),
    connection: () =>
      machineResult(env, owner, (stub) => stub.connection(owner)),
    runCommand: (command: string, timeoutSeconds: number) =>
      machineResult(env, owner, (stub) =>
        stub.runCommand(owner, command, timeoutSeconds),
      ),
    startCommand: (command: string) =>
      machineResult(env, owner, (stub) => stub.startCommand(owner, command)),
    commandStatus: (
      processId: number,
      stdoutOffset = 0,
      stderrOffset = 0,
      waitForHost = false,
    ) =>
      machineResult(env, owner, (stub) =>
        stub.commandStatus(
          owner,
          processId,
          stdoutOffset,
          stderrOffset,
          waitForHost,
        ),
      ),
    fileInfo: (path: string) =>
      machineResult(env, owner, (stub) => stub.fileInfo(owner, path)),
    readFile: (path: string, maxBytes: number) =>
      machineResult(env, owner, (stub) => stub.readFile(owner, path, maxBytes)),
    openStream: (port: HostStreamPort) =>
      machineResult(env, owner, (stub) => stub.openStream(owner, port), true),
  }
}
export async function issueMachineToken(
  env: AppEnv,
  owner: MachineOwner,
  makeToken = randomToken,
): Promise<string> {
  const token = newMachineToken(env, owner, makeToken)
  await machineClient(env, owner).issue(await hash(token))
  return token
}

export function newMachineToken(
  env: AppEnv,
  owner: MachineOwner,
  makeToken = randomToken,
): string {
  const id = machinesBinding(env).idFromName(machineObjectName(owner))
  return `cndm1.${id.toString()}.${makeToken()}`
}

export async function revokeMachineToken(
  env: AppEnv,
  owner: MachineOwner,
): Promise<void> {
  await machineClient(env, owner).revoke()
}
export async function machineEnvironment(
  env: AppEnv,
  owner: MachineOwner,
  makeToken = randomToken,
): Promise<Record<string, string>> {
  return machineTokenEnvironment(
    env,
    await issueMachineToken(env, owner, makeToken),
  )
}

export function machineTokenEnvironment(
  env: AppEnv,
  token: string,
): Record<string, string> {
  return {
    CONDUCTIVE_MACHINE_ORIGIN: env.MACHINE_ORIGIN ?? '',
    CONDUCTIVE_MACHINE_TOKEN: token,
  }
}
