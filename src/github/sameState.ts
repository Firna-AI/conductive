import type { GitHubSnapshot } from './githubClient'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Whether two JSON values are equal. Keys can come in any order. */
function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    const left: readonly unknown[] = a
    const right: readonly unknown[] = b
    // The order of the items counts, as GitHub's order of the checks does.
    return (
      left.length === right.length &&
      left.every((item, index) => sameJson(item, right[index]))
    )
  }
  if (!isRecord(a) || !isRecord(b)) return false
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((key) => Object.hasOwn(b, key) && sameJson(a[key], b[key]))
}

/**
 * Whether two GitHub states show the same banner and the same checks. The
 * time of the banner does not count, because the contract gives it no order.
 */
export function sameGitHubState(a: GitHubSnapshot, b: GitHubSnapshot): boolean {
  return (
    sameJson({ ...a.banner, updatedAt: 0 }, { ...b.banner, updatedAt: 0 }) &&
    sameJson(a.checks, b.checks)
  )
}
