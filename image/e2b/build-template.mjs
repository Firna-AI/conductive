#!/usr/bin/env node
// @ts-check
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const require = createRequire(
  new URL('../../runner/package.json', import.meta.url),
)
const output = join(root, '.context/e2b-backup-provider/template-cli.mjs')

try {
  const { build } = require('esbuild')
  process.umask(0o077)
  await mkdir(dirname(output), { recursive: true })
  await build({
    absWorkingDir: root,
    entryPoints: ['image/e2b/template-build.ts'],
    outfile: output,
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    logLevel: 'silent',
  })
  const { buildTemplate } = await import(pathToFileURL(output).href)
  await buildTemplate(root, process.argv.slice(2))
} catch (error) {
  const message =
    error instanceof Error && error.name === 'TemplateBuildError'
      ? error.message
      : 'Install the runner packages and check the image scripts.'
  process.stderr.write(`The E2B template build failed. ${message}\n`)
  process.exitCode = 1
}
