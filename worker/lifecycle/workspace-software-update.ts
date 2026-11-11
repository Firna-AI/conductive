import { runnerSoftware } from '../configuration'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import type { CommandStatus } from '../sandbox/provider'
import { softwareVersion } from '../software-image/version'
import type { ImageSoftwareArtifact } from './image-software'
import { workspaceSoftwareUpdateCommand } from './start-software-command'
import {
  recordWorkspaceSoftwareUpdateFailed,
  recordWorkspaceSoftwareVersion,
  workspaceSoftwareIsOlder,
} from './workspace-software-data'
import { WorkspaceStartError } from './workspace-start'

export type WorkspaceSoftwareUpdate =
  | { kind: 'unavailable' }
  | {
      kind: 'available'
      artifact: ImageSoftwareArtifact
      version: string
      command: string
    }

type SoftwareUpdateOutcome = 'completed' | 'failed'

export async function prepareWorkspaceSoftwareUpdate(
  env: AppEnv,
  orgId: string,
  workspaceId: string,
): Promise<WorkspaceSoftwareUpdate | null> {
  let artifact
  try {
    artifact = runnerSoftware(env)
  } catch (error) {
    if (
      !(error instanceof HttpError) ||
      error.code !== 'runner_software_unavailable'
    )
      throw error
    return { kind: 'unavailable' }
  }
  const version = await softwareVersion(artifact)
  if (!(await workspaceSoftwareIsOlder(env.DB, orgId, workspaceId, version)))
    return null
  return {
    kind: 'available',
    artifact,
    version,
    command: workspaceSoftwareUpdateCommand(artifact),
  }
}

export function softwareUpdateOutcome(
  status: Pick<CommandStatus, 'state' | 'exitCode' | 'timedOut'>,
): SoftwareUpdateOutcome {
  if (
    status.state !== 'exited' ||
    status.timedOut ||
    status.exitCode === null ||
    status.exitCode === 125 ||
    status.exitCode >= 128
  )
    throw new WorkspaceStartError(null)
  return status.exitCode === 0 ? 'completed' : 'failed'
}

export async function recordSoftwareUpdateOutcome(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  update: WorkspaceSoftwareUpdate,
  outcome: SoftwareUpdateOutcome,
): Promise<void> {
  if (outcome === 'completed' && update.kind === 'available')
    await recordWorkspaceSoftwareVersion(db, orgId, workspaceId, update.version)
  else await recordWorkspaceSoftwareUpdateFailed(db, orgId, workspaceId, true)
}
