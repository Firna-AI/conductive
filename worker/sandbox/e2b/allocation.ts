import type { Sandbox, SandboxStart } from '../provider'
import { ProviderError } from '../errors'
import type { E2bContext } from './context'
import {
  claimCreate,
  completeCreateStatement,
  readCreate,
  rejectCreate,
} from './create-data'
import {
  definitiveFailure,
  preflightRefusal,
  invalidResponse,
  pendingOperation,
  replayRejection,
} from './errors'
import { inventoryMatch } from './inventory'
import { readAccess, sandboxMatch } from './parsers'
import { readSnapshotRecord } from './snapshot-data'
import { saveTrafficToken, trafficToken } from './traffic-tokens'
import { getSandbox } from './lifecycle'

async function recoverCreate(
  context: E2bContext,
  input: SandboxStart,
): Promise<Sandbox> {
  const row = await readCreate(
    context.db,
    context.accountId,
    input.idempotencyKey,
  )
  if (!row) return invalidResponse()
  if (row.state === 'rejected' && preflightRefusal(row.rejectionStatus))
    return replayRejection(row)
  if (row.state === 'deleted') throw new ProviderError('not_found', 404)
  const metadata = new URLSearchParams({
    conductive_account: context.accountId,
    conductive_request: input.idempotencyKey,
  })
  const id =
    row.sandboxId ??
    (await inventoryMatch(
      context.control,
      'listSandboxes',
      new URLSearchParams({
        metadata: metadata.toString(),
        state: 'running,paused',
      }),
      (value) => sandboxMatch(value, input.idempotencyKey, context.accountId),
    ))
  if (!id) return pendingOperation()
  const sandbox = await getSandbox(context, id)
  if (sandbox.state !== 'ready') {
    await context.db.batch([
      completeCreateStatement(
        context.db,
        context.accountId,
        input.idempotencyKey,
        id,
      ),
    ])
    return sandbox
  }
  if (row.state === 'ready' && (await trafficToken(context, id))) return sandbox
  const reply = await context.control.request(
    { operation: 'connect', sandboxId: id },
    { body: { timeout: input.ttlSeconds, memory: false } },
  )
  const access = readAccess(reply.value, id)
  await saveTrafficToken(context, id, access.trafficToken, input.idempotencyKey)
  return { id, state: 'ready' }
}

export async function createSandbox(
  context: E2bContext,
  input: SandboxStart,
): Promise<Sandbox> {
  const previous = await readCreate(
    context.db,
    context.accountId,
    input.idempotencyKey,
  )
  if (previous && previous.state !== 'retryable')
    return recoverCreate(context, input)
  let template = context.templateId
  if (input.snapshotName) {
    const snapshot = await readSnapshotRecord(
      context.db,
      context.accountId,
      input.snapshotName,
    )
    if (!snapshot || snapshot.state === 'deleted')
      throw new ProviderError('not_found', 404)
    if (snapshot.state !== 'ready' || !snapshot.snapshotId)
      return pendingOperation()
    template = snapshot.snapshotId
  }
  if (!(await claimCreate(context.db, context.accountId, input.idempotencyKey)))
    return recoverCreate(context, input)
  let access: ReturnType<typeof readAccess>
  try {
    const reply = await context.control.request(
      { operation: 'create' },
      {
        body: {
          templateID: template,
          timeout: input.ttlSeconds,
          autoPause: true,
          autoPauseMemory: false,
          autoResume: { enabled: false },
          network: { allowPublicTraffic: false },
          metadata: {
            ...input.labels,
            conductive_account: context.accountId,
            conductive_request: input.idempotencyKey,
            ...(input.name === undefined
              ? {}
              : { conductive_name: input.name }),
          },
        },
      },
    )
    access = readAccess(reply.value)
  } catch (error) {
    if (definitiveFailure(error))
      await rejectCreate(
        context.db,
        context.accountId,
        input.idempotencyKey,
        error,
        error.retryable,
      )
    else if (error instanceof ProviderError && error.kind === 'unavailable')
      return recoverCreate(context, input)
    throw error
  }
  await saveTrafficToken(
    context,
    access.sandboxId,
    access.trafficToken,
    input.idempotencyKey,
  )
  return { id: access.sandboxId, state: 'ready' }
}
