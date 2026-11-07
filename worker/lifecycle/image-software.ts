import credentialScript from '../../image/git-credential-helper.mjs?raw'
import credentialStart from '../../image/git-credential-helper.sh?raw'
import installScript from '../../image/install.sh?raw'
import runnerService from '../../image/conductive-runner.service?raw'
import runnerStart from '../../image/runner-start.sh?raw'
import { HttpError, isRecord } from '../http'
import { terminalInstallCommand } from '../terminal/service'
import { shellQuote, writeFileCommand } from './commands'
import { savedScriptCommand } from './saved-script'

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

export function installImageSoftware(artifact: ImageSoftwareArtifact): string {
  const files: Readonly<Record<string, string>> = {
    'install.sh': installScript,
    'runner-start.sh': runnerStart,
    'git-credential-helper.sh': credentialStart,
    'git-credential-helper.mjs': credentialScript,
    'conductive-runner.service': runnerService,
  }
  return [
    'set -eu',
    'sudo -n install -d -m 700 -o user -g user /opt/conductive/staged',
    ...Object.entries(files).map(([name, text]) =>
      writeFileCommand(`/opt/conductive/staged/${name}`, text, '644'),
    ),
    `sudo -n sh /opt/conductive/staged/install.sh ${shellQuote(artifact.url)} ${shellQuote(artifact.sha256)}`,
    terminalInstallCommand(),
  ].join('\n')
}

export function workspaceStartupCommand(
  script: string,
  mode: 'workspace' | 'retention' = 'workspace',
): string {
  const path =
    mode === 'retention'
      ? '/run/conductive/retention-startup.sh'
      : '/run/conductive/startup.sh'
  return [
    'set -eu',
    'umask 077',
    'sudo -n install -d -m 700 -o user -g user /run/conductive',
    savedScriptCommand(path, script, [
      'set -a',
      '. /run/ascii-secrets/env.sh',
      'set +a',
      'cd "$CONDUCTIVE_REPOSITORY_DIR"',
    ]),
    ...(mode === 'workspace'
      ? [
          'touch /run/conductive/workspace-ready',
          'sudo -n systemctl restart conductive-runner.service',
        ]
      : []),
  ].join('\n')
}
