import type { DiffResponse, FileResponse } from './files'

/** File requests are commands. Their results do not enter the chat event log. */
interface RunnerReadFile {
  type: 'file.read'
  requestId: string
  path: string
  /** The backend sets this limit before it asks the runner to read bytes. */
  maxBytes: number
}
interface RunnerReadDiff {
  type: 'file.diff'
  requestId: string
  path: string
  defaultBranch: string
}

export type RunnerFileError =
  | { code: 'file_not_found' | 'file_unavailable'; message: string }
  | {
      code: 'file_too_large'
      message: string
      sizeBytes: number
      limitBytes: number
    }

interface RunnerFileResult {
  type: 'file.read.result'
  requestId: string
  result:
    { ok: true; file: FileResponse } | { ok: false; error: RunnerFileError }
}
interface RunnerDiffResult {
  type: 'file.diff.result'
  requestId: string
  result:
    { ok: true; diff: DiffResponse } | { ok: false; error: RunnerFileError }
}

export type RunnerFileCommand = RunnerReadFile | RunnerReadDiff
export type RunnerFileResponse = RunnerFileResult | RunnerDiffResult
