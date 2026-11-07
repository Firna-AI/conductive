#!/usr/bin/env node
// @ts-check
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function record(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** @param {string} command @param {string[]} args */
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' })
  if (result.error || result.status !== 0)
    throw new Error(
      `The ${command === process.execPath ? 'runner build' : command} command failed.`,
    )
  return result.stdout.trim()
}

/** @param {string} target */
async function digest(target) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(target)) hash.update(chunk)
  return hash.digest('hex')
}

/** @param {string} destination Copy installed runtime packages from the lockfile. */
async function dependencies(destination) {
  /** @type {unknown} */
  const lock = JSON.parse(
    await readFile(join(root, 'runner/package-lock.json'), 'utf8'),
  )
  if (!record(lock) || !record(lock.packages))
    throw new Error('Invalid runner lockfile.')
  for (const [path, metadata] of Object.entries(lock.packages)) {
    if (!path || !record(metadata) || metadata.dev === true) continue
    if (!path.startsWith('node_modules/') || path.split('/').includes('..'))
      throw new Error('Invalid runtime package path.')
    const source = join(root, 'runner', path)
    try {
      await stat(source)
    } catch (error) {
      if (
        record(error) &&
        error.code === 'ENOENT' &&
        metadata.optional === true
      )
        continue
      throw new Error(
        'Install the runner packages with npm ci --prefix runner first.',
      )
    }
    await mkdir(dirname(join(destination, path)), { recursive: true })
    await cp(source, join(destination, path), {
      recursive: true,
      filter: (entry) =>
        entry === source ||
        !relative(source, entry).split(sep).includes('node_modules'),
    })
  }
}

async function packageRunner() {
  const { values } = parseArgs({
    options: {
      node: { type: 'string' },
      url: { type: 'string' },
      output: {
        type: 'string',
        default: '.context/runner-artifact/runner.tar.gz',
      },
      help: { type: 'boolean', short: 'h' },
    },
  })
  if (values.help) {
    process.stdout.write(
      'Usage: node image/package-runner.mjs --node /absolute/node24 --url https://host/runner.tar.gz [--output .context/runner-artifact/runner.tar.gz]\n',
    )
    return
  }
  if (process.platform !== 'linux' || process.arch !== 'x64')
    throw new Error(
      'Package on Linux x64 with Linux x64 runner packages installed.',
    )
  if (!values.node?.startsWith('/') || !values.url)
    throw new Error(
      'Pass an absolute Node 24 executable and the public archive URL.',
    )
  const url = new URL(values.url)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      'Use a public HTTPS archive URL without credentials, query, or fragment.',
    )
  const output = resolve(root, values.output)
  const context = join(root, '.context')
  if (!output.startsWith(`${context}${sep}`))
    throw new Error('Save the archive under .context/.')
  if (!/^v24\./.test(run(values.node, ['--version'])))
    throw new Error('The archive needs Node 24.')
  await mkdir(dirname(output), { recursive: true, mode: 0o700 })
  const stage = await mkdtemp(join(context, 'runner-package-'))
  try {
    run(process.execPath, ['runner/scripts/build.mjs'])
    await mkdir(join(stage, 'node/bin'), { recursive: true })
    await mkdir(join(stage, 'runner'), { recursive: true })
    await cp(values.node, join(stage, 'node/bin/node'), { dereference: true })
    await chmod(join(stage, 'node/bin/node'), 0o755)
    for (const [source, destination] of [
      ['dist/runner/runner.mjs', 'main.mjs'],
      ['dist/runner/measure.mjs', 'measure.mjs'],
      ['dist/runner/compare.mjs', 'compare.mjs'],
      ['runner/package.json', 'package.json'],
      ['runner/package-lock.json', 'package-lock.json'],
    ])
      await cp(join(root, source), join(stage, 'runner', destination))
    await dependencies(join(stage, 'runner'))
    run('tar', [
      '--sort=name',
      '--mtime=@0',
      '--owner=0',
      '--group=0',
      '--numeric-owner',
      '--format=gnu',
      '-I',
      'gzip -n',
      '-cf',
      output,
      '-C',
      stage,
      'node',
      'runner',
    ])
    const sha256 = await digest(output)
    const artifact = { url: url.href, sha256 }
    await writeFile(
      `${output}.sha256`,
      `${sha256}  ${output.split(sep).at(-1)}\n`,
    )
    await writeFile(`${output}.json`, `${JSON.stringify(artifact, null, 2)}\n`)
    process.stdout.write(
      `${JSON.stringify({ archive: output, artifact, deployment: 'Publish the archive at artifact.url. Supply this artifact as the lifecycle software option.' }, null, 2)}\n`,
    )
  } finally {
    await rm(stage, { recursive: true, force: true })
  }
}

void packageRunner().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Runner packaging failed.'}\n`,
  )
  process.exitCode = 1
})
