import { appendFile, lstat, mkdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import { Git, zeroPaths } from './git'
import type { GitPathClassifier } from './git-paths'

const CONTEXT_FOLDER = '.context'

export function contextFolderPath(cwd: string): string {
  return join(cwd, CONTEXT_FOLDER)
}

/**
 * Lists the untracked files of the context folder, also the ones that Git
 * ignores. All files shows them, and Changes still leaves them out. A nested
 * repository shows as one folder, as Git lists it.
 */
export async function contextFolderFiles(
  git: Git,
  classifier: GitPathClassifier,
  warn: (message: string) => void,
): Promise<string[]> {
  const folder = await classifier.classify(CONTEXT_FOLDER)
  if (folder.kind !== 'directory' || folder.submodule) return []
  try {
    const output = await git.run([
      'ls-files',
      '--others',
      '-z',
      '--',
      `${CONTEXT_FOLDER}/`,
    ])
    return zeroPaths(output).map((path) => path.replace(/\/$/u, ''))
  } catch (error) {
    if (git.signal?.aborted) throw error
    warn('The context folder files could not be listed.')
    return []
  }
}

function missingFile(error: unknown): undefined {
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
    return undefined
  throw error
}

export async function prepareContextFolder(
  cwd: string,
  warn: (message: string) => void,
): Promise<void> {
  try {
    const exclude = resolve(
      cwd,
      (await new Git(cwd).run(['rev-parse', '--git-path', 'info/exclude']))
        .toString('utf8')
        .trim(),
    )
    const rules = (await readFile(exclude, 'utf8').catch(missingFile)) ?? ''
    if (!rules.split(/\r?\n/u).includes('/.context/')) {
      await mkdir(dirname(exclude), { recursive: true })
      await appendFile(
        exclude,
        `${rules && !rules.endsWith('\n') ? '\n' : ''}/.context/\n`,
      )
    }
    const context = contextFolderPath(cwd)
    const existing = await lstat(context).catch(missingFile)
    if (existing && !existing.isDirectory()) {
      warn('The context folder is a file or a link. The runner will continue.')
      return
    }
    await mkdir(join(context, 'attachments'), { recursive: true })
  } catch {
    warn('The context folder could not be prepared. The runner will continue.')
  }
}
