import { Buffer } from 'node:buffer'
import { join, posix } from 'node:path'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { shellQuote } from './commands'
import { imageNodeExecutable } from './image-runtime'
import { installImageSoftware } from './image-software'

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

/** Read the files that the production image command stages for installation. */
export function stagedImageSoftware(root: string): ReadonlyMap<string, string> {
  const command = installImageSoftware({
    url: 'https://software.example.test/runner.tar.gz',
    sha256: '0'.repeat(64),
  })
  const writes = command.matchAll(
    /^printf %s '([A-Za-z0-9+/=]*)' \| base64 -d > '\/opt\/conductive\/staged\/([\w.-]+)'$/gm,
  )
  const files = new Map<string, string>()
  for (const [, encoded, name] of writes) {
    const source = Buffer.from(encoded, 'base64').toString('utf8')
    files.set(
      name,
      name.endsWith('.sh') ? rootedScript(source, name, root) : source,
    )
  }
  return files
}
