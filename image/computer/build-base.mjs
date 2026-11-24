#!/usr/bin/env node
// @ts-check
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const require = createRequire(
  new URL('../../runner/package.json', import.meta.url),
)
const parent = join(root, '.context/computer-base')

try {
  const { build } = require('esbuild')
  await mkdir(parent, { recursive: true, mode: 0o700 })
  const scratch = await mkdtemp(join(parent, 'cli-'))
  try {
    const output = join(scratch, 'base-build.mjs')
    await build({
      absWorkingDir: root,
      entryPoints: ['image/computer/base-build.ts'],
      outfile: output,
      bundle: true,
      platform: 'node',
      target: 'node24',
      format: 'esm',
      logLevel: 'silent',
    })
    const { buildBase } = await import(pathToFileURL(output).href)
    await buildBase(root, process.argv.slice(2))
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error.'
  process.stderr.write(`The container base image command failed. ${message}\n`)
  process.exitCode = 1
}
