import { execFileSync } from 'node:child_process'

export function readBuildRelease(repository: string): string | undefined {
  try {
    const commit = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {
      cwd: repository,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit)
      ? `conductive@${commit}`
      : undefined
  } catch {
    return undefined
  }
}
