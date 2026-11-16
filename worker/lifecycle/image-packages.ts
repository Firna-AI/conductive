import { sha256Hex } from '../software-image/digest'
import { privilegedCommand } from '../terminal/privileged'
import { terminalPackagesCommand } from '../terminal/service'

/** How the software step treats the apt packages of an image. */
export type ImagePackages = 'install' | 'when-missing'

const PACKAGES = ['ttyd', 'tmux', 'gh'] as const

/**
 * The apt part of the software step. Ubuntu owns these packages, so apt
 * installs and upgrades them. The step also masks the package's own ttyd
 * service, which holds the terminal port.
 */
export function imagePackagesCommand(): string {
  return [
    terminalPackagesCommand(),
    privilegedCommand('set -eu\numask 022\napt-get install -y gh'),
  ].join('\n')
}

/**
 * The version of the apt part alone. A release changes no part of it, so
 * a new release does not run apt again. Each image records this version.
 */
export function imagePackagesVersion(): Promise<string> {
  return sha256Hex(imagePackagesCommand())
}

/**
 * Runs the apt part when the image holds an older apt part, or when a
 * package is missing or the ttyd service is not masked. The check reads
 * only the dpkg database and the unit state, so it takes no network time.
 */
export function packagesStep(packages: ImagePackages): string {
  if (packages === 'install') return imagePackagesCommand()
  const installed = `dpkg-query -W -f='\${Status}\\n' ${PACKAGES.join(' ')} 2>/dev/null | grep -cx 'install ok installed'`
  return [
    `if [ "$(${installed})" = ${PACKAGES.length} ] &&`,
    '  [ "$(systemctl is-enabled ttyd.service 2>/dev/null || true)" = masked ]; then',
    "  printf '%s\\n' 'The system packages are already installed.'",
    'else',
    imagePackagesCommand(),
    'fi',
  ].join('\n')
}
