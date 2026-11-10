import type { WorkspaceChat } from '../chat/backend'
import type { WorkspaceErrorReporting } from '../error-reporting/workspace'
import type { WorkspaceController } from './workspace-controller-types'
import type { InputActivityOwner } from './input-activity-owner'
import type { ReceiverStorage } from '../members/receiver-storage'
import { nativeWorkspaceStorage } from './platform-storage'
import { readEncryptedStartLog } from './start-storage'

type WithGeneration = <R>(work: () => Promise<R>) => Promise<R>

export function readWorkspaceLog(storage: ReceiverStorage) {
  return readEncryptedStartLog(nativeWorkspaceStorage(storage))
}

export function runWorkspaceLifecycle<T>(
  chat: WorkspaceChat,
  withGeneration: WithGeneration,
  reporting: WorkspaceErrorReporting,
  work: () => Promise<T>,
): Promise<T> {
  return reporting.run(() =>
    chat.runLifecycle(() =>
      withGeneration(async () => {
        const result = await work()
        await chat.flushRunner()
        return result
      }),
    ),
  )
}

export function recordWorkspaceActivity(
  chat: WorkspaceChat,
  withGeneration: WithGeneration,
  controller: WorkspaceController,
  activity: Pick<InputActivityOwner, 'record'>,
  at: number,
) {
  return chat.runLifecycle(() =>
    withGeneration(async () => {
      const state = await controller.readLifecycle()
      const result = await controller.lifecycleActivity(true)
      if (result.ok && state) activity.record(state.workspaceId, at)
      return result
    }),
  )
}
