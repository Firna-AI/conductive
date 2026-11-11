import { AttachmentWorkspace } from '../chat/attachment-workspace'
import type {
  WorkspaceCompositionEnv,
  WorkspaceChatResolvers,
} from '../chat/workspace-integration'
import type { ConnectionScheduler } from '../security/connection-access'
import type { ImportStorageScope } from '../../src/shared/conductor-import-storage.ts'
import { ImportRuntime } from './runtime'

export class ImportWorkspace extends AttachmentWorkspace {
  protected readonly imports: ImportRuntime

  constructor(
    context: DurableObjectState,
    env: WorkspaceCompositionEnv,
    now: () => number = Date.now,
    resolvers: WorkspaceChatResolvers = {},
    activitySchedule?: ConnectionScheduler,
  ) {
    super(context, env, now, resolvers, activitySchedule)
    this.imports = new ImportRuntime(context, env, now)
  }

  conductorImportOperation(target: string, input: unknown) {
    return this.imports.operation(target, input)
  }

  cleanupConductorImport(scope: ImportStorageScope, group?: 'work' | 'all') {
    return this.imports.cleanup(scope, group)
  }
}
