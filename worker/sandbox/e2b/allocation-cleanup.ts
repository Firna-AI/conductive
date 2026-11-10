import { ProviderAllocationAbsent } from '../errors'
import type { Sandbox } from '../provider'
import type { E2bContext } from './context'
import {
  completeCreateStatement,
  readCreate,
  retireUnallocatedCreate,
} from './create-data'
import { pendingOperation } from './errors'
import { inventoryMatch } from './inventory'
import { sandboxMatch } from './parsers'

export async function cleanupAllocation(
  context: E2bContext,
  key: string,
): Promise<Sandbox> {
  if (await retireUnallocatedCreate(context.db, context.accountId, key))
    throw new ProviderAllocationAbsent()
  const row = await readCreate(context.db, context.accountId, key)
  if (row?.state === 'deleted') throw new ProviderAllocationAbsent()
  if (row?.sandboxId) return { id: row.sandboxId, state: 'provisioned' }
  const metadata = new URLSearchParams({
    conductive_account: context.accountId,
    conductive_request: key,
  })
  const id = await inventoryMatch(
    context.control,
    'listSandboxes',
    new URLSearchParams({
      metadata: metadata.toString(),
      state: 'running,paused',
    }),
    (value) => sandboxMatch(value, key, context.accountId),
  )
  if (!id) return pendingOperation()
  await context.db.batch([
    completeCreateStatement(context.db, context.accountId, key, id),
  ])
  return { id, state: 'provisioned' }
}
