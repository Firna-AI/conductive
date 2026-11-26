import type { Workspace } from '../shared/generated/Workspace'
import {
  readOrderedWorkspaceResponse,
  readWorkspaces,
} from '../app/api/read-workspaces'
import { readBannerResponse, readStoredResponse } from '../github/githubParse'
import type { WorkspaceEvent } from '../shared/events'
import type { GitHubBanner } from '../shared/github'
import {
  workspacePath,
  workspacePaths,
  workspacesPath,
  type ContinueWorkspaceResponse,
} from '../shared/workspaces'
import type { FakeApiServer } from './fake-api'
import {
  clashWords,
  CONTINUE_ID,
  continueQuestionReply,
  plainContinueNames,
  refusal,
  type ContinueNames,
  type FakeContinueEnd,
} from './fake-bar'
import { FAKE_IDS } from './fixtures/core'
import {
  MASKED_BASE,
  MASKED_CONTINUED,
  MASKED_DEFAULT,
  MASKED_HEAD,
  maskedSeedFile,
} from './fixtures/masked-paths'
import { FAKE_FILE_PATH } from './fixtures/tools'

const seed = maskedSeedFile()
const { org, workspace: id } = FAKE_IDS

/** The workspace branch of the fake, before a Continue moves it. */
const FAKE_HEAD = continueQuestionReply.branch

/**
 * The question of Continue from a default branch that holds the fake value
 * and differs from the target, as the Worker sends it: the real names, the
 * label of the default branch, and the label of each changed file, in the
 * order of the real paths. A changed file whose path holds the value has
 * its own label.
 */
export const maskedQuestionReply = {
  ...continueQuestionReply,
  ...MASKED_DEFAULT,
  localWork: {
    ...continueQuestionReply.localWork,
    uncommittedFiles: [FAKE_FILE_PATH, seed.path],
    displayUncommittedFiles: [FAKE_FILE_PATH, seed.displayPath ?? seed.path],
  },
} satisfies ContinueWorkspaceResponse

/**
 * The branch names of the bar on a development page: `plain`, as the fake
 * API has them, or `masked`, where the target branch holds the fake value
 * of a secret org env var. The Worker then sends the label of the target
 * beside its real name, so the screens show "[redacted]" in place of the
 * value, and the prompts keep the real name. The workspace branch stays
 * plain, because the screen compares it with the workspace record.
 *
 * `masked-continue` gives each name of a Continue the value too, with its
 * label: the workspace branch, `MASKED_HEAD`, in the workspace record and
 * in its GitHub state, the target of the pull request, the default branch
 * that Continue starts from, which differs from the target, a changed file
 * of the question, and the new branch. The question, each note and its
 * copy, and the words of a clash show the labels. The GitHub state of the
 * new branch keeps its own names.
 *
 * `masked-repository` keeps the workspace on `MASKED_HEAD` and the target
 * as `masked-continue` does, and gives each name of a repository change the
 * value, with its label: the changed files of both lists of the question,
 * the new branch, and the default branch of the new repository, as
 * `repositoryNamesWith` and `questionWith` say. The question, the New
 * session text, each note and its copy, the words of a failed fetch, and
 * the GitHub state of the new branch show the labels. A Continue keeps its
 * plain names.
 */
export type FakeBranches =
  'plain' | 'masked' | 'masked-continue' | 'masked-repository'

/** A banner with the branch names of `branches`. */
export function bannerWith(
  branches: FakeBranches,
  banner: GitHubBanner,
): GitHubBanner {
  switch (branches) {
    case 'plain':
      return banner
    case 'masked':
      return { ...banner, ...MASKED_BASE }
    case 'masked-continue':
    case 'masked-repository':
      return banner.branch === FAKE_HEAD
        ? { ...banner, ...MASKED_HEAD, ...MASKED_BASE }
        : banner
  }
}

/** An event whose GitHub state has the branch names of `branches`. */
export function eventWith(
  branches: FakeBranches,
  event: WorkspaceEvent,
): WorkspaceEvent {
  return event.type === 'github.updated'
    ? { ...event, banner: bannerWith(branches, event.banner) }
    : event
}

/**
 * A banner reply or a stored reply of the fake, with the branch names of
 * `branches`. Every other reply, such as an error, stays as it is.
 */
export async function replyWith(
  branches: FakeBranches,
  response: Response,
): Promise<Response> {
  if (branches === 'plain' || !response.ok) return response
  const body: unknown = await response.clone().json()
  const fresh = readBannerResponse(body)
  if (fresh)
    return Response.json({ banner: bannerWith(branches, fresh.banner) })
  const stored = readStoredResponse(body)?.state
  if (!stored) return response
  const banner = bannerWith(branches, stored.banner)
  return Response.json({ state: { ...stored, banner } })
}

/**
 * The workspace of the fake on the workspace branch of `masked-continue`
 * and `masked-repository`.
 */
function onMaskedHead(workspace: Workspace): Workspace {
  return workspace.id === id && workspace.branch === FAKE_HEAD
    ? { ...workspace, branch: MASKED_HEAD.branch }
    : workspace
}

/**
 * A read of the workspace record or of the workspace list of the fake,
 * with the workspace branch of `branches`. `masked-continue` and
 * `masked-repository` keep the workspace on `MASKED_HEAD` until a Continue
 * or a repository change moves it, so the record, its GitHub state, the
 * question, and the request name the same real branch. Every other reply
 * stays as it is.
 */
export async function recordWith(
  branches: FakeBranches,
  pathname: string,
  response: Response,
): Promise<Response> {
  const masked =
    branches === 'masked-continue' || branches === 'masked-repository'
  if (!masked || !response.ok) return response
  const body: unknown = await response.clone().json()
  if (pathname === workspacesPath(org)) {
    return Response.json({ workspaces: readWorkspaces(body).map(onMaskedHead) })
  }
  if (pathname !== workspacePath(org, id)) return response
  const detail = readOrderedWorkspaceResponse(body)
  return Response.json({ ...detail, workspace: onMaskedHead(detail.workspace) })
}

/**
 * Puts the fake workspace on `MASKED_HEAD` in the reads of its record and
 * of the workspace list, as `recordWith` does for a development page. For
 * tests.
 */
export async function serveMaskedHead(server: FakeApiServer): Promise<void> {
  for (const path of [workspacePath(org, id), workspacesPath(org)]) {
    const reply = await recordWith(
      'masked-repository',
      path,
      await server.fetch(path),
    )
    server.json('GET', path, await reply.json())
  }
}

/** The new branch and the default branch of a Continue with `branches`. */
export function continueNamesWith(branches: FakeBranches): ContinueNames {
  return branches === 'masked-continue'
    ? { ...MASKED_CONTINUED, ...MASKED_DEFAULT }
    : plainContinueNames
}

/**
 * The poll of a Continue that ends with `end`, after `serveContinue`, with
 * the names of `branches`. The question of `masked` starts from the target
 * of the pull request, without a label of its own, as from a Worker before
 * the labels of Continue, so the dialog takes the label of the GitHub
 * state. `masked-continue` asks with `maskedQuestionReply` from
 * `MASKED_HEAD`, and its clash names the labels of the default branch and
 * of the workspace branch, as the Worker masks its words.
 */
export function serveContinueWith(
  server: FakeApiServer,
  branches: FakeBranches,
  end: FakeContinueEnd,
): void {
  const poll = workspacePaths.continueResult(org, id, CONTINUE_ID)
  if (branches === 'masked' && end === 'question') {
    server.json('GET', poll, {
      ...continueQuestionReply,
      baseBranch: MASKED_BASE.baseBranch,
    })
  }
  if (branches !== 'masked-continue') return
  if (end === 'question') {
    server.json('GET', poll, {
      ...maskedQuestionReply,
      branch: MASKED_HEAD.branch,
    })
  }
  if (end === 'clash') {
    const words = clashWords(
      MASKED_DEFAULT.displayBaseBranch,
      MASKED_HEAD.displayBranch,
    )
    server.json('GET', poll, refusal('workspace_continue_failed', words), 409)
  }
}
