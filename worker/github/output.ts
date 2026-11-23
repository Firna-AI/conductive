import type { GitHubBanner } from '../../src/shared/github'
import type { MergeQueueBranchLabel } from '../../src/shared/generated/MergeQueueBranchLabel'
import { filterGitHubBanner } from '../../src/shared/output-fields'
import { OutputSanitizer } from '../../src/shared/output-sanitizer'
import type { AppEnv } from '../env'
import { runningOutputSecrets } from '../lifecycle/output-secrets'

export function outputBranchLabels(secrets: readonly string[]) {
  const output = new OutputSanitizer()
  for (const secret of secrets) output.add(secret)
  return {
    banner: (banner: GitHubBanner) =>
      filterGitHubBanner(banner, (value) => output.text(value)),
    branch: (branch: string): MergeQueueBranchLabel => ({
      text: output.text(branch),
    }),
  }
}

export async function githubBranchLabels(
  env: AppEnv,
  workspace: { id: string; orgId: string },
) {
  return outputBranchLabels(await runningOutputSecrets(env, workspace))
}
