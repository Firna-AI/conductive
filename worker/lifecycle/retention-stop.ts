import { captureUnexpectedWorkerFailure } from '../error-reporting/policy'
import type { SandboxProvider } from '../sandbox/provider'
import type { DiskRetentionResult } from './durable-types'
import { providerState, type ProviderState } from './provider-state'
import type { RetentionCommandPort } from './retention-command'
import type { WorkspaceActionContext } from './workspace-actions'
import { revokeWorkspacePreviews } from './workspace-data'

export async function stopRetention(
  context: WorkspaceActionContext,
  provider: SandboxProvider,
  sandboxId: string,
  status: ProviderState,
  error: string | null,
  command: RetentionCommandPort,
): Promise<DiskRetentionResult> {
  try {
    if (status === 'stopping') return { done: false, error }
    if (status !== 'stopped') {
      const state = command.read()
      if (state.stopRequestedAt === undefined)
        await command.save({
          ...state,
          stopRequestedAt: context.dependencies.now(),
        })
      if (providerState((await provider.stop(sandboxId)).state) !== 'stopped')
        return { done: false, error }
    }
    await revokeWorkspacePreviews(
      context.env.DB,
      context.workspaceId,
      context.dependencies.now(),
    )
    return {
      done: true,
      error,
      stoppedAt: command.read().stopRequestedAt ?? null,
      eligible: true,
    }
  } catch (failure) {
    if (error !== null) {
      captureUnexpectedWorkerFailure('lifecycle_retry_failed', failure)
      return { done: false, error }
    }
    throw failure
  }
}
