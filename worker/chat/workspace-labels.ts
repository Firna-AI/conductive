import { OutputSanitizer } from '../../src/shared/output-sanitizer'
import type { AppEnv } from '../env'
import { runningOutputSecrets } from '../lifecycle/output-secrets'
import {
  WorkspaceEventLabelPreparation,
  WorkspaceEventLabels,
} from './workspace-event-labels'
import { workspaceOutputIdentity } from './workspace-labels-data'

async function readWorkspaceEventLabels(
  env: AppEnv,
  workspace: { id: string; orgId: string },
): Promise<WorkspaceEventLabels> {
  const output = new OutputSanitizer()
  for (const secret of await runningOutputSecrets(env, workspace))
    output.add(secret)
  return new WorkspaceEventLabels((value) => output.text(value))
}

export function prepareWorkspaceEventLabels(
  env: AppEnv,
  workspace: { id: string; orgId: string },
): WorkspaceEventLabelPreparation {
  return new WorkspaceEventLabelPreparation(() =>
    readWorkspaceEventLabels(env, workspace),
  )
}

export async function storedWorkspaceEventLabels(
  env: AppEnv,
  workspaceId: string,
): Promise<WorkspaceEventLabels> {
  const workspace = await workspaceOutputIdentity(env.DB, workspaceId)
  return workspace
    ? readWorkspaceEventLabels(env, workspace)
    : new WorkspaceEventLabels((value) => value)
}
