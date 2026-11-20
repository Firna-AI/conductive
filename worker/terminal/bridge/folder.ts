/**
 * The folder of a new workspace shell. After a repository change, the
 * Worker writes the folder of the new repository to this file, because the
 * start variables of the terminal services still name the old folder. The
 * startup command deletes the file at each start, because the start
 * variables then name the folder of the workspace's repository.
 */
export const TERMINAL_FOLDER_FILE = '/run/conductive/repository'

const folderPattern = /^\/home\/user\/code\/[A-Za-z0-9._-]+$/

/**
 * The folder for a new shell: the folder of the file when it names a
 * repository folder that exists, or else the folder of the command line.
 */
export function terminalFolder(
  argument: string,
  read: () => string | null,
  isDirectory: (path: string) => boolean,
): string {
  const text = read()
  if (text === null) return argument
  const folder = text.endsWith('\n') ? text.slice(0, -1) : text
  const name = folder.slice(folder.lastIndexOf('/') + 1)
  return folderPattern.test(folder) &&
    name !== '.' &&
    name !== '..' &&
    isDirectory(folder)
    ? folder
    : argument
}
