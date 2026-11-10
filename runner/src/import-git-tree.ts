import { spawn } from 'node:child_process'

import { ImportGitError } from './import-git'

export interface ImportTreeEntry {
  mode: string
  oid: string
  size: number
  path: string
}

export async function* importTreeEntries(
  cwd: string,
  head: string,
  signal: AbortSignal,
): AsyncGenerator<ImportTreeEntry> {
  const child = spawn('git', ['ls-tree', '-r', '-t', '-z', '-l', head], {
    cwd,
    signal,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const ended = new Promise<number | null>((resolve, reject) => {
    child.on('error', reject)
    child.on('close', resolve)
  })
  let pending = Buffer.alloc(0)
  for await (const bytes of child.stdout) {
    pending = Buffer.concat([pending, Buffer.from(bytes)])
    let end: number
    while ((end = pending.indexOf(0)) >= 0) {
      const entry = pending.subarray(0, end)
      pending = pending.subarray(end + 1)
      const tab = entry.indexOf(9)
      const [mode, , oid, size] = entry
        .subarray(0, tab)
        .toString()
        .trim()
        .split(/\s+/)
      if (tab < 0 || !/^[a-f0-9]{40,64}$/.test(oid))
        throw new Error('Invalid imported Git tree.')
      yield {
        mode,
        oid,
        size: size === '-' ? 0 : Number(size),
        path: entry.subarray(tab + 1).toString('utf8'),
      }
    }
  }
  if ((await ended) !== 0 || pending.length) throw new ImportGitError(null)
}
