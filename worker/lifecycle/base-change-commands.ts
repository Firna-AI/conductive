import { requireGitBranchName } from '../github/branch-name'
import { shellQuote } from './commands'
import {
  isolatedSourceCommand,
  sourceRepositoryUrl,
} from './image-sources/native-command'
import { workspaceBaseSettings } from './workspace-base-command'

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
function baseReferenceCommands(
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
        : [
            `${BASE_CHANGE_GIT} checkout --quiet --no-track --no-overwrite-ignore -b ${shellQuote(input.nextBranch)} ${base} --`,
          ]),
      ...workspaceBaseSettings({
        branch: input.nextBranch ?? input.branch,
        baseBranch: input.baseBranch,
      }),
      `rm -rf -- ${shellQuote(input.stage)}`,
    ].join('\n'),
  )
}
