import type { AppDependencies, AppEnv } from '../env'
import { freshGitHubUserToken } from '../security/github-tokens'
import { GitHubReader } from './client'
import type { GitHubWorkspace } from './contracts'
import { authorizeMerge } from './merge-access'
import { readMergeCapabilities } from './merge-capabilities'
import type { GitHubMergeDependencies } from './merge-handler'

/** Check the workspace binding around each use of the member's token. */
export async function repositoryMemberGitHub(
  env: AppEnv,
  dependencies: AppDependencies,
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
  const capabilities = () =>
    checked(() => readMergeCapabilities(fetch, token, workspace))
  return { authorize, token, fetch, checked, capabilities }
}

export async function memberGitHub(
  env: AppEnv,
  dependencies: GitHubMergeDependencies,
  workspace: GitHubWorkspace,
  userId: string,
) {
  const access = await repositoryMemberGitHub(
    env,
    dependencies,
    workspace,
    userId,
  )
  const { authorize, token, fetch, checked } = access
  const reader = new GitHubReader(
    { ...dependencies, fetch, token: async () => token },
    workspace,
    token,
  )
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
  return { ...access, branches, refresh }
}
