import { shellQuote } from './commands'
import {
  isolatedSourceCommand,
  sourceRepositoryUrl,
} from './image-sources/native-command'
import type { ContinueJob } from './continue-types'

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
      `${GIT} checkout --quiet --no-track --no-overwrite-ignore -b ${shellQuote(job.branch)} ${base} --`,
      `rm -rf -- ${stage}`,
    ].join('\n'),
  )
}

export function continueBranchCommand(
  job: Pick<ContinueJob, 'directory'>,
): string {
  const command = `set -eu\ncd ${shellQuote(job.directory)}\n${GIT} symbolic-ref --short HEAD`
  return `/usr/bin/env -i PATH=/usr/bin:/bin HOME=/home/user LC_ALL=C TZ=UTC GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 /bin/sh -c ${shellQuote(command)}`
}
