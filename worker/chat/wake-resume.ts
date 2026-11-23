import { resumesAtOpen } from '../../src/app/first-start'
import type { AppEnv } from '../env'
import type { WorkspaceController } from '../lifecycle/workspace-controller-types'
import type { WorkspaceRuntime } from '../lifecycle/workspace-runtime'
import { lifecycleDependencies } from '../lifecycle/runtime'
import { workspaceResponse } from '../lifecycle/workspace-response'
import { resumeWorkspace } from '../lifecycle/workspace-resume'
import type { WorkspaceChat } from './backend'
import type { ChatOperation } from './operation'
import { watchEnd } from './session-watch-end'

/** Follow the message if an unanswered command moved to a new turn. */
export async function resumeWakeDelivery(
  chat: WorkspaceChat,
  operation: ChatOperation,
  delivery: { messageId: string; orgId: string },
  authorize: (senderId: string) => Promise<boolean>,
  env: AppEnv,
  controller: WorkspaceController,
  now: () => number,
): Promise<'cancelled' | 'handed-off' | 'waiting'> {
  const turnId = await operation.read((view) =>
    view.messageTurn(delivery.messageId),
  )
  const turn = turnId
    ? await operation.read((view) => view.turn(turnId))
    : undefined
  if (!turn || watchEnd(turn.state)) return 'cancelled'
  if (!(await authorize(turn.senderId))) return 'cancelled'
  const commands = await operation.read((view) => view.pending())
  if (
    !commands.some(
      (command) =>
        'messageId' in command && command.messageId === delivery.messageId,
    )
  )
    return 'handed-off'
  if (chat.runner.connections.current) {
    await chat.flushRunner()
    return 'handed-off'
  }
  const workspaceId = operation.workspaceId
  const runtime: WorkspaceRuntime = {
    env,
    dependencies: { ...lifecycleDependencies(), now },
    workspace: () => ({
      ...controller,
      checkTurnToken: (token, recovery) =>
        chat.turnTokens.check(workspaceId, token, recovery),
    }),
  }
  const detail = await workspaceResponse(runtime, delivery.orgId, workspaceId)
  if (resumesAtOpen(detail)) {
    await resumeWorkspace(runtime, delivery.orgId, workspaceId, turn.senderId)
    return 'handed-off'
  }
  if (detail.workspace.state === 'starting') return 'handed-off'
  return 'waiting'
}
