import { pullRequest } from '../../docs/mockups/src/fixtures/pullRequests'
import {
  movedBranch,
  repositoryWork,
} from '../../docs/mockups/src/fixtures/repositoryMove'
import type { WorkspaceEvent } from '../shared/events'
import type { ChangeRepositoryResponse } from '../shared/workspaces'
import type { FakeBranches } from './fake-branch-names'
import { FAKE_TIME } from './fixtures/core'
import {
  MASKED_DEFAULT,
  MASKED_HEAD,
  MASKED_MOVED,
  MASKED_REPOSITORY_WORK,
} from './fixtures/masked-paths'
import { workspaceFixtures } from './fixtures/workspaces'

/*
 * The names of a repository change of the fake workspace, as the Worker
 * sends them to a browser: the real names, and the label beside each name
 * that holds the fake value of a secret.
 */

/** The repository that the member picks, as the mockups pick it. */
export const MOVED_REPOSITORY = {
  id: 'billing-service',
  fullName: 'acme/billing-service',
} as const

/**
 * The new branch of a repository change and the default branch of the new
 * repository that it starts from, with the labels that the Worker sends
 * beside the real names when they hold a secret value.
 */
export interface RepositoryNames {
  branch: string
  displayBranch?: string
  baseBranch: string
  displayBaseBranch?: string
}

/**
 * The names of a repository change with `branches`. `masked-repository`
 * gives the new branch and the default branch the fake value, with their
 * labels. The other values give the names of the mockups.
 */
export function repositoryNamesWith(branches: FakeBranches): RepositoryNames {
  return branches === 'masked-repository'
    ? { ...MASKED_MOVED, ...MASKED_DEFAULT }
    : { branch: movedBranch, baseBranch: 'main' }
}

/** The question of the change, with the work of the mockups. */
export const repositoryQuestionReply = {
  state: 'confirmation-required',
  repository: MOVED_REPOSITORY,
  branch: workspaceFixtures().detail.workspace.branch,
  baseBranch: 'main',
  work: {
    localWork: {
      uncommittedFiles: repositoryWork.left.files,
      unpushedCommits: repositoryWork.left.commits,
    },
    pullRequest: { number: pullRequest.number, url: pullRequest.url },
    pushedCommits: repositoryWork.pushedCommits,
    carriedFiles: repositoryWork.carried.files,
  },
} as const

/**
 * The question of the change with `branches`. `masked-repository` asks
 * from `MASKED_HEAD`, the workspace branch of its record, and adds the
 * files of `MASKED_REPOSITORY_WORK` to both lists, with the label of each
 * changed file in the order of the real paths.
 */
export function questionWith(branches: FakeBranches): ChangeRepositoryResponse {
  if (branches !== 'masked-repository') return repositoryQuestionReply
  const { left, carried } = MASKED_REPOSITORY_WORK
  const { work } = repositoryQuestionReply
  const { uncommittedFiles } = work.localWork
  return {
    ...repositoryQuestionReply,
    branch: MASKED_HEAD.branch,
    baseBranch: MASKED_DEFAULT.baseBranch,
    work: {
      ...work,
      localWork: {
        ...work.localWork,
        uncommittedFiles: [...uncommittedFiles, ...left.files],
        displayUncommittedFiles: [...uncommittedFiles, ...left.displayFiles],
      },
      carriedFiles: [...work.carriedFiles, ...carried.files],
      displayCarriedFiles: [...work.carriedFiles, ...carried.displayFiles],
    },
  }
}

/**
 * The GitHub state of the new branch, which has no commit on GitHub yet,
 * with the labels of `names`, as the refresh of GitHub after the change
 * publishes it.
 */
export function newBranchGitHub(
  names: RepositoryNames,
): Extract<WorkspaceEvent, { type: 'github.updated' }> {
  return {
    type: 'github.updated',
    banner: {
      ...names,
      updatedAt: FAKE_TIME,
      state: 'no-commits',
      pullRequest: null,
    },
    checks: { state: 'waiting-for-pull-request', checks: [] },
  }
}
