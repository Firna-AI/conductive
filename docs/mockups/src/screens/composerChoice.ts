import { noFastChoice, type AgentChoice } from '../fixtures/agents'
import type { Workspace } from '../fixtures/workspaces'
import type { WorkspaceState } from './workspaceState'

/**
 * The model, the effort, and the speed of the next message of a state: those
 * of the workspace, the same with fast mode on, a model that offers no fast
 * mode, or the model of the workspace at Max.
 */
export function choiceOf(
  state: WorkspaceState,
  workspace: Workspace,
): AgentChoice {
  switch (state.modelChoice) {
    case 'workspace':
      return workspace.choice
    case 'fast':
      return { ...workspace.choice, fast: true }
    case 'no-fast':
      return noFastChoice
    case 'max':
      return { ...workspace.choice, effort: 'max' }
  }
}
