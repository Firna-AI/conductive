import { shellQuote } from './commands'
import {
  isolatedSourceCommand,
  sourceRepositoryUrl,
} from './image-sources/native-command'
import type { ContinueJob } from './continue-types'
import { CONTINUE_EXIT_CODES } from './continue-stop-causes'

const GIT =
  '/usr/bin/git -c core.hooksPath=/dev/null -c core.askPass= -c credential.helper= -c http.followRedirects=false -c protocol.ext.allow=never -c submodule.recurse=false'

export function continueStagingDirectory(id: string): string {
  return `/tmp/conductive-continue/${encodeURIComponent(id)}/source.git`
}

/** Only this isolated repository reads the member credential. Nothing logs its output. */
export function continueFetchCommand(
  job: Pick<ContinueJob, 'id' | 'fetchId' | 'baseBranch' | 'binding'>,
): string {
  const stage = shellQuote(continueStagingDirectory(job.id))
  return isolatedSourceCommand(
    [
      'cd /tmp',
      `export CONDUCTIVE_TURN_ID=${shellQuote(job.fetchId)}`,
      `mkdir -p ${stage}`,
      `${GIT} init --bare --quiet --template= ${stage}`,
      `${GIT} --git-dir=${stage} -c credential.helper=/usr/local/bin/conductive-git-credential fetch --quiet --no-tags --no-recurse-submodules -- ${shellQuote(sourceRepositoryUrl(job.binding.fullName))} ${shellQuote(`+refs/heads/${job.baseBranch}:refs/heads/continue-base`)}`,
    ].join('\n'),
  )
}

/** The working repository sees only staged objects and has no member-token environment. */
export function continueMoveCommand(
  job: Pick<
    ContinueJob,
    'id' | 'baseBranch' | 'directory' | 'branch' | 'binding'
  >,
): string {
  const stage = shellQuote(continueStagingDirectory(job.id))
  const base = shellQuote(`refs/remotes/origin/${job.baseBranch}`)
  return isolatedSourceCommand(
    [
      `conductive_base_commit=$(${GIT} --git-dir=${stage} rev-parse --verify 'refs/heads/continue-base^{commit}')`,
      `cd ${shellQuote(job.directory)}`,
      `test "$(${GIT} symbolic-ref --short HEAD)" = ${shellQuote(job.binding.branch)}`,
      `${GIT} -c protocol.allow=never -c protocol.file.allow=always fetch --quiet --no-tags --no-recurse-submodules -- ${stage} ${shellQuote(`+refs/heads/continue-base:refs/remotes/origin/${job.baseBranch}`)}`,
      `test "$(${GIT} rev-parse --verify ${base})" = "$conductive_base_commit"`,
      `if conductive_checkout_error=$(${GIT} checkout --quiet --no-track --no-overwrite-ignore -b ${shellQuote(job.branch)} ${base} -- 2>&1); then`,
      '  unset conductive_checkout_error',
      'else',
      '  case "$conductive_checkout_error" in',
      `    "error: Your local changes to the following files would be overwritten by checkout:"*|"error: The following untracked working tree files would be overwritten by checkout:"*) exit ${CONTINUE_EXIT_CODES.checkoutClash} ;;`,
      `    "fatal: Unable to create '"*"/index.lock': File exists."*) exit ${CONTINUE_EXIT_CODES.indexLock} ;;`,
      '    *) exit 1 ;;',
      '  esac',
      'fi',
      continueMetadataCommand(job),
      `rm -rf -- ${stage}`,
    ].join('\n'),
  )
}

export function continueBranchCommand(
  job: Pick<ContinueJob, 'directory' | 'branch' | 'baseBranch'>,
): string {
  const command = `set -eu
cd ${shellQuote(job.directory)}
conductive_current_branch=$(${GIT} symbolic-ref --short HEAD)
if [ "$conductive_current_branch" = ${shellQuote(job.branch)} ]; then
  ${GIT} rev-parse --verify ${shellQuote(`refs/remotes/origin/${job.baseBranch}^{commit}`)} > /dev/null || exit ${CONTINUE_EXIT_CODES.comparisonMetadata}
  ${continueMetadataCommand(job)}
fi
printf '%s\\n' "$conductive_current_branch"`
  return `/usr/bin/env -i PATH=/usr/bin:/bin HOME=/home/user LC_ALL=C TZ=UTC GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 /bin/sh -c ${shellQuote(command)} 2>/dev/null`
}

function continueMetadataCommand(
  job: Pick<ContinueJob, 'baseBranch' | 'branch'>,
): string {
  const base = shellQuote(`refs/remotes/origin/${job.baseBranch}`)
  return `${GIT} symbolic-ref refs/remotes/origin/HEAD ${base} && ${GIT} config --local ${shellQuote(`branch.${job.branch}.gh-merge-base`)} ${shellQuote(job.baseBranch)} || exit ${CONTINUE_EXIT_CODES.comparisonMetadata}`
}
