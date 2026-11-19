import { strict as assert } from 'node:assert'
import { rmSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

declare module 'vitest' {
  interface ProvidedContext {
    /** The global setup deletes `directory` with each folder inside it. */
    testStorage?: { template: string; directory: string }
  }
}

export interface TestDirectory {
  path: string
  remove(): Promise<void>
}

export async function testStorage() {
  if (process.env.VITEST_WORKER_ID === undefined) return undefined
  const { inject } = await import('vitest')
  return inject('testStorage')
}

function removableDirectory(path: string): TestDirectory {
  return { path, remove: () => rm(path, { recursive: true, force: true }) }
}

/** Allocates fixture files in the run folder, or system temp for standalone callers. */
export async function testDirectory(
  prefix = 'fixture-',
): Promise<TestDirectory> {
  const storage = await testStorage()
  return removableDirectory(
    await mkdtemp(join(storage?.directory ?? tmpdir(), prefix)),
  )
}

/** Selects a short tmux socket folder without creating the runtime folder. */
export async function testSocketDirectory(
  candidate: string,
): Promise<TestDirectory> {
  const limit = process.platform === 'darwin' ? 104 : 108
  const length = (directory: string) =>
    Buffer.byteLength(join(directory, 'tmux.sock'))
  if (length(candidate) < limit) return removableDirectory(candidate)
  const root = await mkdtemp('/tmp/cnd-socket-')
  const path = join(root, basename(candidate))
  const removeAtExit = () => rmSync(root, { recursive: true, force: true })
  process.once('exit', removeAtExit)
  assert(
    length(path) < limit,
    `A Unix socket path must use fewer than ${limit} bytes.`,
  )
  return {
    path,
    async remove() {
      await rm(root, { recursive: true, force: true })
      process.off('exit', removeAtExit)
    },
  }
}
