import { cleanupBusy } from './cleanup-lease'

export interface LifecycleOwnership {
  readonly orgId: string
  readonly generation: number
  /** Call while making progress. A closed or expired call cannot renew. */
  renew(): Promise<void>
}

export interface LifecycleFence {
  orgId: string
  generation: number
}

/** The receiver calls this inside its atomic storage transaction, with no await between check and change. */
export function applyLifecycleMutation(
  fence: LifecycleFence,
  ownership: Pick<LifecycleOwnership, 'orgId' | 'generation'>,
  change: () => undefined,
): void {
  if (
    fence.orgId !== ownership.orgId ||
    ownership.generation < fence.generation
  )
    throw cleanupBusy()
  fence.generation = ownership.generation
  change()
}
