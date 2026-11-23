import { requireGitBranchName } from '../github/branch-name'
import { shellQuote } from './commands'
import {
  isolatedSourceCommand,
  sourceRepositoryUrl,
} from './image-sources/native-command'
import { CONTINUE_EXIT_CODES } from './continue-stop-causes'

export const BASE_CHANGE_GIT =
  '/usr/bin/git -c core.hooksPath=/dev/null -c core.askPass= -c credential.helper= -c http.followRedirects=false -c protocol.ext.allow=never -c submodule.recurse=false'

interface BaseChangeSource {
  stage: string
  baseBranch: string
}

/** Only the isolated stage can request the credential of this trusted job. */
export function baseChangeFetchCommand(
  input: BaseChangeSource & { fetchId: string; fullName: string },
): string {
  requireGitBranchName(input.baseBranch)
  const stage = shellQuote(input.stage)
  return isolatedSourceCommand(
    [
      'cd /tmp',
      `export CONDUCTIVE_TURN_ID=${shellQuote(input.fetchId)}`,
      `mkdir -p ${stage}`,
      `${BASE_CHANGE_GIT} init --bare --quiet --template= ${stage}`,
      `${BASE_CHANGE_GIT} --git-dir=${stage} -c credential.helper=/usr/local/bin/conductive-git-credential fetch --quiet --no-tags --no-recurse-submodules -- ${shellQuote(sourceRepositoryUrl(input.fullName))} ${shellQuote(`+refs/heads/${input.baseBranch}:refs/heads/continue-base`)}`,
    ].join('\n'),
  )
}

/** Import objects without a credential or the environment of an agent turn. */
export function baseReferenceCommands(
  input: BaseChangeSource & { directory: string; expectedBranch?: string },
): string[] {
  requireGitBranchName(input.baseBranch)
  const stage = shellQuote(input.stage)
  const base = shellQuote(`refs/remotes/origin/${input.baseBranch}`)
  return [
    `conductive_base_commit=$(${BASE_CHANGE_GIT} --git-dir=${stage} rev-parse --verify 'refs/heads/continue-base^{commit}')`,
    `cd ${shellQuote(input.directory)}`,
    ...(input.expectedBranch === undefined
      ? []
      : [
          `test "$(${BASE_CHANGE_GIT} symbolic-ref --short HEAD)" = ${shellQuote(input.expectedBranch)}`,
        ]),
    `${BASE_CHANGE_GIT} -c protocol.allow=never -c protocol.file.allow=always fetch --quiet --no-tags --no-recurse-submodules -- ${stage} ${shellQuote(`+refs/heads/continue-base:refs/remotes/origin/${input.baseBranch}`)}`,
    `test "$(${BASE_CHANGE_GIT} rev-parse --verify ${base})" = "$conductive_base_commit"`,
  ]
}

/**
 * The checkout of the next branch of Continue. A clash with the changed
 * files and a held index lock exit with their own codes, so the job stores
 * the cause.
 */
function nextBranchCommands(nextBranch: string, base: string): string[] {
  return [
    `if conductive_checkout_error=$(${BASE_CHANGE_GIT} checkout --quiet --no-track --no-overwrite-ignore -b ${shellQuote(nextBranch)} ${base} -- 2>&1); then`,
    '  unset conductive_checkout_error',
    'else',
    '  case "$conductive_checkout_error" in',
    `    "error: Your local changes to the following files would be overwritten by checkout:"*|"error: The following untracked working tree files would be overwritten by checkout:"*) exit ${CONTINUE_EXIT_CODES.checkoutClash} ;;`,
    `    "fatal: Unable to create '"*"/index.lock': File exists."*) exit ${CONTINUE_EXIT_CODES.indexLock} ;;`,
    '    *) exit 1 ;;',
    '  esac',
    'fi',
  ]
}

/**
 * Points `origin/HEAD` and the comparison of `branch` at its base. A failed
 * write exits with the code of failed comparison settings.
 */
export function baseChangeMetadataCommand(input: {
  branch: string
  baseBranch: string
}): string {
  const base = shellQuote(`refs/remotes/origin/${input.baseBranch}`)
  return `${BASE_CHANGE_GIT} symbolic-ref refs/remotes/origin/HEAD ${base} && ${BASE_CHANGE_GIT} config --local ${shellQuote(`branch.${input.branch}.gh-merge-base`)} ${shellQuote(input.baseBranch)} || exit ${CONTINUE_EXIT_CODES.comparisonMetadata}`
}

export function baseChangeInstallCommand(
  input: BaseChangeSource & {
    directory: string
    branch: string
    nextBranch?: string
  },
): string {
  requireGitBranchName(input.branch)
  if (input.nextBranch !== undefined) requireGitBranchName(input.nextBranch)
  const base = shellQuote(`refs/remotes/origin/${input.baseBranch}`)
  return isolatedSourceCommand(
    [
      ...baseReferenceCommands({
        ...input,
        expectedBranch:
          input.nextBranch === undefined ? undefined : input.branch,
      }),
      ...(input.nextBranch === undefined
        ? []
        : nextBranchCommands(input.nextBranch, base)),
      baseChangeMetadataCommand({
        branch: input.nextBranch ?? input.branch,
        baseBranch: input.baseBranch,
      }),
      `rm -rf -- ${shellQuote(input.stage)}`,
    ].join('\n'),
  )
}
