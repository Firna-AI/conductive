import { lstat } from 'node:fs/promises'
import type { ImportLocations } from './types.ts'
import { readSource } from './source.ts'
import { sourceGit } from './git.ts'
import { inventory, nativeRoots } from './inventory.ts'
import { indexNativeFiles } from './native.ts'
import { FILE_LIMIT_BYTES } from './safe-files.ts'

/** Estimates use metadata. Unselected bundles and histories are never decoded. */
export async function scanSource(
  locations: ImportLocations,
  signal: AbortSignal,
  localWorkspaceId?: string,
) {
  const workspaces = readSource(locations).filter(
    (workspace) =>
      localWorkspaceId === undefined ||
      workspace.row.localWorkspaceId === localWorkspaceId,
  )
  const native = await indexNativeFiles(nativeRoots(locations), signal)
  const rows = []
  for (const workspace of workspaces) {
    signal.throwIfAborted()
    let row = workspace.row
    try {
      const state = await inventory(workspace, native, signal, false, locations)
      let bytes = state.files.reduce(
        (sum, file) =>
          sum +
          (file.kind === 'file' && file.size <= FILE_LIMIT_BYTES
            ? file.size
            : 0),
        0,
      )
      for (const memory of state.native)
        if (memory.path) bytes += (await lstat(memory.path)).size
      const git = await sourceGit(state.workspace.path!, signal)
      const counts = await git(['count-objects', '-v'])
      for (const line of counts.split('\n'))
        if (/^size(?:-pack)?: [0-9]+$/.test(line))
          bytes += Number(line.split(': ')[1]) * 1024
      row = { ...row, branch: state.branch, uploadBytes: bytes }
    } catch {
      signal.throwIfAborted()
    }
    rows.push(row)
  }
  return rows
}
