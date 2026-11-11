import type { LifecyclePublisher } from '../lifecycle/durable-types'
import type { ChatCallbackPublisher, ChatDependencies } from './types'

export function callbackPublisher(
  publish: ChatCallbackPublisher,
): LifecyclePublisher {
  return ({ event, occurredAt }) => publish(event, occurredAt)
}

type WorkspaceCallbacks = Pick<
  ChatDependencies,
  | 'runnerEventStored'
  | 'runnerReady'
  | 'runnerDisconnected'
  | 'turnDispatching'
  | 'turnDispatchFailed'
  | 'turnEnded'
  | 'receiveFileResult'
>

export type WorkspaceCallbackObservers = {
  [K in keyof WorkspaceCallbacks]?: (
    ...args: Parameters<WorkspaceCallbacks[K]>
  ) => Promise<unknown>
}

function observed<Args extends unknown[], Result>(
  callback: (...args: Args) => Promise<Result>,
  observer: ((...args: Args) => Promise<unknown>) | undefined,
): (...args: Args) => Promise<Result> {
  if (!observer) return callback
  return async (...args) => {
    const result = await callback(...args)
    await observer(...args)
    return result
  }
}

/** Observers run after the real callback succeeds and cannot replace its result. */
export function observeWorkspaceCallbacks(
  callbacks: WorkspaceCallbacks,
  observers: WorkspaceCallbackObservers | undefined,
): WorkspaceCallbacks {
  if (!observers) return callbacks
  return {
    runnerEventStored: observed(
      callbacks.runnerEventStored,
      observers.runnerEventStored,
    ),
    runnerReady: observed(callbacks.runnerReady, observers.runnerReady),
    runnerDisconnected: observed(
      callbacks.runnerDisconnected,
      observers.runnerDisconnected,
    ),
    turnDispatching: observed(
      callbacks.turnDispatching,
      observers.turnDispatching,
    ),
    turnDispatchFailed: observed(
      callbacks.turnDispatchFailed,
      observers.turnDispatchFailed,
    ),
    turnEnded: observed(callbacks.turnEnded, observers.turnEnded),
    receiveFileResult: observed(
      callbacks.receiveFileResult,
      observers.receiveFileResult,
    ),
  }
}
