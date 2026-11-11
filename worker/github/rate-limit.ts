import type { HttpFetch } from '../env'
import { HttpError } from '../http'
import { installationResetAt, saveInstallationResetAt } from './data'

// GitHub asks for at least one minute before a retry when it gives no time.
// The floor also stops a loop of reads when GitHub's clock is behind ours.
const MINIMUM_WAIT_MS = 60_000

/** A read that waits until GitHub takes the reads of its installation again. */
export class GitHubRateLimited extends HttpError {
  readonly resetAt: number

  constructor(resetAt: number) {
    super(502, 'github_unavailable', 'GitHub is not available. Try again.')
    this.resetAt = resetAt
  }
}

function seconds(value: string | null): number | null {
  return value !== null && /^\d+$/.test(value) ? Number(value) : null
}

/** The time when GitHub takes requests again, or null when it sets no limit. */
function resetTime(response: Response, now: number): number | null {
  const retryAfter = seconds(response.headers.get('retry-after'))
  const usedUp =
    response.status === 429 ||
    response.headers.get('x-ratelimit-remaining') === '0'
  if (retryAfter === null && !usedUp) return null
  const reset = usedUp
    ? seconds(response.headers.get('x-ratelimit-reset'))
    : null
  return Math.max(
    now + MINIMUM_WAIT_MS,
    now + (retryAfter ?? 0) * 1000,
    (reset ?? 0) * 1000,
  )
}

/**
 * The GitHub limit of one installation, for one read. GitHub's docs ask an
 * app to send no request while its limit is used up, and they can ban an app
 * that does. The limit and its reset time belong to the installation, so the
 * time goes to D1, where the reads of every workspace find it.
 */
export class InstallationLimit {
  private resetAt: number | null = null
  private readonly db: D1Database
  private readonly installationId: number
  private readonly now: () => number

  constructor(db: D1Database, installationId: number, now: () => number) {
    this.db = db
    this.installationId = installationId
    this.now = now
  }

  /** Throws until the stored reset time of the installation has passed. */
  async check(): Promise<void> {
    const resetAt = await installationResetAt(this.db, this.installationId)
    if (resetAt !== null && resetAt > this.now())
      throw new GitHubRateLimited(resetAt)
  }

  /** Sends one request, and stores the reset time that GitHub reports. */
  async fetch(fetch: HttpFetch, request: Request): Promise<Response> {
    this.throwIfLimited()
    const response = await fetch(request)
    const resetAt = resetTime(response, this.now())
    if (resetAt !== null) {
      this.resetAt = resetAt
      await saveInstallationResetAt(this.db, this.installationId, resetAt)
    }
    return response
  }

  /** Throws when a response of this read reported a used-up limit. */
  throwIfLimited(): void {
    if (this.resetAt !== null) throw new GitHubRateLimited(this.resetAt)
  }
}
