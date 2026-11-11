import { relative } from 'node:path'
import { ignoredSourcePaths, userExcludesFile } from './git.ts'
import type { ImportLocations } from './locations.ts'
import { sourcePath } from './safe-files.ts'
import { walkSourceTree } from './source-walk.ts'

/** Outer rules and each encountered nested repository's rules both apply. */
export async function candidatePaths(
  root: string,
  candidates: string[],
  excludes: string,
  ignoreIndex: string,
  locations: ImportLocations,
  signal: AbortSignal,
): Promise<Set<string>> {
  const ignored = async (paths: string[], repositories: string[]) => {
    const blocked = new Set(
      await ignoredSourcePaths(root, paths, excludes, ignoreIndex, signal),
    )
    for (const repo of repositories) {
      const directory = sourcePath(root, repo)
      const children = paths.filter((path) => path.startsWith(`${repo}/`))
      const nested = await ignoredSourcePaths(
        directory,
        children.map((path) => relative(directory, sourcePath(root, path))),
        await userExcludesFile(directory, locations, signal),
        ignoreIndex,
        signal,
      )
      for (const path of children)
        if (nested.has(relative(directory, sourcePath(root, path))))
          blocked.add(path)
    }
    return blocked
  }
  const result = new Set<string>()
  for (const path of candidates.filter(Boolean)) {
    if (path === '.context' || path.startsWith('.context/')) {
      const contextPath = path.replace(/\/+$/, '')
      if (!contextPath.split('/').some((part) => /^\.git$/i.test(part)))
        result.add(contextPath)
      continue
    }
    for (const child of await walkSourceTree(root, path, signal, {
      kind: 'git',
      ignored,
    }))
      result.add(child)
  }
  for (const path of await walkSourceTree(root, '.context', signal, {
    kind: 'context',
  }))
    result.add(path)
  return result
}
