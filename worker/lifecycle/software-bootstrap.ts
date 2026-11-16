import { privilegedCommand } from '../terminal/privileged'
import { shellQuote } from './commands'
import type { SoftwareRelease } from './software-release'

export type StartupBootstrap =
  { release: SoftwareRelease } | { warning: string }

function bootstrapDownload(release: SoftwareRelease): string {
  return [
    'conductive_bootstrap=$(mktemp -d)',
    'trap \'rm -rf "$conductive_bootstrap"\' EXIT',
    `curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --output "$conductive_bootstrap/program.tar.gz" ${shellQuote(release.url)}`,
    `printf '%s  %s\\n' ${shellQuote(release.sha256)} "$conductive_bootstrap/program.tar.gz" | sha256sum --check --status`,
    'tar -xzf "$conductive_bootstrap/program.tar.gz" -C "$conductive_bootstrap" conductive',
    'test -x "$conductive_bootstrap/conductive"',
  ].join('\n')
}

/**
 * The root script that installs the newest release in an image build. An
 * image that holds the program uses its own updater, which downloads only
 * the parts that changed. A missing program, a failed check, or a check
 * that does not reach the release falls back to the verified bootstrap
 * download. Either way one apply then activates the newest release.
 */
export function releaseInstallScript(release: SoftwareRelease): string {
  const server = shellQuote(release.server)
  const complete = shellQuote(
    `/opt/conductive/versions/${release.version}/complete`,
  )
  return [
    'set -eu',
    'umask 022',
    'conductive_program=/opt/conductive/current/conductive',
    'if [ -x "$conductive_program" ] &&',
    `  "$conductive_program" update check --bootstrap --server ${server} &&`,
    `  [ -f ${complete} ]; then`,
    '  conductive_installer="$conductive_program"',
    'else',
    '  if [ -x "$conductive_program" ]; then',
    "    printf '%s\\n' 'The installed updater did not get the release. Downloading the full release.' >&2",
    '  fi',
    bootstrapDownload(release),
    `"$conductive_bootstrap/conductive" update check --bootstrap --server ${server}`,
    '  conductive_installer="$conductive_bootstrap/conductive"',
    'fi',
    '"$conductive_installer" update apply',
    'test -x /opt/conductive/current/conductive',
    'test -f /opt/conductive/current/complete',
    '/opt/conductive/current/conductive update started',
  ].join('\n')
}

export function startupBootstrap(input: StartupBootstrap): string {
  if ('warning' in input)
    return `if [ ! -x /opt/conductive/current/conductive ]; then printf '%s\\n' ${shellQuote(input.warning)} >&2; fi`
  const release = input.release
  const activate = [
    'set -eu',
    'if [ ! -x /opt/conductive/current/conductive ]; then',
    '  "$1/conductive" update apply',
    '  test -x /opt/conductive/current/conductive',
    '  test -f /opt/conductive/current/complete',
    '  /opt/conductive/current/conductive update started',
    'fi',
  ].join('\n')
  const background = [
    'set -eu',
    'umask 022',
    'exec 9>/run/conductive/bootstrap.lock',
    'flock -n 9 || exit 0',
    'test ! -x /opt/conductive/current/conductive || exit 0',
    bootstrapDownload(release),
    `"$conductive_bootstrap/conductive" update check --bootstrap --server ${shellQuote(release.server)}`,
    `flock /run/conductive/bootstrap-activate.lock sh -c ${shellQuote(activate)} sh "$conductive_bootstrap"`,
  ].join('\n')
  return [
    'if [ ! -x /opt/conductive/current/conductive ]; then',
    privilegedCommand(
      `nohup setsid sh -c ${shellQuote(background)} </dev/null >/run/conductive/bootstrap.log 2>&1 &`,
    ),
    'fi',
  ].join('\n')
}
