import type { AppDependencies, AppEnv } from '../env'
import { assertReceiverActive } from '../members/receiver-fence'
import type { ReceiverStorage } from '../members/receiver-storage'
import { sandboxProvider } from '../sandbox/client'
import type { LifecycleReconciliation } from './durable-types'
import {
  readInputActivityTarget,
  writeWorkspaceActivity,
} from './input-activity-data'
import type { LifecycleActivitySnapshot } from './input-activity-state'
import { providerState } from './provider-state'
import { replyOrCurrentState } from './workspace-actions'

export interface CapturedInputActivity {
  generation: number
  lifecycle: LifecycleActivitySnapshot | undefined
}

export function inputActivityUpdate(options: {
  env: AppEnv
  dependencies: AppDependencies
  storage: ReceiverStorage
  capture(at: number): Promise<CapturedInputActivity>
  extendDeadline(
    operation: () => Promise<LifecycleReconciliation>,
  ): Promise<LifecycleReconciliation | void>
  reconcile(
    captured: CapturedInputActivity,
    sandboxId: string,
    remote: LifecycleReconciliation,
  ): Promise<void>
}) {
  return async (workspaceId: string, at: number): Promise<void> => {
    const captured = await options.capture(at)
    await assertReceiverActive(options.storage, captured.generation)
    const target = await readInputActivityTarget(options.env.DB, workspaceId)
    if (!target || target.generation !== captured.generation) return
    if (
      !(await writeWorkspaceActivity(
        options.env.DB,
        workspaceId,
        at,
        target.sandboxId,
        captured.generation,
      ))
    )
      return
    await assertReceiverActive(options.storage, captured.generation)
    if (!captured.lifecycle) return
    const provider = sandboxProvider(options.env, async (request) => {
      await assertReceiverActive(options.storage, captured.generation)
      const current = await readInputActivityTarget(options.env.DB, workspaceId)
      if (
        current?.sandboxId !== target.sandboxId ||
        current.generation !== captured.generation
      )
        return new Response(null, { status: 404 })
      const response = await options.dependencies.fetch(request)
      await assertReceiverActive(options.storage, captured.generation)
      return response
    })
    const remote = await options.extendDeadline(async () => {
      const sandbox = await replyOrCurrentState(
        provider,
        target.sandboxId,
        () => provider.setAutoStop(target.sandboxId, 1_860),
      )
      const state = providerState(sandbox.state)
      return state === 'stopped' || state === 'error' ? state : undefined
    })
    if (remote) {
      const current = await readInputActivityTarget(options.env.DB, workspaceId)
      if (
        current?.sandboxId === target.sandboxId &&
        current.generation === captured.generation
      )
        await options.reconcile(captured, target.sandboxId, remote)
    }
  }
}
