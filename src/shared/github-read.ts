import type { GitHubSummary } from './github'

export function readGitHubSummary(value: unknown): GitHubSummary | null {
  return value === 'checks-running' ||
    value === 'checks-failed' ||
    value === 'checks-passed' ||
    value === 'merged'
    ? value
    : null
}
