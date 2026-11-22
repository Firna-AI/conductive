import { shellQuote } from './commands'
import {
  BASE_CHANGE_GIT as GIT,
  baseChangeFetchCommand,
  baseChangeInstallCommand,
  baseChangeMetadataCommand,
} from './base-change-commands'
import type { ContinueJob } from './continue-types'
import { CONTINUE_EXIT_CODES } from './continue-stop-causes'

export function continueStagingDirectory(id: string): string {
  return `/tmp/conductive-continue/${encodeURIComponent(id)}/source.git`
}

/** Only this isolated repository reads the member credential. Nothing logs its output. */
export function continueFetchCommand(
  job: Pick<ContinueJob, 'id' | 'fetchId' | 'baseBranch' | 'binding'>,
): string {
  return baseChangeFetchCommand({
    stage: continueStagingDirectory(job.id),
    fetchId: job.fetchId,
    baseBranch: job.baseBranch,
    fullName: job.binding.fullName,
  })
}

/** The working repository sees only staged objects and has no member-token environment. */
export function continueMoveCommand(
  job: Pick<
    ContinueJob,
    'id' | 'baseBranch' | 'directory' | 'branch' | 'binding'
  >,
): string {
  return baseChangeInstallCommand({
    stage: continueStagingDirectory(job.id),
    directory: job.directory,
    baseBranch: job.baseBranch,
    branch: job.binding.branch,
    nextBranch: job.branch,
  })
}

export function continueBranchCommand(
  job: Pick<ContinueJob, 'directory' | 'branch' | 'baseBranch'>,
): string {
  const command = `set -eu
cd ${shellQuote(job.directory)}
conductive_current_branch=$(${GIT} symbolic-ref --short HEAD)
if [ "$conductive_current_branch" = ${shellQuote(job.branch)} ]; then
  ${GIT} rev-parse --verify ${shellQuote(`refs/remotes/origin/${job.baseBranch}^{commit}`)} > /dev/null || exit ${CONTINUE_EXIT_CODES.comparisonMetadata}
  ${baseChangeMetadataCommand(job)}
fi
printf '%s\\n' "$conductive_current_branch"`
  return `/usr/bin/env -i PATH=/usr/bin:/bin HOME=/home/user LC_ALL=C TZ=UTC GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 /bin/sh -c ${shellQuote(command)} 2>/dev/null`
}
