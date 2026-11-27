import { BASE_CHANGE_GIT as GIT } from './base-change-commands'
import { shellQuote } from './commands'
import {
  isolatedSourceCommand,
  sourceRepositoryUrl,
} from './image-sources/native-command'
import { contextCopy, excludeContext } from './repository-change-context'
import {
  CHECKOUT_REFUSED,
  CONTEXT_COPY_FAILED,
} from './repository-change-errors'
import type { RepositoryChangeJob } from './repository-change-types'
import { removeCloneStage } from './repository-clone-stage'
import { REPOSITORY_CODE_DIRECTORY } from './repository-locations'

const codeDirectory = shellQuote(REPOSITORY_CODE_DIRECTORY)
const CLONE_JOB_KEY = 'conductive.cloneJob'
const clonePrefix = `${REPOSITORY_CODE_DIRECTORY}/.conductive-clone-`

/** Read all occupied names, including files and links. The empty entry marks the end. */
export const repositoryCloneNamesCommand = isolatedSourceCommand(
  `test ! -L ${codeDirectory}
if [ -e ${codeDirectory} ]; then
  test -d ${codeDirectory}
  find ${codeDirectory} -mindepth 1 -maxdepth 1 -printf '%f\\0'
fi
printf '\\0'`,
  true,
)

/** Reclaim the temporary names made from a job token and a mktemp suffix. */
function sweepCloneWorkTrees(protectedFolders: readonly string[]): string {
  const pattern = shellQuote(
    `${REPOSITORY_CODE_DIRECTORY}/\\.conductive-clone-[A-Za-z0-9_-]{43}\\.[A-Za-z0-9]{6}`,
  )
  const keep = protectedFolders
    .filter((folder) => folder.startsWith(clonePrefix))
    .map((folder) => ` ! -ipath ${shellQuote(folder)}`)
    .join('')
  return `find ${codeDirectory} -regextype posix-extended -mindepth 1 -maxdepth 1 -type d -regex ${pattern}${keep} -exec rm -rf -- {} +`
}

/** Prepare the work tree under a temporary name and move it without replacing a folder. */
export function repositoryCloneMoveCommand(
  job: Pick<
    RepositoryChangeJob,
    'id' | 'baseBranch' | 'directory' | 'branch' | 'target'
  >,
  stagingDirectory: string,
  recordedFolders: readonly string[],
): string {
  const stage = shellQuote(stagingDirectory)
  const cleanup = removeCloneStage(stagingDirectory)
  const folder = shellQuote(job.target.directory)
  const name = shellQuote(
    job.target.directory.slice(REPOSITORY_CODE_DIRECTORY.length + 1),
  )
  const base = shellQuote(`refs/remotes/origin/${job.baseBranch}`)
  const template = shellQuote(
    `${clonePrefix}${encodeURIComponent(job.id)}.XXXXXX`,
  )
  return isolatedSourceCommand(
    [
      'conductive_clone=',
      `trap ${shellQuote(`[ -z "$conductive_clone" ] || rm -rf -- "$conductive_clone" || :\n${cleanup} || :`)} EXIT`,
      "trap 'exit 1' HUP INT TERM",
      `test ! -L ${codeDirectory}`,
      `mkdir -p -- ${codeDirectory}`,
      sweepCloneWorkTrees([
        ...recordedFolders,
        job.directory,
        job.target.directory,
      ]),
      `conductive_clone=$(mktemp -d -- ${template})`,
      `conductive_format=$(${GIT} --git-dir=${stage} rev-parse --show-object-format)`,
      `${GIT} init --quiet --template= --object-format="$conductive_format" --initial-branch=${shellQuote(job.baseBranch)} "$conductive_clone"`,
      'cd "$conductive_clone"',
      `${GIT} config --local remote.origin.url ${shellQuote(sourceRepositoryUrl(job.target.binding.fullName))}`,
      `${GIT} config --local remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'`,
      `${GIT} -c protocol.allow=never -c protocol.file.allow=always fetch --quiet --no-tags --no-recurse-submodules -- ${stage} '+refs/heads/*:refs/remotes/origin/*' '+refs/tags/*:refs/tags/*'`,
      cleanup,
      `${GIT} symbolic-ref refs/remotes/origin/HEAD ${base}`,
      `${GIT} checkout --quiet --no-track --no-overwrite-ignore -b ${shellQuote(job.branch)} ${base} -- || exit ${CHECKOUT_REFUSED}`,
      `${GIT} branch --quiet --track -- ${shellQuote(job.baseBranch)} ${base}`,
      excludeContext(),
      contextCopy(job.directory, '.', CONTEXT_COPY_FAILED),
      `${GIT} config --local ${shellQuote(`branch.${job.branch}.gh-merge-base`)} ${shellQuote(job.baseBranch)}`,
      `${GIT} config --local ${CLONE_JOB_KEY} ${shellQuote(job.id)}`,
      `conductive_taken=$(find ${codeDirectory} -mindepth 1 -maxdepth 1 -iname ${name} -print -quit)`,
      'test -z "$conductive_taken"',
      `/usr/bin/mv --no-clobber --no-target-directory -- "$conductive_clone" ${folder}`,
      'test ! -e "$conductive_clone"',
      'trap - EXIT HUP INT TERM',
    ].join('\n'),
  )
}

/** A missing or unrelated folder has no branch from this move. */
export function repositoryCloneBranchGuard(
  job: Pick<RepositoryChangeJob, 'id' | 'target'>,
): string {
  const folder = shellQuote(job.target.directory)
  return `if [ -L ${folder} ] || [ -L ${folder}/.git ] || [ ! -d ${folder}/.git ] ||
  [ "$(${GIT} -C ${folder} config --local --get ${CLONE_JOB_KEY} 2>/dev/null || true)" != ${shellQuote(job.id)} ]; then
  printf '\\n'
  exit 0
fi`
}
