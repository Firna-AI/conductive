import {
  githubPaths,
  type GitHubBanner,
  type GitHubChecksResponse,
} from '../shared/github'
import {
  readBannerResponse,
  readChecksResponse,
  readErrorMessage,
  readStoredResponse,
} from './githubParse'

/** The browser's fetch, or a fake with the same shape in development. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/** The workspace whose branch the bar shows. */
export interface WorkspaceTarget {
  orgId: string
  workspaceId: string
}

/** The GitHub state of a branch: its banner and its checks, read together. */
export interface GitHubSnapshot {
  banner: GitHubBanner
  checks: GitHubChecksResponse
}

/** A read that failed. `userMessage` is the API's own text, when it sent one. */
export class GitHubLoadError extends Error {
  readonly userMessage: string | null

  constructor(userMessage: string | null) {
    super(userMessage ?? 'The GitHub state did not load.')
    this.name = 'GitHubLoadError'
    this.userMessage = userMessage
  }
}

async function readJson<T>(
  fetch: FetchLike,
  path: string,
  signal: AbortSignal,
  read: (body: unknown) => T | null,
): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
    signal,
  })
  // A reply that is not JSON reads as null, which no reader accepts.
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new GitHubLoadError(readErrorMessage(body))
  const value = read(body)
  if (value === null) throw new GitHubLoadError(null)
  return value
}

/**
 * Reads the banner and the checks of a workspace from the API, with two
 * requests. Both must load before either view shows them. The Worker
 * answers two requests that come together from one GitHub read, but the
 * contract does not promise that the two replies come from one moment. A
 * GitHub change between two reads can give a banner and checks of two
 * moments, and the next GitHub event corrects that.
 */
export async function loadGitHubSnapshot(
  fetch: FetchLike,
  target: WorkspaceTarget,
  signal: AbortSignal,
): Promise<GitHubSnapshot> {
  const { orgId, workspaceId } = target
  const [banner, checks] = await Promise.all([
    readJson(
      fetch,
      githubPaths.banner(orgId, workspaceId),
      signal,
      readBannerResponse,
    ),
    readJson(
      fetch,
      githubPaths.checks(orgId, workspaceId),
      signal,
      readChecksResponse,
    ),
  ])
  return { banner: banner.banner, checks }
}

/**
 * Reads the last GitHub state that the Worker stored for the workspace
 * branch, without a GitHub read, so it answers fast. Null when none is
 * stored yet. A fresh read from GitHub must follow, because the stored
 * state can be old.
 */
export async function loadStoredSnapshot(
  fetch: FetchLike,
  target: WorkspaceTarget,
  signal: AbortSignal,
): Promise<GitHubSnapshot | null> {
  const { orgId, workspaceId } = target
  const reply = await readJson(
    fetch,
    githubPaths.stored(orgId, workspaceId),
    signal,
    readStoredResponse,
  )
  return reply.state
}
