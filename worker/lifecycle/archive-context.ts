import type { AppDependencies, AppEnv } from '../env'
import type { DurableLifecycle } from './durable'
import type { WorkspaceStorage } from './platform-storage'
import type { WorkspaceStartCoordinator } from './start-coordinator'
import type { StartJobStorage } from './start-types'
import type { WorkspacePlatform } from './workspace-platform'
import type { WorkspaceAlarms } from '../features/alarms'
import { taskWorkspaceStorage } from './workspace-task-alarms'

export interface ArchiveContext {
  env: AppEnv
  dependencies: AppDependencies
  storage: WorkspaceStorage
  lifecycle: DurableLifecycle
  starts: WorkspaceStartCoordinator
  startJobs: StartJobStorage
  publish: WorkspacePlatform['publish']
  stopped: WorkspacePlatform['stopped']
  hasOutsideTurns: WorkspacePlatform['hasOutsideTurns']
  alarms: WorkspaceAlarms
}

export function workspaceArchivePlatform(
  platform: WorkspacePlatform,
): Pick<ArchiveContext, 'storage' | 'publish' | 'stopped' | 'hasOutsideTurns'> {
  return {
    storage: taskWorkspaceStorage(platform.storage, 'lifecycle:archive'),
    publish: platform.publish,
    stopped: platform.stopped,
    hasOutsideTurns: platform.hasOutsideTurns,
  }
}
