import type { RestartWorkspaceResponse } from '../../src/shared/workspaces'
import {
  requireActiveOrg,
  requireActiveWorkspaceOwner,
} from '../data/user-access'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { orgProviderForAccount } from '../sandbox/client'
import type { SandboxProvider } from '../sandbox/provider'
import { requireOrgMember } from './access'
import { continueBusy } from './continue-admission'
import { pendingContinue, type ContinueOptions } from './continue-types'
import {
  failedRestartLifecycle,
  restartingLifecycle,
  workspaceNotRunning,
} from './durable-restart'
import type { WorkspaceController } from './workspace-controller-types'
import { readWorkspace } from './workspace-data'

/** Begin shows Starting. Fail ends a restart that did not run. */
export type RestartStep = 'begin' | 'fail'

/**
 * Download the newest release with the unit of the hourly check, so that
 * the two never run at once. The download goes on in the background after
 * the limit, and the restart applies only a complete download.
 */
export const UPDATE_CHECK_COMMAND =
  'sudo -n -- timeout 60 systemctl start conductive-update-check.service'

/**
 * Restart the runner under the lock of each start. Its pre-start step
 * applies a complete download, and that apply restarts the relay. The relay
 * restarts again here, so that a relay with no new release restarts too. A
 * sandbox without the relay unit still restarts its runner.
 */
export const RESTART_COMMAND = `set -eu
sudo -n -- flock /run/conductive/bootstrap-activate.lock systemctl restart conductive-runner.service
sudo -n -- systemctl restart conductive-preview-relay.service || echo 'conductive: the preview relay did not restart' >&2`

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
  step: RestartStep,
  now: number,
): Promise<void> {
  const { controller } = workspace
  if (step === 'fail')
    return controller.changeLifecycle((state) => failedRestartLifecycle(state))
  if (await pendingContinue(workspace.storage)) throw continueBusy()
  await controller.changeLifecycle((state) =>
    restartingLifecycle(state, workspaceId, now),
  )
}

async function checkForUpdates(
  provider: SandboxProvider,
  sandboxId: string,
): Promise<RestartWorkspaceResponse['updateCheck']> {
  try {
    const result = await provider.runCommand(sandboxId, UPDATE_CHECK_COMMAND)
    return result.exitCode === 0 && !result.timedOut ? 'ok' : 'failed'
  } catch {
    return 'failed'
  }
}

/**
 * Restart of a running workspace by a member: the checks of a resume, then
 * Starting, the update check, and the restart of the runner and the relay.
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
  if (row.archivedAt !== null || !row.sandboxId) throw workspaceNotRunning()
  await requireActiveWorkspaceOwner(env.DB, row.ownerUserId, orgId)
  const provider = await orgProviderForAccount(
    env,
    userId,
    orgId,
    input.dependencies.fetch,
    row.providerAccount,
  )
  await input.step('begin')
  const updateCheck = await checkForUpdates(provider, row.sandboxId)
  const restarted = await provider
    .runCommand(row.sandboxId, RESTART_COMMAND)
    .then(
      (result) => result.exitCode === 0 && !result.timedOut,
      () => false,
    )
  if (!restarted) {
    await input.step('fail')
    throw restartFailed()
  }
  return { updateCheck }
}
