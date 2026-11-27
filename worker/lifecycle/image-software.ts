import type { CommitAuthor } from '../../src/shared/generated/CommitAuthor'
import { HttpError, isRecord } from '../http'
import { privilegedCommand } from '../terminal/privileged'
import { TERMINAL_FOLDER_FILE } from '../terminal/bridge/folder'
import { shellQuote } from './commands'
import { packagesStep, type ImagePackages } from './image-packages'
import {
  releaseInstallScript,
  startupBootstrap,
  type StartupBootstrap,
} from './software-bootstrap'
import type { SoftwareRelease } from './software-release'
import { savedScriptCommand, type SavedScript } from './saved-script'

export interface ImageSoftwareArtifact {
  url: string
  sha256: string
}

export function readImageSoftware(value: unknown): ImageSoftwareArtifact {
  if (
    !isRecord(value) ||
    typeof value.url !== 'string' ||
    typeof value.sha256 !== 'string' ||
    !/^[a-fA-F0-9]{64}$/.test(value.sha256)
  ) {
    throw new HttpError(
      503,
      'runner_software_unavailable',
      'The cloud computer software is not available. Try again later.',
    )
  }
  let url: URL
  try {
    url = new URL(value.url)
  } catch {
    throw new HttpError(
      503,
      'runner_software_unavailable',
      'The cloud computer software is not available. Try again later.',
    )
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new HttpError(
      503,
      'runner_software_unavailable',
      'The cloud computer software is not available. Try again later.',
    )
  }
  return { url: url.href, sha256: value.sha256.toLowerCase() }
}

/**
 * The software step of an image build, as one command. `when-missing` runs
 * the apt part only when the image lacks a package or a masked ttyd
 * service. The Worker chooses it only when the image holds the current apt
 * part, as `build-software.ts` says.
 */
export function installImageSoftware(
  release: SoftwareRelease,
  packages: ImagePackages = 'install',
): string {
  return [
    'set -eu',
    packagesStep(packages),
    privilegedCommand(releaseInstallScript(release)),
  ].join('\n')
}

/**
 * Git uses the owner's author outside an agent turn. The `author` and
 * `committer` keys win over a `user` setting that a script writes into a
 * repository. The runner's turn variables win over both.
 */
function ownerGitSettingsCommand(owner: CommitAuthor): string {
  return [
    '(',
    '  umask 022',
    ...['author', 'committer'].flatMap((role) => [
      `  sudo -n git config --system ${role}.name ${shellQuote(owner.name)}`,
      `  sudo -n git config --system ${role}.email ${shellQuote(owner.email)}`,
    ]),
    ')',
  ].join('\n')
}

/** The startup journal runs this before it creates any files. */
export const RELEASE_WORKSPACE_DISK_HOLD = `${privilegedCommand(
  'for setting in /sys/fs/ext4/*/reserved_clusters; do [ -f "$setting" ] || continue; echo 4096 > "$setting"; done',
)} 2>/dev/null || true`

export function workspaceStartupCommand(
  script: SavedScript,
  owner: CommitAuthor | null,
  mode: 'workspace' | 'retention' = 'workspace',
  bootstrap?: StartupBootstrap,
): string {
  const path =
    mode === 'retention'
      ? '/run/conductive/retention-startup.sh'
      : '/run/conductive/startup.sh'
  return [
    'set -eu',
    'umask 077',
    ...(owner ? [ownerGitSettingsCommand(owner)] : []),
    'sudo -n install -d -m 700 -o user -g user /run/conductive',
    // A start gives the terminal the folder of its variables again.
    `rm -f -- ${shellQuote(TERMINAL_FOLDER_FILE)}`,
    savedScriptCommand(path, script, [
      'set -a',
      '. /run/ascii-secrets/env.sh',
      'set +a',
      'cd "$CONDUCTIVE_REPOSITORY_DIR"',
    ]),
    ...(mode === 'workspace'
      ? [
          ...(bootstrap ? [startupBootstrap(bootstrap)] : []),
          'touch /run/conductive/workspace-ready',
          'sudo -n flock /run/conductive/bootstrap-activate.lock systemctl restart conductive-runner.service',
        ]
      : []),
    `${privilegedCommand('/opt/conductive/current/conductive disk hold')} 2>/dev/null || true`,
  ].join('\n')
}
