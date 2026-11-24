import { spawn } from 'node:child_process'
import { copyFile, rename } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { URL } from 'node:url'
import { parseArgs } from 'node:util'

import { templateContext } from '../e2b/template-context'

async function prepare(root: string): Promise<string> {
  const template = await templateContext(root)
  const directory = join(root, '.context/computer-base', basename(template))
  await rename(template, directory)
  await Promise.all(
    ['Containerfile', 'systemctl-build.sh'].map((file) =>
      copyFile(join(root, 'image/computer', file), join(directory, file)),
    ),
  )
  return directory
}

function podman(args: readonly string[], capture = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('podman', args, {
      stdio: ['ignore', capture ? 'pipe' : process.stderr, 'inherit'],
    })
    let output = ''
    child.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
      output += chunk
    })
    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (code === 0) resolve(output.trim())
      else reject(new Error(`podman ${args[0]} failed (${code ?? signal}).`))
    })
  })
}

function releaseServer(value: string): string {
  const url = new URL(value)
  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username ||
    url.password ||
    url.href.includes('?') ||
    url.href.includes('#')
  ) {
    throw new Error(
      '--release-server needs an HTTP(S) base URL without credentials, a query, or a fragment.',
    )
  }
  return url.href.replace(/\/+$/, '')
}

export async function buildBase(root: string, args: string[]): Promise<void> {
  if (args.length === 1 && args[0] === '--prepare') {
    process.stdout.write(`${await prepare(root)}\n`)
    return
  }
  if (args.length === 1 && args[0] === '--tools') {
    const directory = await prepare(root)
    await podman([
      'build',
      '--file',
      join(directory, 'Containerfile'),
      '--target',
      'tools',
      '--tag',
      'localhost/conductive/base-tools:dev',
      directory,
    ])
    return
  }

  const { values } = parseArgs({
    args,
    options: {
      version: { type: 'string' },
      digest: { type: 'string' },
      archive: { type: 'string' },
      'release-server': { type: 'string' },
    },
  })
  const { version, digest, archive } = values
  if (!version || !/^0\.0\.[1-9][0-9]*$/.test(version))
    throw new Error(
      '--version needs a version of the form 0.0.<positive number>.',
    )
  if (!digest || !/^[0-9a-f]{64}$/.test(digest))
    throw new Error('--digest needs 64 lowercase hexadecimal characters.')
  if (!archive) throw new Error('--archive needs a path for the OCI archive.')
  const server = values['release-server']
  const buildArgs = [`RELEASE_VERSION=${version}`, `RELEASE_DIGEST=${digest}`]
  if (server !== undefined)
    buildArgs.push(`RELEASE_SERVER=${releaseServer(server)}`)

  const directory = await prepare(root)
  const image = `localhost/conductive/base:${version}`
  await podman([
    'build',
    '--file',
    join(directory, 'Containerfile'),
    '--tag',
    image,
    ...buildArgs.flatMap((argument) => ['--build-arg', argument]),
    directory,
  ])
  await podman([
    'save',
    '--format',
    'oci-archive',
    '--output',
    resolve(archive),
    image,
  ])
  const id = await podman(
    ['image', 'inspect', '--format', '{{.Id}}', image],
    true,
  )
  if (!/^(?:sha256:)?[0-9a-f]{64}$/.test(id))
    throw new Error('Podman did not report a valid image ID.')
  process.stdout.write(`${id}\n`)
}
