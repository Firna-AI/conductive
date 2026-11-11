import { spawn } from 'node:child_process'

import type { ImportSnapshot } from '../../src/shared/conductor-import-manifest.ts'
import { importRepositoryName } from '../../src/shared/conductor-import-values.ts'
import { ImportStorage } from './import-storage'

export class ImportGitError extends Error {
  readonly exitCode: number | null
  constructor(exitCode: number | null) {
    super('The imported repository could not be restored. Try again.')
    this.exitCode = exitCode
  }
}

export function importGit(
  cwd: string,
  activationId: string,
  signal: AbortSignal,
  args: readonly string[],
  capture = true,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'git',
      [
        '--no-optional-locks',
        '-c',
        'core.fsmonitor=false',
        '-c',
        'core.hooksPath=/dev/null',
        '-c',
        'filter.lfs.process=',
        '-c',
        'filter.lfs.smudge=',
        '-c',
        'filter.lfs.required=false',
        ...args,
      ],
      {
        cwd,
        signal,
        env: {
          ...process.env,
          CONDUCTIVE_TURN_ID: '',
          CONDUCTIVE_ACTIVATION_ID: activationId,
          GIT_LFS_SKIP_SMUDGE: '1',
          GIT_TERMINAL_PROMPT: '0',
        },
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    )
    const chunks: Buffer[] = []
    let length = 0
    child.stdout.on('data', (bytes: Buffer) => {
      if (!capture) return
      length += bytes.length
      if (length > 1_048_576) {
        child.kill()
        reject(new ImportGitError(null))
      } else chunks.push(bytes)
    })
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0
        ? resolve(Buffer.concat(chunks).toString('utf8').trim())
        : reject(new ImportGitError(code)),
    )
  })
}

export async function verifyImportTree(
  cwd: string,
  activationId: string,
  snapshot: ImportSnapshot,
  signal: AbortSignal,
) {
  const git = (args: string[]) => importGit(cwd, activationId, signal, args)
  if (
    (await git(['rev-parse', `${snapshot.headOid}^{tree}`])) !==
    snapshot.gitDisk.treeOid
  )
    throw new Error('The imported Git tree does not match.')
  const child = spawn(
    'git',
    ['ls-tree', '-r', '-t', '-z', '-l', snapshot.headOid],
    { cwd, signal, stdio: ['ignore', 'pipe', 'ignore'] },
  )
  const ended = new Promise<number | null>((resolve, reject) => {
    child.on('error', reject)
    child.on('close', resolve)
  })
  let pending = Buffer.alloc(0)
  let files = 0,
    fileBytes = 0n,
    directories = 0,
    links = 0,
    linkBytes = 0n,
    pathBytes = 0n
  for await (const chunk of child.stdout) {
    pending = Buffer.concat([pending, Buffer.from(chunk)])
    let end: number
    while ((end = pending.indexOf(0)) >= 0) {
      const entry = pending.subarray(0, end)
      pending = pending.subarray(end + 1)
      const tab = entry.indexOf(9)
      const [mode, , , size] = entry
        .subarray(0, tab)
        .toString()
        .trim()
        .split(/\s+/)
      pathBytes += BigInt(entry.length - tab - 1)
      if (mode === '040000') directories++
      else if (mode === '120000') {
        links++
        linkBytes += BigInt(size)
      } else if (mode === '100644' || mode === '100755') {
        files++
        fileBytes += BigInt(size)
      }
    }
  }
  const exit = await ended
  const tree = snapshot.gitDisk.checkout
  if (
    exit !== 0 ||
    files !== tree.fileCount ||
    fileBytes !== BigInt(tree.fileBytes) ||
    directories !== tree.directoryCount ||
    links !== tree.symlinkCount ||
    linkBytes !== BigInt(tree.symlinkBytes) ||
    pathBytes !== BigInt(tree.pathBytes)
  )
    throw new Error('The imported checkout facts do not match.')
}

export async function prepareImportGit(
  storage: ImportStorage,
  cwd: string,
  activationId: string,
  defaultBranch: string,
  signal: AbortSignal,
) {
  const snapshot = await storage.snapshot()
  const git = (args: string[]) => importGit(cwd, activationId, signal, args)
  if (
    importRepositoryName(
      await git(['config', '--get', 'remote.origin.url']),
    ) !== snapshot.repository ||
    (await git(['rev-parse', '--show-object-format'])) !== snapshot.objectFormat
  )
    throw new Error('The imported repository identity does not match.')
  let remoteBranch: string | null = snapshot.branch
  try {
    await git([
      'ls-remote',
      '--exit-code',
      '--heads',
      'origin',
      `refs/heads/${remoteBranch}`,
    ])
  } catch (error) {
    if (!(error instanceof ImportGitError) || error.exitCode !== 2) throw error
    remoteBranch = defaultBranch
    try {
      await git([
        'ls-remote',
        '--exit-code',
        '--heads',
        'origin',
        `refs/heads/${defaultBranch}`,
      ])
    } catch (error) {
      if (!(error instanceof ImportGitError) || error.exitCode !== 2)
        throw error
      remoteBranch = null
    }
  }
  if (remoteBranch !== null)
    await storage.mark('fetch-history', async () => {
      const shallow =
        (await git(['rev-parse', '--is-shallow-repository'])) === 'true'
      await git([
        'fetch',
        '--no-tags',
        ...(shallow ? ['--unshallow'] : []),
        'origin',
        `+refs/heads/${remoteBranch}:refs/remotes/origin/${remoteBranch}`,
      ])
    })
  for await (const entry of storage.entries()) {
    if (entry.kind !== 'prerequisite') continue
    await storage.mark(`prerequisite:${entry.oid}`, async () => {
      if ((await git(['rev-parse', '--is-shallow-repository'])) === 'true')
        await git(['fetch', '--no-tags', '--unshallow', 'origin', entry.oid])
      try {
        await git(['cat-file', '-e', `${entry.oid}^{commit}`])
      } catch {
        await git(['fetch', '--no-tags', 'origin', entry.oid])
      }
    })
  }
  return remoteBranch === snapshot.branch
}
