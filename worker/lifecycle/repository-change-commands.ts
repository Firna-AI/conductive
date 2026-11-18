import { TERMINAL_RUNTIME } from '../../src/shared/restore-marker'
import { TERMINAL_FOLDER_FILE } from '../terminal/bridge/folder'
import { shellQuote } from './commands'
import {
  continueFetchCommand,
  continueStagingDirectory,
} from './continue-commands'
import { isolatedSourceCommand } from './image-sources/native-command'
import {
  CHECKOUT_REFUSED,
  CONTEXT_COPY_FAILED,
} from './repository-change-errors'
import type { RepositoryChangeJob } from './repository-change-types'

const GIT =
  '/usr/bin/git -c core.hooksPath=/dev/null -c core.askPass= -c credential.helper= -c http.followRedirects=false -c protocol.ext.allow=never -c submodule.recurse=false'

/** The changed files of the new folder, which the checkout carries. */
export function carriedWorkCommand(directory: string): string {
  return `set -eu\ncd ${shellQuote(directory)}\ngit status --porcelain=v1 -z --untracked-files=all -- . ':(exclude).context'\nprintf '\\0'\nprintf '0'`
}

/** Fetches the latest default branch of the new repository, as Continue does. */
export function repositoryChangeFetchCommand(
  job: Pick<RepositoryChangeJob, 'id' | 'fetchId' | 'baseBranch' | 'target'>,
): string {
  return continueFetchCommand({
    id: job.id,
    fetchId: job.fetchId,
    baseBranch: job.baseBranch,
    binding: job.target.binding,
  })
}

/**
 * Copies the context folder of the old folder into the new folder. A file
 * with the same path in the new folder stays. Both folders must be real
 * folders, not links. A missing old context folder copies nothing.
 */
function contextCopy(from: string, to: string, failure: number): string {
  const source = shellQuote(`${from}/.context`)
  const target = shellQuote(`${to}/.context`)
  return `if [ -d ${source} ] && [ ! -L ${source} ]; then
  if [ ! -e ${target} ] && [ ! -L ${target} ]; then mkdir -- ${target} || exit ${failure}; fi
  if [ ! -d ${target} ] || [ -L ${target} ]; then exit ${failure}; fi
  /usr/bin/cp -R --no-dereference --preserve=mode,timestamps --update=none -- ${shellQuote(`${from}/.context/.`)} ${shellQuote(`${to}/.context/`)} || exit ${failure}
fi`
}

/** Adds the rule `/.context/` to the local exclude file of the folder. */
function excludeContext(): string {
  return `conductive_exclude=$(${GIT} rev-parse --git-path info/exclude)
mkdir -p -- "$(dirname -- "$conductive_exclude")"
touch -- "$conductive_exclude"
if ! grep -qxF '/.context/' "$conductive_exclude"; then
  if [ -s "$conductive_exclude" ] && [ -n "$(tail -c 1 -- "$conductive_exclude")" ]; then printf '\\n' >> "$conductive_exclude"; fi
  printf '%s\\n' '/.context/' >> "$conductive_exclude"
fi`
}

/**
 * Runs in the new folder with only staged objects and no member token. The
 * exclude rule comes first, so that Changes lists no copied file. The copy
 * comes before the checkout, so that a failed copy changes no branch.
 */
export function repositoryChangeMoveCommand(
  job: Pick<
    RepositoryChangeJob,
    'id' | 'baseBranch' | 'directory' | 'branch' | 'target'
  >,
): string {
  const stage = shellQuote(continueStagingDirectory(job.id))
  const base = shellQuote(`refs/remotes/origin/${job.baseBranch}`)
  return isolatedSourceCommand(
    [
      `conductive_base_commit=$(${GIT} --git-dir=${stage} rev-parse --verify 'refs/heads/continue-base^{commit}')`,
      `cd ${shellQuote(job.target.directory)}`,
      excludeContext(),
      contextCopy(job.directory, job.target.directory, CONTEXT_COPY_FAILED),
      `${GIT} -c protocol.allow=never -c protocol.file.allow=always fetch --quiet --no-tags --no-recurse-submodules -- ${stage} ${shellQuote(`+refs/heads/continue-base:refs/remotes/origin/${job.baseBranch}`)}`,
      `test "$(${GIT} rev-parse --verify ${base})" = "$conductive_base_commit"`,
      `${GIT} checkout --quiet --no-track --no-overwrite-ignore -b ${shellQuote(job.branch)} ${base} -- || exit ${CHECKOUT_REFUSED}`,
      `${GIT} symbolic-ref refs/remotes/origin/HEAD ${base}`,
      `${GIT} config --local ${shellQuote(`branch.${job.branch}.gh-merge-base`)} ${shellQuote(job.baseBranch)}`,
      `rm -rf -- ${stage}`,
    ].join('\n'),
  )
}

/**
 * Reads the branch of the new folder after a lost or failed move. On the
 * new branch it repairs `origin/HEAD` and the `gh-merge-base` setting. A
 * folder without a branch prints an empty line.
 */
export function repositoryChangeBranchCommand(
  job: Pick<RepositoryChangeJob, 'target' | 'branch' | 'baseBranch'>,
): string {
  const base = shellQuote(`refs/remotes/origin/${job.baseBranch}`)
  const command = `set -eu
cd ${shellQuote(job.target.directory)}
conductive_current_branch=$(${GIT} symbolic-ref --quiet --short HEAD || true)
if [ "$conductive_current_branch" = ${shellQuote(job.branch)} ]; then
  ${GIT} rev-parse --verify ${shellQuote(`refs/remotes/origin/${job.baseBranch}^{commit}`)} > /dev/null
  ${GIT} symbolic-ref refs/remotes/origin/HEAD ${base}
  ${GIT} config --local ${shellQuote(`branch.${job.branch}.gh-merge-base`)} ${shellQuote(job.baseBranch)}
fi
printf '%s\\n' "$conductive_current_branch"`
  return `/usr/bin/env -i PATH=/usr/bin:/bin HOME=/home/user LC_ALL=C TZ=UTC GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 /bin/sh -c ${shellQuote(command)}`
}

/**
 * Moves each idle terminal shell whose folder is in the old repository
 * folder to the new folder, as repository change decision 12 B says. A
 * pane whose program is a shell is idle. A pane that runs a command keeps
 * its folder. The line that a member typed is cleared, and the command
 * starts with a space, so a shell that ignores such lines keeps it out of
 * its history.
 */
function idleShellMove(oldFolder: string, newFolder: string): string {
  const tmux = `/usr/bin/tmux -S ${shellQuote(`${TERMINAL_RUNTIME}/tmux.sock`)}`
  const old = shellQuote(oldFolder.replace(/\/+$/u, ''))
  const line = shellQuote(` cd -- ${shellQuote(newFolder)}`)
  return `conductive_tab=$(printf '\t')
${tmux} list-panes -a -F "#{pane_id}\${conductive_tab}#{pane_current_command}\${conductive_tab}#{pane_current_path}" 2>/dev/null |
while IFS="$conductive_tab" read -r conductive_pane conductive_program conductive_path; do
  case "$conductive_program" in bash|sh|dash|zsh|fish) ;; *) continue ;; esac
  case "$conductive_path/" in ${old}/*) ;; *) continue ;; esac
  ${tmux} send-keys -t "$conductive_pane" C-e C-u &&
  ${tmux} send-keys -t "$conductive_pane" -l ${line} &&
  ${tmux} send-keys -t "$conductive_pane" Enter || true
done`
}

/**
 * The steps after publication. Each step only warns when it fails. It
 * copies the context folder again, for a file attached during the change,
 * gives new terminals the new folder, as the terminal README says, and
 * moves each idle shell of the old folder to the new folder.
 */
export function repositoryChangeSettleCommand(
  job: Pick<RepositoryChangeJob, 'directory' | 'target'>,
): string {
  const folder = shellQuote(job.target.directory)
  const file = shellQuote(TERMINAL_FOLDER_FILE)
  const copy = contextCopy(job.directory, job.target.directory, 1)
  return `conductive_status=0
( set -eu
umask 077
${copy}
) || { echo 'conductive: the context folder was not copied again' >&2; conductive_status=1; }
if [ -d /run/conductive ]; then
  ( set -eu
  conductive_file=$(mktemp /run/conductive/repository.XXXXXX)
  printf '%s\\n' ${folder} > "$conductive_file"
  mv -f -- "$conductive_file" ${file}
  ) || { echo 'conductive: the terminal folder was not written' >&2; conductive_status=1; }
fi
/usr/bin/tmux -S ${shellQuote(`${TERMINAL_RUNTIME}/tmux.sock`)} set-environment -g CONDUCTIVE_REPOSITORY_DIR ${folder} 2>/dev/null || true
${idleShellMove(job.directory, job.target.directory)}
exit "$conductive_status"`
}
