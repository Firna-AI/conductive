import type { configuration } from './config'
import {
  importRuntimeState,
  RUNNER_IMPORT_SERVICE_HOME,
} from './import-bootstrap'
import { Runner, type RunnerOptions } from './runner'
import { DiskStorage, EventStore } from './state'

type RuntimeOptions = Pick<
  RunnerOptions,
  | 'connect'
  | 'providers'
  | 'warm'
  | 'now'
  | 'warn'
  | 'disconnected'
  | 'ports'
  | 'imports'
>

export async function initializeRunner(
  config: ReturnType<typeof configuration>,
  options: RuntimeOptions,
  serviceHome = RUNNER_IMPORT_SERVICE_HOME,
): Promise<Runner> {
  const statePath = await importRuntimeState(
    serviceHome,
    config.workspaceId,
    config.statePath,
  )
  const store = await EventStore.open(new DiskStorage(statePath))
  return new Runner({ ...config, ...options, store, importHome: serviceHome })
}
