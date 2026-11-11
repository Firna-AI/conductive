import type { RunnerBranches } from '../../src/shared/runner'
import type { BuiltInstructions } from './instruction-state'
import { agentInstructions, type WorkspaceContext } from './instructions'

export function runnerInstructions(
  options: WorkspaceContext,
  branches?: RunnerBranches,
): BuiltInstructions {
  return {
    text: agentInstructions({
      ...options,
      ...(branches
        ? {
            workspaceBranch: branches.workspaceBranch,
            defaultBranch: branches.targetBranch,
          }
        : {}),
    }),
    branches:
      branches ??
      (options.workspaceBranch
        ? {
            workspaceBranch: options.workspaceBranch,
            targetBranch: options.defaultBranch,
          }
        : null),
  }
}
