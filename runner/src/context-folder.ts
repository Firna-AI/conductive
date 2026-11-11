import { appendFile, lstat, mkdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import { Git } from './git'

export function contextFolderPath(cwd: string): string {
  return join(cwd, '.context')
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
    await prepareContextExclude(cwd)
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

export async function prepareContextExclude(cwd: string): Promise<void> {
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
}
