import type { AppEnv } from '../env'
import { freshGitHubUserToken } from '../security/github-tokens'
import { GitHubReader } from './client'
import type { GitHubWorkspace } from './contracts'
import { authorizeMerge } from './merge-access'
import { readMergeCapabilities } from './merge-capabilities'
import type { GitHubMergeDependencies } from './merge-handler'

/**
 * The GitHub access of one member to the repository of a workspace, for the
 * writes of the bar, such as Merge and Ready for review. Each GitHub
 * request checks again that the member may still reach the workspace and
 * that its repository and branch did not change.
 */
export async function memberGitHub(
  env: AppEnv,
  dependencies: GitHubMergeDependencies,
  workspace: GitHubWorkspace,
  userId: string,
) {
  const authorize = () => authorizeMerge(env.DB, workspace, userId)
  await authorize()
  const token = await freshGitHubUserToken(env, userId, dependencies)
  const fetch = async (request: Request) => {
    await authorize()
    return dependencies.fetch(request)
  }
  const checked = async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation()
    } finally {
      await authorize()
    }
  }
  const reader = new GitHubReader(
    { ...dependencies, fetch, token: async () => token },
    workspace,
    token,
  )
  const capabilities = () =>
    checked(() => readMergeCapabilities(fetch, token, workspace))
  const branches = () => checked(() => reader.dependenciesForBranch())
  /**
   * Reads the GitHub state of the branch with the app's token, and pushes
   * it to every open tab of the workspace.
   */
  const refresh = async () => {
    await authorize()
    await dependencies.refresh(workspace, { userId, requireWritable: true })
    await authorize()
  }
  return { authorize, token, fetch, checked, capabilities, branches, refresh }
}
