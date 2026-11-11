import type { WorkspaceStartJob } from './start-types'

export function stepLabel(phase: WorkspaceStartJob['phase']): string {
  return phase === 'software'
    ? 'Updating the agent and terminal software'
    : phase === 'fetch'
      ? 'Fetching the default branch'
      : phase === 'branch'
        ? 'Creating your branch'
        : 'Applying your startup script'
}
