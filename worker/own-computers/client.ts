import type { ComputerOperation } from '../../src/shared/generated/ComputerOperation'
import type { ComputerRelease } from '../../src/shared/generated/ComputerRelease'
import type { ContainerEnvVar } from '../../src/shared/generated/ContainerEnvVar'
import type { AppEnv } from '../env'
import { requireFeatureResult, type FeatureResult } from '../features/result'
import { readComputerAccess } from './connection-data'
import { invalidComputerReply } from './errors'
import {
  computerNamespace,
  computerNotFound,
  computerObjectId,
  type ComputerOwner,
} from './identity'
import type { ComputerSuccess } from './operations'
import type { OwnComputer } from './own-computer'

async function computerResult<T>(
  env: AppEnv,
  owner: ComputerOwner,
  operation: (
    stub: DurableObjectStub<OwnComputer>,
  ) => Promise<FeatureResult<T>>,
  removed = false,
): Promise<T> {
  const record = await readComputerAccess(env.DB, owner)
  if (!record || (record.removedAt !== null) !== removed)
    throw computerNotFound()

  const namespace = computerNamespace(env)
  const stub = namespace.get(computerObjectId(namespace, owner.computerId))
  let call: Promise<FeatureResult<T>> | undefined
  let result: FeatureResult<T> | undefined
  try {
    call = operation(stub)
    result = await call
    return requireFeatureResult(result)
  } finally {
    for (const value of [result, call, stub]) {
      if (!value) continue
      const dispose: unknown = Reflect.get(value, Symbol.dispose)
      if (typeof dispose === 'function') Reflect.apply(dispose, value, [])
    }
  }
}

type SuccessKind = ComputerSuccess['kind']

async function operate<K extends SuccessKind>(
  env: AppEnv,
  owner: ComputerOwner,
  operation: ComputerOperation,
  kind: K,
): Promise<Extract<ComputerSuccess, { kind: K }>>
async function operate(
  env: AppEnv,
  owner: ComputerOwner,
  operation: ComputerOperation,
  kind: SuccessKind,
): Promise<ComputerSuccess> {
  const result = await computerResult(env, owner, (stub) =>
    stub.operate(owner, operation),
  )
  if (result.kind !== kind) throw invalidComputerReply()
  return result
}

type ComputerCreate = Omit<
  Extract<ComputerOperation, { kind: 'container.create' }>,
  'kind'
>

export function ownComputerClient(env: AppEnv, owner: ComputerOwner) {
  return {
    connection: () =>
      computerResult(env, owner, (stub) => stub.connection(owner)),
    create: (input: ComputerCreate) =>
      operate(env, owner, { ...input, kind: 'container.create' }, 'container'),
    get: (container: string) =>
      operate(env, owner, { kind: 'container.get', container }, 'container'),
    start: (container: string, envVars: readonly ContainerEnvVar[]) =>
      operate(
        env,
        owner,
        { kind: 'container.start', container, env: envVars },
        'container',
      ),
    stop: (container: string) =>
      operate(env, owner, { kind: 'container.stop', container }, 'container'),
    delete: (container: string) =>
      operate(
        env,
        owner,
        { kind: 'container.delete', container },
        'container.deleted',
      ),
    saveImage: (container: string, image: string) =>
      operate(
        env,
        owner,
        { kind: 'image.save', container, image },
        'image.saved',
      ),
    bootstrap: (container: string, release: ComputerRelease) =>
      operate(
        env,
        owner,
        { kind: 'container.bootstrap', container, release },
        'container.bootstrapped',
      ),
  }
}

/** Close a revoked connection after a code replacement or removal. */
export function closeRevokedComputerConnection(
  env: AppEnv,
  owner: ComputerOwner,
  removed = false,
) {
  return computerResult(
    env,
    owner,
    (stub) => stub.closeRevokedConnection(owner, removed),
    removed,
  )
}
