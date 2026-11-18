/** How long the outer Worker keeps the workspace of a preview hostname. */
export const PREVIEW_HOSTNAME_CACHE_MS = 5 * 60_000
const MAX_HOSTNAMES = 1_000

interface CachedHostname {
  workspaceId: string
  until: number
}

/**
 * Keeps the workspace of each recently found preview hostname in this isolate.
 * The hostname is not a credential. The workspace object still checks the viewer
 * and the preview on each request, so a revoked hostname that stays here gets its 404 there.
 * Unknown hostnames are never kept.
 */
export class PreviewHostnames {
  private readonly entries = new Map<string, CachedHostname>()

  get(hostname: string, now: number): string | null {
    const entry = this.entries.get(hostname)
    if (!entry) return null
    if (entry.until <= now) {
      this.entries.delete(hostname)
      return null
    }
    return entry.workspaceId
  }

  set(hostname: string, workspaceId: string, expiresAt: number, now: number) {
    this.entries.delete(hostname)
    this.entries.set(hostname, {
      workspaceId,
      until: Math.min(expiresAt, now + PREVIEW_HOSTNAME_CACHE_MS),
    })
    // A Map keeps insertion order, so the first key is the oldest entry.
    while (this.entries.size > MAX_HOSTNAMES) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
  }
}

export const previewHostnames = new PreviewHostnames()
