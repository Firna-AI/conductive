import type { RunSource } from '../components/workspace/RunLinks'
import { conversations, type ChatItem } from '../fixtures/conversations'
import { freshSessionPrompt } from '../fixtures/terminal'
import { runWorkspaces, type RunWorkspaceKey } from '../fixtures/runWorkspaces'
import type { StartingLog } from '../fixtures/starting'
import {
  openableWorkspaceRecords,
  type Workspace,
} from '../fixtures/workspaces'
import { paths } from '../paths'
import type { WorkspaceState } from './workspaceState'

/**
 * The routine page that the header of each run workspace links to. The
 * failed runs link to the page whose Runs list shows them.
 */
const routinePaths: Readonly<Record<RunWorkspaceKey, string>> = {
  'pull-request': paths.routine,
  'run-now': paths.routineRunNow,
  'start-failed': paths.routineFailedRuns,
  'turn-failed': paths.routineFailedRuns,
}

/** The open workspace, its chat, and the routine of its run, if any. */
export type OpenWorkspace = {
  record: Workspace
  items: readonly ChatItem[]
  run?: RunSource
}

/**
 * The workspace that the screen opens. A run workspace shows the chat of
 * its run at the stage of the conversation: its first message, which waits
 * while the sandbox starts, or its first turn.
 */
export function openWorkspace(state: WorkspaceState): OpenWorkspace {
  if (state.run === undefined) {
    return {
      record: openableWorkspaceRecords[state.workspace],
      items: conversations[state.conversation],
    }
  }
  const run = runWorkspaces[state.run]
  return {
    record: run.workspace,
    items: state.conversation === 'queued' ? run.queued : run.firstTurn,
    run: { ...run.origin, routineTo: routinePaths[state.run] },
  }
}

/** The steps of the first start of a run workspace. */
export function runStartingLog(state: WorkspaceState): StartingLog | undefined {
  return state.run === undefined ? undefined : runWorkspaces[state.run].starting
}

/** The prompt of the terminal of a new workspace, on its own branch. */
export function freshPromptFor(state: WorkspaceState): string {
  if (state.run === undefined) return freshSessionPrompt
  const { workspace } = runWorkspaces[state.run]
  return `${workspace.repository} (${workspace.branch}) $ `
}
