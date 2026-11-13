import { symlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

import '../sdk-helper/scripts/build.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
await build({
  absWorkingDir: root,
  entryPoints: {
    runner: 'src/main.ts',
    relay: 'src/relay/main.ts',
    measure: 'sdk-helper/src/measure.ts',
    compare: 'sdk-helper/src/compare.ts',
  },
  outdir: '../dist/runner',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  packages: 'external',
})
try {
  await symlink(
    '../../runner/node_modules',
    `${root}/../dist/runner/node_modules`,
    'dir',
  )
} catch (error) {
  if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST'))
    throw error
}
