import type { Workspace } from './generated/Workspace'
import type { WorkspaceState } from './generated/WorkspaceState'
import { readGitHubSummary } from './github-read'
import { readArchivedComputer } from './archived-computer-read'
import {
  readGitHubCanWrite,
  readGitHubPullBase,
  readMergeQueueEntry,
  readMergeQueueListLabels,
} from './merge-queue-read'

type JsonObject = Readonly<Record<string, unknown>>

interface WorkspaceFieldReaders {
  record: (value: unknown, name: string) => JsonObject
  text: (source: JsonObject, key: string) => string
  count: (source: JsonObject, key: string) => number
  nullableText: (source: JsonObject, key: string) => string | null
  nullableCount: (source: JsonObject, key: string) => number | null
  sender: (value: unknown) => Workspace['owner']
  choice: (value: unknown) => Workspace['choice']
  invalidState: (states: readonly WorkspaceState[]) => Error
}

const workspaceStates: Readonly<Record<WorkspaceState, WorkspaceState>> = {
  working: 'working',
  input: 'input',
  unread: 'unread',
  ready: 'ready',
  starting: 'starting',
  stopped: 'stopped',
  error: 'error',
  archived: 'archived',
}

/** The workspace states that each browser reader knows. */
export const WORKSPACE_STATES: readonly WorkspaceState[] =
  Object.values(workspaceStates)

function readState(
  value: unknown,
  invalid: WorkspaceFieldReaders['invalidState'],
): WorkspaceState {
  const state = WORKSPACE_STATES.find((candidate) => candidate === value)
  if (state === undefined) throw invalid(WORKSPACE_STATES)
  return state
}

/** Shares the workspace fields while each area keeps its JSON rules and errors. */
export function createWorkspaceReader(read: WorkspaceFieldReaders) {
  return (value: unknown): Workspace => {
    const source = read.record(value, 'workspace')
    const archivedComputer = readArchivedComputer(source.archivedComputer)
    // The list read alone carries the merge queue fields. Each one is
    // optional, so a reply without them, or with a malformed one, still reads.
    const mergeQueue = readMergeQueueEntry(source.mergeQueue)
    const mergeQueueLabels = readMergeQueueListLabels(source.mergeQueueLabels)
    const githubCanWrite = readGitHubCanWrite(source.githubCanWrite)
    const githubPullBase = readGitHubPullBase(source.githubPullBase)
    const githubPullFromFork =
      typeof source.githubPullFromFork === 'boolean'
        ? source.githubPullFromFork
        : undefined
    // Only the list read sets it, for a starting workspace. A malformed
    // value reads as no answer, so the mark stays still.
    const messageWaiting =
      typeof source.messageWaiting === 'boolean'
        ? source.messageWaiting
        : undefined
    return {
      id: read.text(source, 'id'),
      number: read.count(source, 'number'),
      link: read.text(source, 'link'),
      orgId: read.text(source, 'orgId'),
      repositoryId: read.text(source, 'repositoryId'),
      sectionId: read.text(source, 'sectionId'),
      // Older replies without a parent identify a top-level workspace.
      parentId:
        source.parentId === undefined
          ? null
          : read.nullableText(source, 'parentId'),
      owner: read.sender(source.owner),
      name: read.nullableText(source, 'name'),
      branch: read.text(source, 'branch'),
      choice: read.choice(source.choice),
      state: readState(source.state, read.invalidState),
      github: readGitHubSummary(source.github),
      ...(mergeQueue !== undefined && { mergeQueue }),
      ...(mergeQueueLabels !== undefined && { mergeQueueLabels }),
      ...(githubCanWrite !== undefined && { githubCanWrite }),
      ...(githubPullBase !== undefined && { githubPullBase }),
      ...(githubPullFromFork !== undefined && { githubPullFromFork }),
      ...(messageWaiting !== undefined && { messageWaiting }),
      createdAt: read.count(source, 'createdAt'),
      updatedAt: read.count(source, 'updatedAt'),
      archivedAt: read.nullableCount(source, 'archivedAt'),
      restoreUntil: read.nullableCount(source, 'restoreUntil'),
      ...(archivedComputer !== undefined && { archivedComputer }),
    }
  }
}
