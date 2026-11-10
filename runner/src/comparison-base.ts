import type { Git } from './git'

async function optional(git: Git, args: string[]): Promise<string | null> {
  try {
    return (await git.run(args)).toString().trim()
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

/** Continue can change the active branch target while the runner stays up. */
export async function comparisonBase(
  git: Git,
  fallbackBranch: string,
): Promise<{ branch: string; sha: string }> {
  const head = await optional(git, ['symbolic-ref', '--quiet', 'HEAD'])
  const target = head?.startsWith('refs/heads/')
    ? await optional(git, [
        'config',
        '--local',
        '--get',
        `branch.${head.slice('refs/heads/'.length)}.gh-merge-base`,
      ])
    : null
  const branch = target || fallbackBranch
  return { branch, sha: await git.mergeBase(branch) }
}
