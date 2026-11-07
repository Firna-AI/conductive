import { shellQuote } from '../commands'
import type { SelectedRepository } from '../settings-data'
import { IMAGE_SOURCE_CREDENTIAL_PATH } from './credential'

const GIT =
  '/usr/bin/git -c core.hooksPath=/dev/null -c core.askPass= -c credential.helper= -c http.followRedirects=false -c protocol.ext.allow=never'

export function sourceRepositoryUrl(fullName: string): string {
  const parts = fullName.split('/')
  if (
    parts.length !== 2 ||
    parts.some((part) => !part || part === '.' || part === '..')
  )
    throw new Error('Invalid repository name')
  return `https://github.com/${parts.map(encodeURIComponent).join('/')}.git`
}

export function sourceStagingDirectory(buildId: string, index: number): string {
  return `/home/user/conductive/source-fetch/${encodeURIComponent(buildId)}/${index}.git`
}

/** Source output never enters provider or build logs. The environment starts empty. */
export function isolatedSourceCommand(body: string): string {
  return `/usr/bin/env -i PATH=/usr/bin:/bin HOME=/home/user LC_ALL=C TZ=UTC GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 GIT_CEILING_DIRECTORIES=/home/user /bin/sh -c ${shellQuote(`set -eu\numask 077\n${body}`)} > /dev/null 2>&1`
}

/** A consumed grant can remain in command history. The GitHub token cannot. */
export function fetchSourceCommand(input: {
  origin: string
  grant: string
  buildId: string
  index: number
  repository: SelectedRepository
}): string {
  const directory = sourceStagingDirectory(input.buildId, input.index)
  const helper =
    '!f() { if [ "$1" = get ]; then printf "username=x-access-token\\npassword=%s\\n\\n" "$CONDUCTIVE_IMAGE_GIT_TOKEN"; fi; }; f'
  return isolatedSourceCommand(
    [
      `test ! -e ${shellQuote(directory)}`,
      `mkdir -p ${shellQuote(directory.slice(0, directory.lastIndexOf('/')))}`,
      `token=$(/usr/bin/curl --disable --proto '=https' --tlsv1.2 --max-redirs 0 --connect-timeout 10 --max-time 30 --silent --fail --request POST --header ${shellQuote(`Authorization: Bearer ${input.grant}`)} ${shellQuote(`${input.origin}${IMAGE_SOURCE_CREDENTIAL_PATH}`)})`,
      'test -n "$token"',
      `CONDUCTIVE_IMAGE_GIT_TOKEN="$token" ${GIT} -c credential.helper=${shellQuote(helper)} clone --bare --quiet --no-recurse-submodules --template= -- ${shellQuote(sourceRepositoryUrl(input.repository.fullName))} ${shellQuote(directory)}`,
      'unset token',
    ].join('\n'),
  )
}

/** Import from the token-free bare clone only after confirmed revocation. */
export function finalizeSourceCommand(input: {
  buildId: string
  index: number
  repository: SelectedRepository
  directory: string
}): string {
  const directory = shellQuote(input.directory)
  const staging = shellQuote(sourceStagingDirectory(input.buildId, input.index))
  const branch = shellQuote(input.repository.defaultBranch)
  const localRef = shellQuote(`refs/heads/${input.repository.defaultBranch}`)
  const remoteRef = shellQuote(
    `refs/remotes/origin/${input.repository.defaultBranch}`,
  )
  const url = shellQuote(sourceRepositoryUrl(input.repository.fullName))
  return isolatedSourceCommand(
    [
      `${GIT} check-ref-format ${localRef}`,
      `format="$(${GIT} --git-dir=${staging} rev-parse --show-object-format)"`,
      `mkdir -p ${directory}`,
      // Existing config is read only after revocation. Keep installed repository settings.
      `if [ ! -d ${directory}/.git ]; then ${GIT} init --quiet --template= --object-format="$format" --initial-branch=${branch} ${directory}; fi`,
      `cd ${directory}`,
      `${GIT} config --local remote.origin.url ${url}`,
      `${GIT} config --local remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'`,
      `${GIT} -c protocol.file.allow=always fetch --quiet --no-recurse-submodules --prune --prune-tags --tags ${staging} '+refs/heads/*:refs/remotes/origin/*' '+refs/tags/*:refs/tags/*'`,
      `if ${GIT} show-ref --verify --quiet ${remoteRef}; then`,
      `  ${GIT} symbolic-ref refs/remotes/origin/HEAD ${remoteRef}`,
      `  ${GIT} checkout --force -B ${branch} ${remoteRef} --`,
      'else',
      `  test -z "$(${GIT} --git-dir=${staging} for-each-ref --count=1 --format='%(refname)')"`,
      `  ${GIT} rm -r -f --ignore-unmatch -- .`,
      `  ${GIT} update-ref -d ${localRef}`,
      `  ${GIT} update-ref -d ${remoteRef}`,
      `  if ${GIT} symbolic-ref -q refs/remotes/origin/HEAD > /dev/null; then ${GIT} symbolic-ref --delete refs/remotes/origin/HEAD; fi`,
      `  ${GIT} symbolic-ref HEAD ${localRef}`,
      'fi',
      `${GIT} config --local ${shellQuote(`branch.${input.repository.defaultBranch}.remote`)} origin`,
      `${GIT} config --local ${shellQuote(`branch.${input.repository.defaultBranch}.merge`)} ${localRef}`,
      `rm -rf -- ${staging}`,
    ].join('\n'),
  )
}
