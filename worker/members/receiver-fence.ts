import { cleanupBusy } from './cleanup-lease'
import {
  applyLifecycleMutation,
  type LifecycleFence,
  type LifecycleOwnership,
} from './lifecycle-contract'

export const LIFECYCLE_FENCE_KEY = 'members:lifecycle-fence'

export interface ReceiverFence extends LifecycleFence {
  mode: 'active' | 'suspended' | 'purged'
}

export async function assertReceiverActive(
  storage: Pick<DurableObjectStorage, 'get'>,
  generation?: number,
): Promise<void> {
  const fence = await storage.get<ReceiverFence>(LIFECYCLE_FENCE_KEY)
  if (
    (fence && fence.mode !== 'active') ||
    (generation !== undefined && (fence?.generation ?? 0) !== generation)
  )
    throw cleanupBusy()
}

export async function mutateReceiver(
  storage: DurableObjectStorage,
  ownership: Pick<LifecycleOwnership, 'orgId' | 'generation'>,
  mode: ReceiverFence['mode'],
  change: (transaction: DurableObjectTransaction) => Promise<void>,
): Promise<void> {
  await storage.transaction(async (transaction) => {
    const fence = (await transaction.get<ReceiverFence>(
      LIFECYCLE_FENCE_KEY,
    )) ?? {
      orgId: ownership.orgId,
      generation: 0,
      mode,
    }
    applyLifecycleMutation(fence, ownership, () => {
      fence.mode = mode
    })
    await change(transaction)
    await transaction.put(LIFECYCLE_FENCE_KEY, fence)
  })
}

export async function purgeReceiverPayload(
  storage: DurableObjectStorage,
  ownership: Pick<LifecycleOwnership, 'orgId' | 'generation'>,
): Promise<void> {
  let after: string | undefined
  while (true) {
    // list loads values too. Each batch stays small and checks the current fence.
    const keys = [
      ...(await storage.list({ startAfter: after, limit: 16 })).keys(),
    ]
    await mutateReceiver(storage, ownership, 'purged', async (transaction) => {
      for (const key of keys) {
        if (key !== LIFECYCLE_FENCE_KEY) await transaction.delete(key)
      }
      await transaction.deleteAlarm()
    })
    if (keys.length < 16) return
    after = keys.at(-1)
  }
}
