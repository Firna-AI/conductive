import { ProviderError } from '../sandbox/errors'
import type { ArchiveContext } from './archive-context'
import type { ArchiveResource } from './archive-data'
import { detachArchiveDisk } from './archive-data'
import { ARCHIVE_STATE_KEY, type WorkspaceArchiveState } from './archive-types'

export async function clearMissingArchiveDisk(
  context: ArchiveContext,
  state: WorkspaceArchiveState,
  row: ArchiveResource,
  error: unknown,
): Promise<boolean> {
  if (
    !state.sandboxId ||
    !(error instanceof ProviderError) ||
    error.kind !== 'not_found'
  )
    return false
  if (
    await detachArchiveDisk(
      context.env.DB,
      { ...row, sandboxId: state.sandboxId },
      context.dependencies.now(),
    )
  ) {
    await context.storage.put('archive', ARCHIVE_STATE_KEY, {
      ...state,
      sandboxId: null,
      allocation: undefined,
      phase: 'purge',
    })
  } else await context.storage.delete(ARCHIVE_STATE_KEY)
  return true
}
