import type { AppDependencies, AppEnv } from '../env'
import type { DurableLifecycle } from './durable'
import type { WorkspaceStorage } from './platform-storage'
import type { WorkspaceStartCoordinator } from './start-coordinator'
import type { StartJobStorage } from './start-types'
import type { WorkspacePlatform } from './workspace-platform'
import type { WorkspaceAlarms } from '../features/alarms'

export interface ArchiveContext {
  env: AppEnv
  dependencies: AppDependencies
  storage: WorkspaceStorage
  lifecycle: DurableLifecycle
  starts: WorkspaceStartCoordinator
  startJobs: StartJobStorage
  publish: WorkspacePlatform['publish']
  stopped: WorkspacePlatform['stopped']
  alarms: WorkspaceAlarms
}
