import type { LocalWork } from '../../src/shared/workspaces'
import { HttpError } from '../http'
import { shellQuote } from './commands'

export function localWorkCommand(directory: string): string {
  return `set -eu\ncd ${shellQuote(directory)}\ngit status --porcelain=v1 -z --untracked-files=all\nprintf '\\0'\ngit rev-list --count HEAD --branches --not --remotes`
}

export function localWorkResult(output: string): LocalWork {
  const separator = output.lastIndexOf('\0')
  const count = output.slice(separator + 1).trim()
  if (
    separator < 0 ||
    !/^\d+$/.test(count) ||
    !Number.isSafeInteger(Number(count))
  )
    throw localWorkUnavailable()
  const records = output.slice(0, separator).split('\0').filter(Boolean)
  const uncommittedFiles: string[] = []
  for (let index = 0; index < records.length; index++) {
    const record = records[index]
    if (record.length < 4 || record[2] !== ' ') throw localWorkUnavailable()
    uncommittedFiles.push(record.slice(3))
    if (record.slice(0, 2).includes('R') || record.slice(0, 2).includes('C'))
      index++
  }
  return { uncommittedFiles, unpushedCommits: Number(count) }
}

export function localWorkUnavailable(): HttpError {
  return new HttpError(
    409,
    'sandbox_unavailable',
    'Open the workspace to check its saved work. Then try again.',
  )
}
