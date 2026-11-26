import type { AppDependencies, AppEnv } from '../env'
import type { WorkspaceChat } from '../chat/backend'
import type { QueueTurn } from '../chat/queue-turn'
import { assertReceiverActive } from '../members/receiver-fence'
import { verifyTarget } from '../previews/access'
import type { WorkspaceTarget } from '../previews/types'
import type { ReceiverStorage } from '../members/receiver-storage'
import {
  canRestartLifecycle,
  failedRestartLifecycle,
  restartDeadline,
  restartingLifecycle,
  workspaceNotRunning,
} from './durable-restart'
import { providerState } from './provider-state'
import { pendingWorkspaceChange } from './repository-change-types'
import {
  refreshAfterRestart,
  RESTART_COMMAND,
  runSoftwareRestart,
} from './software-restart'
import { START_JOB_KEY } from './start-storage'
import { actionResources } from './workspace-actions'
import type { WorkspaceController } from './workspace-controller-types'

const RUNNER_AWAY_MS = 3 * 60_000
const MESSAGE_WAIT_MS = 60_000

export type DispatchAutomaticRestart = (work: () => Promise<void>) => void

export function createAutomaticRestart(input: {
  env: AppEnv
  dependencies: AppDependencies
  storage: ReceiverStorage
  controller: WorkspaceController
  chat: WorkspaceChat
  run<T>(work: (turn: QueueTurn) => Promise<T>): Promise<T>
  refreshTerminal(target: WorkspaceTarget): Promise<void>
}) {
  const { env, dependencies, storage, controller, chat, run } = input
  const now = dependencies.now
  const busy = async () =>
    (await pendingWorkspaceChange(storage)) ||
    Boolean(await storage.get(START_JOB_KEY))

  return async (dispatch: DispatchAutomaticRestart): Promise<void> => {
    const state = await controller.readLifecycle()
    if (
      !state ||
      !canRestartLifecycle(state) ||
      state.runnerConnected ||
      state.runnerDisconnectedAt === undefined ||
      state.runnerDisconnectedAt + RUNNER_AWAY_MS > now() ||
      state.automaticRestartAt !== undefined ||
      (await busy())
    )
      return

    const { orgId, workspaceId } = state
    const waitingAt = await chat.store.read(workspaceId, (view) =>
      view.oldestWaitingMessageAt(),
    )
    if (waitingAt === undefined || waitingAt + MESSAGE_WAIT_MS > now()) return
    const { provider, sandboxId, row } = await actionResources({
      env,
      dependencies,
      orgId,
      workspaceId,
    })
    if (
      row.archivedAt !== null ||
      providerState((await provider.get(sandboxId)).state) !== 'ready'
    )
      return
    const target = {
      workspaceId,
      orgId,
      sandboxId,
      providerAccount: row.providerAccount,
      state: row.state,
    }
    await verifyTarget(env, target, undefined, false)
    const at = now()
    await controller.changeLifecycle((current) => ({
      ...restartingLifecycle(current, workspaceId, at),
      automaticRestartAt: at,
      automaticRestartSubmitted: undefined,
    }))

    const currentRestart = async () => {
      const current = await controller.readLifecycle()
      if (
        current?.automaticRestartAt === at &&
        current.softwareRestartAt === at &&
        current.state === 'starting'
      )
        return current
    }
    const requireCurrentRestart = async () => {
      const current = await currentRestart()
      if (!current || (restartDeadline(current) ?? 0) <= now())
        throw workspaceNotRunning()
      return current
    }
    const verifyRestartTarget = async () => {
      if (!(await currentRestart())) throw workspaceNotRunning()
      await assertReceiverActive(storage)
      await verifyTarget(env, target, undefined, false)
    }
    dispatch(async () => {
      const restarted = await run(async (turn) => {
        try {
          await runSoftwareRestart(async (command) => {
            await requireCurrentRestart()
            if (await busy()) throw workspaceNotRunning()
            if (command === RESTART_COMMAND) {
              await turn.outside(verifyRestartTarget)
              const current = await requireCurrentRestart()
              await controller.changeLifecycle((state) => ({
                ...state,
                automaticRestartSubmitted: true,
              }))
              if (current.runningSessions.length)
                await chat.stopTurnsForRestart(workspaceId)
              return turn.outside(() => provider.runCommand(sandboxId, command))
            }
            return turn.outside(async () => {
              await verifyRestartTarget()
              return provider.runCommand(sandboxId, command)
            })
          })
          return true
        } catch {
          if (await currentRestart())
            await controller.changeLifecycle(failedRestartLifecycle)
          return false
        }
      })
      if (restarted) await refreshAfterRestart(target, input.refreshTerminal)
    })
  }
}
