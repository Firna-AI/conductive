import type { Git } from './git'

async function remoteHead(git: Git): Promise<string | null> {
  try {
    return (
      await git.run(['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD'])
    )
      .toString()
      .trim()
  } catch (error) {
    if (
      error instanceof Error &&
      error.cause instanceof Error &&
      'code' in error.cause &&
      error.cause.code === 1
    )
      return null
    throw error
  }
}

/** Resolve the current fetched default tip without moving any local branch. */
export async function comparisonBase(
  git: Git,
  fallbackBranch: string,
): Promise<{ branch: string; sha: string }> {
  const prefix = 'refs/remotes/origin/'
  const head = await remoteHead(git)
  if (head?.startsWith(prefix))
    return { branch: head.slice(prefix.length), sha: await git.resolve(head) }
  const remote = `${prefix}${fallbackBranch}`
  const refs = (await git.run(['for-each-ref', '--format=%(refname)', remote]))
    .toString()
    .split('\n')
  return {
    branch: fallbackBranch,
    sha: await git.resolve(refs.includes(remote) ? remote : fallbackBranch),
  }
}
