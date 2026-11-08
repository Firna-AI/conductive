import type { WorkspaceStartJob } from './start-types'

export function stepLabel(phase: WorkspaceStartJob['phase']): string {
  return phase === 'fetch'
    ? 'Fetching the default branch'
    : phase === 'branch'
      ? 'Creating your branch'
      : 'Applying your startup script'
}
