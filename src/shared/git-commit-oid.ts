export function isGitCommitOid(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value)
}
