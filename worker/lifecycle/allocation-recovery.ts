import { ProviderAllocationAbsent } from '../sandbox/errors'
import type { Sandbox, SandboxProvider } from '../sandbox/provider'
import { rejectComputerIntent } from './computer-ledger'
import { createResource, type SandboxResourceIntent } from './resource-intents'

/** Only the provider's explicit no-allocation proof can finish identity recovery without an ID. */
export async function recoverResourceForCleanup(
  db: D1Database,
  provider: SandboxProvider,
  intent: SandboxResourceIntent,
): Promise<Sandbox | null> {
  try {
    return await createResource(db, provider, intent)
  } catch (error) {
    if (!(error instanceof ProviderAllocationAbsent)) throw error
    await rejectComputerIntent(
      db,
      intent.input.idempotencyKey,
      intent.ownership.providerAccount,
    )
    return null
  }
}
