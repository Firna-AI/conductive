import { lstat, readdir } from 'node:fs/promises'
import { fileIdentity, missing, sourcePath } from './safe-files.ts'
import { LocalImportError } from './types.ts'

type WalkPolicy =
  | { kind: 'context' }
  | {
      kind: 'git'
      ignored(paths: string[], repositories: string[]): Promise<Set<string>>
    }

/** Links are entries. Only ordinary directories are traversed. */
export async function walkSourceTree(
  root: string,
  candidate: string,
  signal: AbortSignal,
  policy: WalkPolicy,
): Promise<string[]> {
  const paths: string[] = []
  const repositories: string[] = []
  let directoryCandidate = false
  const visit = async (path: string, first = false): Promise<void> => {
    signal.throwIfAborted()
    const full = sourcePath(root, path)
    const before = await lstat(full, { bigint: true }).catch(
      (error: unknown) => {
        if (missing(error)) return null
        throw error
      },
    )
    if (!before) {
      if (policy.kind === 'git') paths.push(path)
      return
    }
    paths.push(path)
    if (!before.isDirectory() || before.isSymbolicLink()) return
    if (first) directoryCandidate = true
    const entries = await readdir(full, { withFileTypes: true })
    for (const entry of entries) {
      if (/^\.git$/i.test(entry.name)) {
        if (entry.name === '.git' && !entry.isSymbolicLink())
          repositories.push(path)
        continue
      }
      await visit(`${path}/${entry.name}`)
    }
    if (
      fileIdentity(before) !== fileIdentity(await lstat(full, { bigint: true }))
    )
      throw new LocalImportError('source_changed')
  }
  await visit(candidate.replace(/\/+$/, ''), true)
  if (policy.kind !== 'git' || !directoryCandidate) return paths
  const ignored = await policy.ignored(paths, repositories)
  return paths.filter((path) => !ignored.has(path))
}
