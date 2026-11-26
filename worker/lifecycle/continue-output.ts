import { filterContinueResponse } from '../../src/shared/output-fields'
import { OutputSanitizer } from '../../src/shared/output-sanitizer'
import type { ContinueWorkspaceResponse } from '../../src/shared/workspaces'
import type { AppEnv } from '../env'
import type { FeatureResult } from '../features/result'
import { runningOutputSecrets } from './output-secrets'

type ContinueLabels = (value: string) => string

async function continueLabels(
  env: AppEnv,
  workspace: { id: string; orgId: string },
): Promise<ContinueLabels> {
  const output = new OutputSanitizer()
  for (const secret of await runningOutputSecrets(env, workspace))
    output.add(secret)
  return (value) => output.text(value)
}

export async function labelContinueResult(
  env: AppEnv,
  workspace: { id: string; orgId: string },
  result: FeatureResult<ContinueWorkspaceResponse>,
): Promise<FeatureResult<ContinueWorkspaceResponse>> {
  if (
    result.ok
      ? result.value.state !== 'confirmation-required'
      : result.error.code !== 'workspace_continue_failed'
  )
    return result
  const labels = await continueLabels(env, workspace)
  return result.ok
    ? { ok: true, value: filterContinueResponse(result.value, labels) }
    : {
        ok: false,
        error: { ...result.error, message: labels(result.error.message) },
      }
}
