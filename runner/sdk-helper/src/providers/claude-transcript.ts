import { mkdir, readdir, rename, stat } from 'node:fs/promises'
import { join } from 'node:path'

/** Claude replaces each character outside A-Z, a-z, and 0-9 with a hyphen. */
export function claudeProjectFolder(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/gu, '-')
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (missing(error)) return false
    throw error
  }
}

function missing(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
  )
}

/**
 * Claude reads a saved session from the project folder of its working
 * folder. After a repository change, the session is in the project folder
 * of the old folder. This moves the transcript and its folder of the same
 * ID into the project folder of `cwd`, so that the resume finds it. A move
 * keeps one transcript, so a later move back finds the newest one. A
 * missing or ambiguous session stays where it is, and the resume then
 * reports its own failure.
 */
export async function moveClaudeTranscript(
  configDirectory: string,
  cwd: string,
  conversationId: string,
  warn: (message: string) => void,
): Promise<void> {
  const folder = claudeProjectFolder(cwd)
  if (!/^[A-Za-z0-9-]+$/u.test(conversationId) || folder.length > 200) return
  const projects = join(configDirectory, 'projects')
  const target = join(projects, folder)
  const file = `${conversationId}.jsonl`
  try {
    if (await exists(join(target, file))) return
    const sources: string[] = []
    for (const entry of await readdir(projects, { withFileTypes: true }))
      if (
        entry.isDirectory() &&
        (await exists(join(projects, entry.name, file)))
      )
        sources.push(join(projects, entry.name))
    if (sources.length !== 1) {
      if (sources.length > 1)
        warn('The saved Claude session exists in more than one project folder.')
      return
    }
    const [source] = sources
    await mkdir(target, { recursive: true, mode: 0o700 })
    await rename(join(source, file), join(target, file))
    const companion = join(source, conversationId)
    if (
      (await exists(companion)) &&
      !(await exists(join(target, conversationId)))
    )
      await rename(companion, join(target, conversationId))
  } catch (error) {
    if (!missing(error))
      warn('The saved Claude session could not move to the repository folder.')
  }
}
