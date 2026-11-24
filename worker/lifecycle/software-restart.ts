import type { RestartWorkspaceResponse } from '../../src/shared/workspaces'
import {
  requireActiveOrg,
  requireActiveWorkspaceOwner,
} from '../data/user-access'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { machineChannel, type CommandResult } from '../machines/channel'
import { workspaceMachineOwner } from '../machines/client'
import { verifyTarget } from '../previews/access'
import { orgProviderForAccount } from '../sandbox/client'
import type { WorkspaceTarget } from '../previews/types'
import { terminalRestartCommand } from '../terminal/support'
import { warnWorker } from '../warnings'
import { requireOrgMember } from './access'
import { continueBusy } from './continue-admission'
import { pendingContinue, type ContinueOptions } from './continue-types'
import {
  pendingRepositoryChange,
  repositoryChangeBusy,
} from './repository-change-types'
import {
  failedRestartLifecycle,
  restartingLifecycle,
  workspaceNotRunning,
} from './durable-restart'
import type { WorkspaceController } from './workspace-controller-types'
import { readWorkspace } from './workspace-data'

/** Refresh uses the sandbox identity captured before the runner restart. */
export type RestartStep = 'begin' | 'fail' | { terminal: WorkspaceTarget }

/**
 * Download the newest release with the unit of the periodic check, so that
 * the two never run at once. The download goes on in the background after
 * the limit, and the restart applies only a complete download.
 */
export const UPDATE_CHECK_COMMAND =
  'sudo -n -- timeout 60 systemctl start conductive-update-check.service'

/**
 * Restart the runner under the lock of each start. Its pre-start step
 * applies a complete download, and that apply restarts the relay. The relay
 * restarts again here, so that a relay with no new release restarts too. A
 * sandbox without the relay unit still restarts its runner. Restart ttyd
 * after the apply, without restarting its separate shell server.
 */
export const RESTART_COMMAND = `set -eu
sudo -n -- flock /run/conductive/bootstrap-activate.lock systemctl restart conductive-runner.service
sudo -n -- systemctl restart conductive-preview-relay.service || echo 'conductive: the preview relay did not restart' >&2
${terminalRestartCommand()}`

function restartFailed(): HttpError {
  return new HttpError(
    502,
    'restart_failed',
    "The software didn't restart. Try again.",
  )
}

/** The serial step of the workspace object, inside its lifecycle queue. */
export async function changeRestart(
  workspace: {
    controller: Pick<WorkspaceController, 'changeLifecycle'>
    storage: ContinueOptions['storage']
  },
  workspaceId: string,
  step: Extract<RestartStep, string>,
  now: number,
): Promise<void> {
  const { controller } = workspace
  if (step === 'fail')
    return controller.changeLifecycle((state) => failedRestartLifecycle(state))
  if (await pendingContinue(workspace.storage)) throw continueBusy()
  if (await pendingRepositoryChange(workspace.storage))
    throw repositoryChangeBusy()
  await controller.changeLifecycle((state) =>
    restartingLifecycle(state, workspaceId, now),
  )
}

async function commandSucceeded(
  run: (command: string) => Promise<CommandResult>,
  command: string,
): Promise<boolean> {
  try {
    const result = await run(command)
    return result.exitCode === 0 && !result.timedOut
  } catch {
    return false
  }
}

export async function runSoftwareRestart(
  run: (command: string) => Promise<CommandResult>,
): Promise<RestartWorkspaceResponse> {
  const checked = await commandSucceeded(run, UPDATE_CHECK_COMMAND)
  if (!(await commandSucceeded(run, RESTART_COMMAND))) throw restartFailed()
  return { updateCheck: checked ? 'ok' : 'failed' }
}

export async function refreshAfterRestart(
  target: WorkspaceTarget,
  refresh: (target: WorkspaceTarget) => Promise<void>,
): Promise<void> {
  try {
    await refresh(target)
  } catch {
    warnWorker({ kind: 'terminal_restart_refresh_failed' })
  }
}

/**
 * Restart of a running workspace by a member: the checks of a resume, then
 * Starting, the update check, and the restart of the runner, relay, and ttyd.
 * A failed restart shows the error state, whose Try again resumes it.
 */
export async function restartWorkspaceSoftware(input: {
  env: AppEnv
  dependencies: Pick<AppDependencies, 'fetch'>
  orgId: string
  workspaceId: string
  userId: string
  step(step: RestartStep): Promise<void>
}): Promise<RestartWorkspaceResponse> {
  const { env, orgId, workspaceId, userId } = input
  await requireActiveOrg(env.DB, orgId)
  await requireOrgMember(env.DB, orgId, userId)
  const row = await readWorkspace(env.DB, orgId, workspaceId)
  const sandboxId = row.sandboxId
  if (row.archivedAt !== null || !sandboxId) throw workspaceNotRunning()
  await requireActiveWorkspaceOwner(env.DB, row.ownerUserId, orgId)
  const provider = await orgProviderForAccount(
    env,
    userId,
    orgId,
    input.dependencies.fetch,
    row.providerAccount,
  )
  const target = {
    orgId,
    workspaceId,
    sandboxId,
    providerAccount: row.providerAccount,
    state: row.state,
  }
  const channel = machineChannel(
    env,
    workspaceMachineOwner(orgId, workspaceId),
    provider,
    sandboxId,
  )
  await input.step('begin')
  let result: RestartWorkspaceResponse
  try {
    result = await runSoftwareRestart(async (command) => {
      await verifyTarget(env, target, userId, false)
      return channel.runCommand(command)
    })
  } catch (error) {
    await input.step('fail')
    throw error
  }
  await refreshAfterRestart(target, (terminal) => input.step({ terminal }))
  return result
}
