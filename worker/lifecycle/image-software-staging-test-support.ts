import { join, posix } from 'node:path'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { shellQuote } from './commands'
import { imageNodeExecutable } from './image-runtime'
import installScript from '../../image/install.sh?raw'
import runtimeInstall from '../../image/install-runtime.sh?raw'
import runnerStart from '../../image/runner-start.sh?raw'
import credentialStart from '../../image/git-credential-helper.sh?raw'
import credentialScript from '../../image/git-credential-helper.mjs?raw'
import githubCli from '../../image/github-cli.sh?raw'
import runnerService from '../../image/conductive-runner.service?raw'
import previewRelayStart from '../../image/preview-relay-start.sh?raw'
import previewRelayService from '../../image/conductive-preview-relay.service?raw'
import previewRelaySocket from '../../image/conductive-preview-relay.socket?raw'
import diskCacheRule from '../../image/60-conductive-disk-cache.rules?raw'
import { imageRuntimeScript } from './image-runtime'

const credentialRoots = ['/opt/conductive', '/run/ascii-secrets']
const softwareRoots = [
  ...credentialRoots,
  '/usr/local/bin',
  '/usr/bin',
  '/etc/systemd/system',
  '/etc/udev/rules.d',
  '/run/conductive',
]
const nodeMarker = '__CONDUCTIVE_STAGED_PRIVATE_NODE__'
const runnerUrlMarker = '__CONDUCTIVE_STAGED_RUNNER_URL__'
const runnerUrl = '${CONDUCTIVE_MACHINE_ORIGIN%/}' + MACHINE_PATHS.runner

function rootedScript(source: string, name: string, root: string): string {
  const credential = name === 'git-credential-helper.sh'
  if (
    !source.startsWith('#!/bin/sh\n') ||
    (credential && (/[`\\]/.test(source) || source.includes('$(')))
  )
    throw new Error(`Unsafe staged image script: ${name}`)

  // Protect the rendered Node path before mapping other production paths.
  const protectedSource = source
    .replaceAll(shellQuote(imageNodeExecutable()), nodeMarker)
    .replaceAll(runnerUrl, runnerUrlMarker)
  const roots = credential ? credentialRoots : softwareRoots
  const mapped = protectedSource.replace(
    /(?<![\w./-])\/[\w./-]+/g,
    (path: string, offset: number) => {
      if (offset === 2 && path === '/bin/sh') return path
      if (
        !roots.some(
          (prefix) => path === prefix || path.startsWith(`${prefix}/`),
        ) ||
        posix.normalize(path) !== path ||
        !/^[\s;"')]*$/.test(protectedSource[offset + path.length] ?? '')
      )
        throw new Error(`Unmapped staged image path: ${path}`)
      return shellQuote(join(root, path.slice(1)))
    },
  )
  return mapped
    .replaceAll(nodeMarker, shellQuote(imageNodeExecutable(root)))
    .replaceAll(runnerUrlMarker, runnerUrl)
}

/** Stage the legacy installer fixtures while older sandboxes still use them. */
export function stagedImageSoftware(root: string): ReadonlyMap<string, string> {
  const sources: Record<string, string> = {
    'install.sh': installScript,
    'install-runtime.sh': runtimeInstall,
    'runner-start.sh': runnerStart.replaceAll(
      '@RUNNER_PATH@',
      MACHINE_PATHS.runner,
    ),
    'git-credential-helper.sh': credentialStart,
    'git-credential-helper.mjs': credentialScript,
    'github-cli.sh': githubCli,
    'conductive-runner.service': runnerService,
    'preview-relay-start.sh': previewRelayStart,
    'conductive-preview-relay.service': previewRelayService,
    'conductive-preview-relay.socket': previewRelaySocket,
    '60-conductive-disk-cache.rules': diskCacheRule,
  }
  return new Map(
    Object.entries(sources).map(([name, source]) => [
      name,
      name.endsWith('.sh')
        ? rootedScript(imageRuntimeScript(source), name, root)
        : source,
    ]),
  )
}
