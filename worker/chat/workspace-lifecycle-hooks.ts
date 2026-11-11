import type { AppEnv } from '../env'
import type { LifecyclePublisher } from '../lifecycle/durable-types'
import { pendingContinue } from '../lifecycle/continue-types'
import {
  importPreparedForDispatch,
  unfinishedImport,
} from '../lifecycle/import-activation-data'
import type { WorkspaceController } from '../lifecycle/workspace-controller-types'
import {
  LIFECYCLE_FENCE_KEY,
  type ReceiverFence,
} from '../members/receiver-fence'
import type {
  ChatCallbackPublisher,
  ChatDependencies,
  ChatStorage,
} from './types'
import {
  observeWorkspaceCallbacks,
  type WorkspaceCallbackObservers,
} from './workspace-callbacks'
import { projectWorkspaceTitle } from './workspace-title'

export function callbackPublisher(
  publish: ChatCallbackPublisher,
): LifecyclePublisher {
  return ({ event, occurredAt }) => publish(event, occurredAt)
}

export function workspaceLifecycleHooks(
  env: AppEnv,
  storage: ChatStorage,
  now: () => number,
  controller: () => WorkspaceController,
  receiveFileResult: ChatDependencies['receiveFileResult'],
  reconcileDevices: () => Promise<void>,
  waitUntil: (promise: Promise<unknown>) => void,
  observers?: WorkspaceCallbackObservers,
) {
  return {
    receiveImportResult: (
      ...args: Parameters<ChatDependencies['receiveImportResult']>
    ) => controller().receiveImportResult(...args),
    runnerPreparationAllowed: async (id: string) => {
      const state = await controller().readLifecycle()
      return importPreparedForDispatch(
        env.DB,
        id,
        state?.startupPrepared === true &&
          ['ready', 'working', 'unread', 'input'].includes(state.state),
      )
    },
    runnerHello: async (_id: string, publish: ChatCallbackPublisher) =>
      controller().recoverLifecycle(callbackPublisher(publish)),
    ...observeWorkspaceCallbacks(
      {
        turnEnded: async (_id, turnId, publish) => {
          try {
            const fence = await storage.get<ReceiverFence>(LIFECYCLE_FENCE_KEY)
            if (fence && fence.mode !== 'active') return
            await controller().finishLifecycleTurn(
              turnId,
              callbackPublisher(publish),
            )
          } finally {
            waitUntil(reconcileDevices())
          }
        },
        receiveFileResult,
        runnerReady: async (_id, publish) => {
          await controller().reportRunnerLifecycle(
            { type: 'runner.ready' },
            callbackPublisher(publish),
          )
          await controller().acknowledgeLifecycleFirstMessage(
            callbackPublisher(publish),
          )
        },
        runnerDisconnected: async (_id, publish) =>
          controller().runnerLifecycleDisconnected(callbackPublisher(publish)),
        turnDispatching: async (id, turn, publish) => {
          if (await pendingContinue(storage)) return false
          const state = await controller().readLifecycle()
          if (!state) return !(await unfinishedImport(env.DB, id))
          if (!['ready', 'working', 'unread', 'input'].includes(state.state))
            return false
          await controller().registerLifecycleTurn(
            turn,
            callbackPublisher(publish),
          )
          return (await controller().readLifecycle())?.state === 'working'
        },
        turnDispatchFailed: async (_id, turnId, publish) =>
          controller().finishLifecycleTurn(turnId, callbackPublisher(publish)),
        runnerEventStored: async (envelope, publish) => {
          const event = envelope.event
          if (event.type === 'turn.started' || event.type === 'start.updated')
            await controller().reportRunnerLifecycle(
              event,
              callbackPublisher(publish),
            )
          await projectWorkspaceTitle(env.DB, envelope, now())
        },
      },
      observers,
    ),
  }
}
