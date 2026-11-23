import { filterRepositoryChangeResponse } from '../../src/shared/output-fields'
import { OutputSanitizer } from '../../src/shared/output-sanitizer'
import type { ChangeRepositoryResponse } from '../../src/shared/workspaces'
import type { AppEnv } from '../env'
import type { FeatureResult } from '../features/result'
import { runningOutputSecrets } from './output-secrets'

export async function labelRepositoryChangeResult(
  env: AppEnv,
  workspace: { id: string; orgId: string },
  result: FeatureResult<ChangeRepositoryResponse>,
): Promise<FeatureResult<ChangeRepositoryResponse>> {
  if (
    result.ok
      ? result.value.state !== 'confirmation-required'
      : result.error.code !== 'workspace_repository_change_failed'
  )
    return result
  const output = new OutputSanitizer()
  for (const secret of await runningOutputSecrets(env, workspace))
    output.add(secret)
  const labels = (value: string) => output.text(value)
  return result.ok
    ? { ok: true, value: filterRepositoryChangeResponse(result.value, labels) }
    : {
        ok: false,
        error: { ...result.error, message: labels(result.error.message) },
      }
}
