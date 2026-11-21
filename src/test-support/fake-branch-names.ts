import { readBannerResponse, readStoredResponse } from '../github/githubParse'
import type { WorkspaceEvent } from '../shared/events'
import type { GitHubBanner } from '../shared/github'
import { MASKED_BASE } from './fixtures/masked-paths'

/**
 * The branch names of the bar on a development page: `plain`, as the fake
 * API has them, or `masked`, where the target branch holds the fake value
 * of a secret org env var. The Worker then sends the label of the target
 * beside its real name, so the screens show "[redacted]" in place of the
 * value, and the prompts keep the real name. The workspace branch stays
 * plain, because the screen compares it with the workspace record.
 */
export type FakeBranches = 'plain' | 'masked'

/** A banner with the target branch of `branches`. */
export function bannerWith(
  branches: FakeBranches,
  banner: GitHubBanner,
): GitHubBanner {
  return branches === 'masked' ? { ...banner, ...MASKED_BASE } : banner
}

/** An event whose GitHub state has the target branch of `branches`. */
export function eventWith(
  branches: FakeBranches,
  event: WorkspaceEvent,
): WorkspaceEvent {
  return event.type === 'github.updated'
    ? { ...event, banner: bannerWith(branches, event.banner) }
    : event
}

/**
 * A banner reply or a stored reply of the fake, with the target branch of
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
