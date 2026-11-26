import { resumesAtOpen } from '../../src/app/first-start'
import type { AppEnv } from '../env'
import type { WorkspaceController } from '../lifecycle/workspace-controller-types'
import type { WorkspaceRuntime } from '../lifecycle/workspace-runtime'
import { lifecycleDependencies } from '../lifecycle/runtime'
import { workspaceResponse } from '../lifecycle/workspace-response'
import { resumeWorkspace } from '../lifecycle/workspace-resume'
import type { WorkspaceChat } from './backend'
import type { ChatOperation } from './operation'
import type { WatchReceipt } from './session-watch-records'
import { watchAdmission } from './session-watch-admission'
import { watchEnd } from './session-watch-end'

/** Admission and its final live-work check stay in this caller queue turn. */
export async function resumeSessionWatch(
  chat: WorkspaceChat,
  operation: ChatOperation,
  receipt: Extract<WatchReceipt, { state: 'accepted' }>,
  env: AppEnv,
  controller: WorkspaceController,
  now: () => number,
): Promise<Extract<WatchReceipt, { state: 'accepted' }>['resume']> {
  const turnId = await operation.read((view) =>
    view.messageTurn(receipt.messageId),
  )
  const turn = turnId
    ? await operation.read((view) => view.turn(turnId))
    : undefined
  if (!turn || watchEnd(turn.state)) return 'cancelled'
  const admitted = await watchAdmission(
    operation,
    receipt.watch,
    env,
    turn.senderId,
  )
  if (!admitted) return 'cancelled'
  const commands = await operation.read((view) => view.pending())
  if (
    !commands.some(
      (command) =>
        'messageId' in command && command.messageId === receipt.messageId,
    )
  )
    return 'handed-off'
  if (chat.runner.connections.current) {
    await chat.flushRunner()
    return 'handed-off'
  }
  const workspaceId = receipt.watch.caller.workspaceId
  const runtime: WorkspaceRuntime = {
    env,
    dependencies: { ...lifecycleDependencies(), now },
    workspace: () => ({
      ...controller,
      checkTurnToken: (token, recovery) =>
        chat.turnTokens.check(workspaceId, token, recovery),
    }),
  }
  const detail = await workspaceResponse(
    runtime,
    receipt.watch.orgId,
    workspaceId,
  )
  if (resumesAtOpen(detail)) {
    await resumeWorkspace(
      runtime,
      receipt.watch.orgId,
      workspaceId,
      turn.senderId,
    )
    return 'handed-off'
  }
  if (detail.workspace.state === 'starting') return 'handed-off'
  return 'waiting'
}
