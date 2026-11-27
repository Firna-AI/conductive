import type { BrowserChangesResponse } from '../../shared/generated/BrowserChangesResponse'
import type { DiffResponse } from '../../shared/generated/DiffResponse'
import type { FileResponse } from '../../shared/generated/FileResponse'
import type { FileTreeResponse } from '../../shared/generated/FileTreeResponse'
import { filePaths } from '../../shared/files'
import type { FilesStateRead } from '../../shared/workspace-state-read'
import {
  errorFromBody,
  errorFromThrown,
  failure,
  type FilesResult,
} from './files-errors'
import {
  parseChanges,
  parseDiffResponse,
  parseFileResponse,
} from './parse-changes'
import type { FileReportKind } from './parse-events'
import { parseFilesStateRead } from './parse-state-read'
import { parseFileTree } from './parse-tree'

/** The fetch of the browser, or a fake with the same shape. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export type FilesListResult<T> = FilesResult<T> & { stateRead?: FilesStateRead }

/** The file reads and the download address of one workspace. No method throws. */
export interface FilesClient {
  readTree(signal?: AbortSignal): Promise<FilesListResult<FileTreeResponse>>
  readChanges(
    signal?: AbortSignal,
  ): Promise<FilesListResult<BrowserChangesResponse>>
  readFile(
    path: string,
    signal?: AbortSignal,
  ): Promise<FilesResult<FileResponse>>
  readDiff(
    path: string,
    signal?: AbortSignal,
  ): Promise<FilesResult<DiffResponse>>
  /**
   * The address of the download route of one file. Download reads it with
   * the session cookie, and saves the file only when the route sends it.
   */
  downloadHref(path: string): string
}

export interface FilesClientOptions {
  fetch: FetchLike
  orgId: string
  workspaceId: string
}

async function readJson<T>(
  fetch: FetchLike,
  path: string,
  parse: (value: unknown) => T | null,
  signal: AbortSignal | undefined,
  report?: FileReportKind,
): Promise<FilesListResult<T>> {
  try {
    signal?.throwIfAborted()
    const response = await fetch(path, {
      headers: { Accept: 'application/json' },
      signal,
    })
    const body: unknown = await response.json().catch((error: unknown) => {
      if (errorFromThrown(error).kind === 'aborted') throw error
      return null
    })
    signal?.throwIfAborted()
    if (!response.ok) {
      const error = errorFromBody(response.status, body)
      const stateRead =
        report &&
        error.kind === 'failed' &&
        error.status === 503 &&
        error.code === 'file_unavailable'
          ? parseFilesStateRead(body, report)
          : undefined
      return stateRead ? { ok: false, error, stateRead } : failure(error)
    }
    const value = parse(body)
    if (value === null)
      return failure({ kind: 'failed', status: 200, code: 'invalid_response' })
    const stateRead = report && parseFilesStateRead(body, report)
    return stateRead ? { ok: true, value, stateRead } : { ok: true, value }
  } catch (thrown) {
    return failure(
      signal?.aborted ? { kind: 'aborted' } : errorFromThrown(thrown),
    )
  }
}

/** The client of the file routes, with the fetch that the shell injects. */
export function createFilesClient(options: FilesClientOptions): FilesClient {
  const { fetch, orgId, workspaceId } = options
  return {
    readTree: (signal) =>
      readJson(
        fetch,
        filePaths.tree(orgId, workspaceId),
        parseFileTree,
        signal,
        'files.snapshot',
      ),
    readChanges: (signal) =>
      readJson(
        fetch,
        filePaths.changes(orgId, workspaceId),
        parseChanges,
        signal,
        'changes.updated',
      ),
    readFile: (path, signal) =>
      readJson(
        fetch,
        filePaths.content(orgId, workspaceId, path),
        parseFileResponse,
        signal,
      ),
    readDiff: (path, signal) =>
      readJson(
        fetch,
        filePaths.diff(orgId, workspaceId, path),
        parseDiffResponse,
        signal,
      ),
    downloadHref: (path) => filePaths.download(orgId, workspaceId, path),
  }
}
