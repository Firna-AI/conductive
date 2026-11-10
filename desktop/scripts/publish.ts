import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

import { publishRelease } from './publish-release.ts'
import { runReleaseCommand } from './release-command.ts'

const tag = process.env.RELEASE_TAG
const version = process.env.RELEASE_VERSION
if (!tag || !version)
  throw new Error('Set RELEASE_TAG and RELEASE_VERSION to publish')

const controller = new AbortController()
const cancel = () => controller.abort()
process.once('SIGINT', cancel)
process.once('SIGTERM', cancel)
try {
  const outcome = await publishRelease(
    {
      tag,
      version,
      directory: resolve(import.meta.dirname, '../dist/release'),
    },
    {
      run: (program, args) =>
        runReleaseCommand(program, args, process.env, controller.signal),
      list: (directory) => readdir(directory),
      read: (path) => readFile(path, 'utf8'),
      size: async (path) => {
        const file = await stat(path)
        if (!file.isFile()) throw new Error(`Expected a release file: ${path}`)
        return file.size
      },
      warn: (message) => process.stderr.write(`${message}\n`),
    },
  )
  process.stdout.write(`Release ${tag}: ${outcome}\n`)
} finally {
  process.removeListener('SIGINT', cancel)
  process.removeListener('SIGTERM', cancel)
}
