import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { ImportGitError } from './import-git'

export async function indexImportBundle(
  cwd: string,
  bundle: string,
  signal: AbortSignal,
) {
  const child = spawn('git', ['index-pack', '--stdin', '--fix-thin'], {
    cwd,
    signal,
    stdio: ['pipe', 'ignore', 'ignore'],
  })
  const ended = new Promise<number | null>((resolve, reject) => {
    child.on('error', reject)
    child.on('close', resolve)
  })
  async function* pack() {
    let started = false
    let newline = false
    for await (const bytes of createReadStream(bundle, { signal })) {
      const chunk = Buffer.from(bytes)
      if (started) {
        yield chunk
        continue
      }
      for (let index = 0; index < chunk.length; index++) {
        if (newline && chunk[index] === 10) {
          started = true
          yield chunk.subarray(index + 1)
          break
        }
        newline = chunk[index] === 10
      }
    }
    if (!started) throw new Error('The import bundle header is incomplete.')
  }
  await pipeline(Readable.from(pack()), child.stdin, { signal })
  if ((await ended) !== 0) throw new ImportGitError(null)
}

/** verify-pack sizes can describe delta instructions. cat-file gives canonical sizes. */
export async function completedPackFacts(
  cwd: string,
  indexes: readonly string[],
  signal: AbortSignal,
) {
  const sizes = spawn(
    'git',
    ['cat-file', '--batch-check=%(objectname) %(objectsize)'],
    { cwd, signal, stdio: ['pipe', 'pipe', 'ignore'] },
  )
  const sizeExit = new Promise<number | null>((resolve, reject) => {
    sizes.on('error', reject)
    sizes.on('close', resolve)
  })
  const counted = (async () => {
    let count = 0n,
      inflated = 0n,
      largest = 0n
    for await (const line of createInterface({
      input: sizes.stdout,
      crlfDelay: Infinity,
    })) {
      const [oid, rawSize] = line.split(' ')
      if (!/^[a-f0-9]{40,64}$/.test(oid) || !/^[0-9]+$/.test(rawSize))
        throw new Error('The imported Git object is missing.')
      const size = BigInt(rawSize)
      count++
      inflated += size
      if (size > largest) largest = size
    }
    return { count, inflated, largest }
  })()
  const seen = new Set<string>()
  try {
    for (const index of indexes) {
      const child = spawn('git', ['verify-pack', '-v', index], {
        cwd,
        signal,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      const ended = new Promise<number | null>((resolve, reject) => {
        child.on('error', reject)
        child.on('close', resolve)
      })
      for await (const line of createInterface({
        input: child.stdout,
        crlfDelay: Infinity,
      })) {
        const oid = line.split(' ', 1)[0]
        if (!/^[a-f0-9]{40,64}$/.test(oid) || seen.has(oid)) continue
        seen.add(oid)
        if (!sizes.stdin.write(`${oid}\n`))
          await once(sizes.stdin, 'drain', { signal })
      }
      if ((await ended) !== 0) throw new ImportGitError(null)
    }
    sizes.stdin.end()
    const result = await counted
    if ((await sizeExit) !== 0) throw new ImportGitError(null)
    return result
  } catch (error) {
    sizes.kill()
    await Promise.allSettled([counted, sizeExit])
    throw error
  }
}
