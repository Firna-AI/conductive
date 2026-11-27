import { filePaths } from '../../src/shared/files'
import {
  filterChanges,
  filterDiffResponse,
  filterFileResponse,
  filterTree,
} from '../../src/shared/output-fields'
import type { AppEnv, HttpFetch } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { gate } from '../security/gate'
import { runningOutputSecrets } from '../lifecycle/output-secrets'
import { secretTextFilter } from '../secrets/output-values'
import { filesWorkspace } from './access'
import type { FilesWorkspace } from './data'
import { readBoatFile } from './boat'
import { fileBytes } from './content'
import { FileTooLargeError, fileUnavailable } from './errors'
import type { FilesListRead, WorkspaceFileLists } from './list-reads'
import { checkByteLimit, readFilePath } from './paths'
import type { WorkspaceFilesPort } from './workspace'

export interface FilesHandlerOptions {
  /** Required backend policy. Fixtures do not set the product limit. */
  maxFileBytes: number
  fileLists: WorkspaceFileLists
  workspaceFiles: (
    workspace: FilesWorkspace,
  ) => WorkspaceFilesPort | Promise<WorkspaceFilesPort>
  repositoryRoot: (workspace: FilesWorkspace) => string | Promise<string>
  fetch: HttpFetch
  now: () => number
}

/** Standalone gated handler. No storage, runner, or provider access precedes authorization. */
export function createFilesHandler(options: FilesHandlerOptions) {
  checkByteLimit(options.maxFileBytes)
  return async (request: Request, env: AppEnv): Promise<Response> => {
    try {
      const context = await gate(request, env, options.now())
      const url = new URL(request.url)
      const match = url.pathname.match(
        /^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)\//,
      )
      if (
        !match ||
        !context.org ||
        request.method !== 'GET' ||
        request.headers.has('Upgrade')
      ) {
        throw new HttpError(404, 'not_found', 'The page is not available.')
      }
      let workspaceId: string
      try {
        workspaceId = decodeURIComponent(match[1])
      } catch {
        throw new HttpError(
          404,
          'workspace_not_found',
          'The workspace is not available.',
        )
      }
      const workspace = await filesWorkspace(env, context, workspaceId)
      const paths = filePaths
      let response: Response
      if (url.pathname === paths.tree(context.org.id, workspaceId)) {
        response = fileListResponse(
          await options.fileLists.tree(env, workspace, filterTree),
        )
      } else if (url.pathname === paths.changes(context.org.id, workspaceId)) {
        response = fileListResponse(
          await options.fileLists.changes(env, workspace, filterChanges),
        )
      } else {
        const text = secretTextFilter(
          await runningOutputSecrets(env, workspace),
        )
        const files = await options.workspaceFiles(workspace)
        const path = readFilePath(url.searchParams.get('path'))
        if (
          url.pathname ===
          new URL(paths.diff(context.org.id, workspaceId, path), url).pathname
        ) {
          const changes = await files.changes()
          const diff = await files.diff(
            path,
            changes?.baseBranch ?? workspace.defaultBranch,
            request.signal,
          )
          if (!diff) throw fileUnavailable()
          for (const content of [
            diff.oldContent,
            diff.newContent,
            diff.patch,
          ]) {
            const size =
              content === null
                ? 0
                : new TextEncoder().encode(content).byteLength
            if (size > options.maxFileBytes)
              throw new FileTooLargeError(size, options.maxFileBytes)
          }
          response = Response.json(filterDiffResponse(diff, text))
        } else {
          const contentPath = new URL(
            paths.content(context.org.id, workspaceId, path),
            url,
          ).pathname
          const downloadPath = new URL(
            paths.download(context.org.id, workspaceId, path),
            url,
          ).pathname
          if (url.pathname !== contentPath && url.pathname !== downloadPath) {
            throw new HttpError(404, 'not_found', 'The page is not available.')
          }
          const pending = await files.read(
            path,
            options.maxFileBytes,
            request.signal,
          )
          const rawFile =
            pending ??
            (await readBoatFile(
              env,
              context.user.id,
              workspace,
              await options.repositoryRoot(workspace),
              path,
              options.maxFileBytes,
              options.fetch,
            ))
          const file = filterFileResponse(rawFile, text)
          response =
            url.pathname === contentPath
              ? Response.json(file)
              : new Response(fileBytes(file), {
                  headers: {
                    'Content-Type': file.mediaType,
                    'Content-Length': String(file.sizeBytes),
                    'Content-Disposition': downloadDisposition(path),
                  },
                })
        }
      }
      return privateResponse(response)
    } catch (error) {
      return privateResponse(
        error instanceof FileTooLargeError
          ? error.response()
          : errorResponse(error, request),
      )
    }
  }
}

function fileListResponse<List extends object>({
  list,
  stateRead,
}: FilesListRead<List>): Response {
  if (list) return Response.json({ ...list, stateRead })
  const { status, code, message } = fileUnavailable()
  return Response.json({ error: { code, message }, stateRead }, { status })
}

function downloadDisposition(path: string): string {
  const name = encodeURIComponent(path.split('/').pop() ?? path).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `attachment; filename*=UTF-8''${name}`
}
