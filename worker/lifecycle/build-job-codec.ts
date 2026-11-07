import type { BuildJob } from './build-data'
import { parseProviderRetry } from './provider-retry'
import { readSavedScript } from './saved-script'

export type StoredBuildJob = Omit<
  BuildJob,
  'installScript' | 'providerRetry'
> & {
  installScript: string
  providerRetryJson: string | null
}

export function decodeBuildJob(row: StoredBuildJob): BuildJob {
  const { providerRetryJson, ...job } = row
  return {
    ...job,
    installScript: readSavedScript(row.installScript),
    providerRetry: parseProviderRetry(providerRetryJson),
  }
}
