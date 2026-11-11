import type { WorkspaceStartJob } from './start-types'

export function stepLabel(
  phase: WorkspaceStartJob['phase'],
  branchMode?: 'new' | 'existing',
): string {
  if (branchMode === 'existing' && phase === 'fetch')
    return 'Fetching your branch'
  if (branchMode === 'existing' && phase === 'branch')
    return 'Checking out your branch'
  return phase === 'fetch'
    ? 'Fetching the default branch'
    : phase === 'branch'
      ? 'Creating your branch'
      : 'Applying your startup script'
}
