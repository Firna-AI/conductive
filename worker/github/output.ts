import type { GitHubBanner } from '../../src/shared/github'
import { filterGitHubBanner } from '../../src/shared/output-fields'
import { OutputSanitizer } from '../../src/shared/output-sanitizer'
import type { AppEnv } from '../env'
import { runningOutputSecrets } from '../lifecycle/output-secrets'

type BranchLabels = (banner: GitHubBanner) => GitHubBanner

export async function githubBranchLabels(
  env: AppEnv,
  workspace: { id: string; orgId: string },
): Promise<BranchLabels> {
  const output = new OutputSanitizer()
  for (const secret of await runningOutputSecrets(env, workspace))
    output.add(secret)
  return (banner) => filterGitHubBanner(banner, (value) => output.text(value))
}
