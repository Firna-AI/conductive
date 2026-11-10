import { createReadStream, createWriteStream } from 'node:fs'
import { open } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { pipeline } from 'node:stream/promises'
import type { ImportRepositoryFacts } from '../../../src/shared/conductor-import-operation.ts'
import { importOid } from '../../../src/shared/conductor-import-values.ts'
import { git } from './git.ts'
import type { SourceInventory } from './types.ts'
import { LocalImportError } from './types.ts'

export async function bundleHeader(path: string, signal: AbortSignal) {
  const file = await open(path, 'r')
  const candidates: string[] = []
  let offset = 0
  let line = ''
  try {
    const bytes = Buffer.alloc(4096)
    while (true) {
      signal.throwIfAborted()
      const { bytesRead } = await file.read(bytes, 0, bytes.length, offset)
      if (!bytesRead) throw new LocalImportError('read_failed')
      for (let index = 0; index < bytesRead; index++) {
        offset++
        if (bytes[index] !== 10) {
          line += String.fromCharCode(bytes[index])
          continue
        }
        if (!line) return { candidates, offset }
        if (line.startsWith('-'))
          candidates.push(importOid(line.slice(1).split(' ')[0]))
        line = ''
      }
    }
  } finally {
    await file.close()
  }
}

async function coveredBoundaries(
  repository: string,
  boundaries: string[],
  roots: string[],
  signal: AbortSignal,
) {
  for (const boundary of boundaries) {
    let covered = roots.includes(boundary)
    for (const root of roots) {
      if (covered) break
      try {
        const bases = await git(
          repository,
          ['merge-base', '--all', boundary, root],
          signal,
          { allowFailure: true },
        )
        covered = bases.trim().split('\n').includes(boundary)
      } catch {
        signal.throwIfAborted()
        return false
      }
    }
    if (!covered) return false
  }
  return true
}

/** Only generated prerequisite lines change. Every capability, ref and PACK byte stays exact. */
async function normalizedBundle(
  path: string,
  destination: string,
  offset: number,
  roots: string[],
  signal: AbortSignal,
) {
  const output = await open(destination, 'wx', 0o600)
  let pending = Buffer.alloc(0)
  let inserted = false
  try {
    for await (const chunk of createReadStream(path, {
      end: offset - 1,
      signal,
    })) {
      pending = Buffer.concat([pending, chunk])
      let end: number
      while ((end = pending.indexOf(10)) !== -1) {
        signal.throwIfAborted()
        const line = pending.subarray(0, end + 1)
        pending = pending.subarray(end + 1)
        if (line[0] === 45) continue
        if (!inserted && line[0] !== 35 && line[0] !== 64) {
          await output.writeFile(
            roots.map((root) => `-${root} captured root\n`).join(''),
          )
          inserted = true
        }
        await output.writeFile(line)
      }
    }
    if (pending.length || !inserted) throw new LocalImportError('read_failed')
  } finally {
    await output.close()
  }
  await pipeline(
    createReadStream(path, { start: offset, signal }),
    createWriteStream(destination, { flags: 'a', mode: 0o600 }),
    { signal },
  )
  return destination
}

export async function buildBundle(
  directory: string,
  output: string,
  source: SourceInventory,
  facts: ImportRepositoryFacts,
  exclusions: string[] | undefined,
  signal: AbortSignal,
) {
  const repository = join(directory, 'repository.git')
  const available = new Set(
    [
      ...source.prerequisiteCandidates,
      facts.branchHeadOid,
      facts.defaultHeadOid,
    ].filter((oid) => oid !== null),
  )
  const eligible = new Set<string>()
  const history = join(output, 'history')
  await git(repository, ['rev-list', source.headOid], signal, {
    output: history,
  })
  const lines = createInterface({
    input: createReadStream(history),
    crlfDelay: Infinity,
  })
  try {
    for await (const line of lines) {
      signal.throwIfAborted()
      if (available.has(line)) eligible.add(line)
    }
  } finally {
    lines.close()
  }
  const omitted = [...eligible]
    .filter((oid) => exclusions === undefined || exclusions.includes(oid))
    .sort()
  const revisions = ['refs/heads/import', ...omitted.map((oid) => `^${oid}`)]
  const count = Number(
    (
      await git(repository, ['rev-list', '--count', ...revisions], signal)
    ).trim(),
  )
  if (!count) return { path: null, candidates: omitted, exclusions: omitted }
  const path = join(output, 'history.bundle')
  await git(
    repository,
    ['bundle', 'create', '--version=3', path, ...revisions],
    signal,
  )
  const header = await bundleHeader(path, signal)
  if (!omitted.length) return { path, candidates: [], exclusions: [] }
  if (
    !(await coveredBoundaries(repository, header.candidates, omitted, signal))
  ) {
    const full = join(output, 'history.full.bundle')
    await git(
      repository,
      ['bundle', 'create', '--version=3', full, 'refs/heads/import'],
      signal,
    )
    return { path: full, candidates: [], exclusions: [] }
  }
  return {
    path: await normalizedBundle(
      path,
      join(output, 'history.normalized.bundle'),
      header.offset,
      omitted,
      signal,
    ),
    candidates: omitted,
    exclusions: omitted,
  }
}
