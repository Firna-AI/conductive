#!/usr/bin/env node
// @ts-check
import { mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(
  new URL('../runner/package.json', import.meta.url),
)
const { build } = require('esbuild')
const output = join(root, '.context/chat-live-check/cli.mjs')

try {
  process.umask(0o077)
  await mkdir(dirname(output), { recursive: true })
  await build({
    absWorkingDir: root,
    entryPoints: ['image/live-main.ts'],
    outfile: output,
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    nodePaths: [join(root, 'runner/node_modules')],
    external: ['miniflare', 'wrangler'],
    plugins: [
      {
        name: 'image-raw-assets',
        setup(builder) {
          builder.onResolve({ filter: /\?raw$/ }, (argument) => ({
            path: resolve(argument.resolveDir, argument.path.slice(0, -4)),
            namespace: 'image-raw',
          }))
          builder.onLoad(
            { filter: /.*/, namespace: 'image-raw' },
            async (argument) => ({
              contents: await readFile(argument.path, 'utf8'),
              loader: 'text',
            }),
          )
        },
      },
    ],
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
    logLevel: 'silent',
  })
  await import(pathToFileURL(output).href)
} catch {
  process.stderr.write(
    'The live check could not start. Install the runner packages and check the image scripts.\n',
  )
  process.exitCode = 1
}
