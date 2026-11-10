import { importInteger } from '../../src/shared/conductor-import-values.ts'
import { IMPORT_PART_BYTES } from '../../src/shared/conductor-import-pages.ts'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { requireOrgMember, requireWorkspaceOrg } from '../lifecycle/access'
import type { RequestContext } from '../security/gate'
import { sessionUser } from '../data/users'
import {
  nextDocumentPart,
  oldDocumentPage,
  readOldDocument,
} from './document-data'
import { createR2ImportStorage } from './r2-storage'

export async function conductorDocumentRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  now: () => number,
): Promise<Response | null> {
  const url = new URL(request.url)
  const match = url.pathname.match(
    /^\/api\/orgs\/([^/]+)\/workspaces\/([^/]+)\/conductor-documents(?:\/([^/]+))?$/,
  )
  if (!match) return null
  if (request.method !== 'GET')
    throw new HttpError(
      405,
      'method_not_allowed',
      'Use GET to read an old document.',
    )
  const orgId = decodeURIComponent(match[1])
  const workspaceId = decodeURIComponent(match[2])
  const access = async () => {
    if (!(await sessionUser(env.DB, context.sessionId, now())))
      throw new HttpError(401, 'sign_in_required', 'Sign in to continue.')
    await requireOrgMember(env.DB, orgId, context.user.id)
    await requireWorkspaceOrg(env.DB, orgId, workspaceId)
  }
  await access()
  if (!match[3]) {
    const cursor = url.searchParams.get('cursor')
    return Response.json(
      await oldDocumentPage(
        env.DB,
        orgId,
        workspaceId,
        cursor === null ? 0 : importInteger(Number(cursor)),
      ),
    )
  }
  if (!match[3].startsWith('i'))
    throw new HttpError(
      404,
      'document_not_found',
      'The old document is not available.',
    )
  const document = await readOldDocument(
    env.DB,
    orgId,
    workspaceId,
    decodeURIComponent(match[3].slice(1)),
  )
  if (!document)
    throw new HttpError(
      404,
      'document_not_found',
      'The old document is not available.',
    )
  const storage = createR2ImportStorage(
    env,
    { orgId, reservationId: workspaceId },
    { maxPartBytes: IMPORT_PART_BYTES, maxReadBytes: IMPORT_PART_BYTES },
  )
  let index = 0
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        await access()
        if (cancelled) return
        while (true) {
          if (!reader) {
            const next = await nextDocumentPart(
              env.DB,
              workspaceId,
              document.objectId,
              index,
            )
            if (cancelled) return
            if (!next) {
              controller.close()
              return
            }
            if (next.index !== index)
              throw new Error('The old document is incomplete.')
            index += 1
            reader = storage
              .streamDocument([
                {
                  scope: { orgId, reservationId: workspaceId },
                  part: next.part,
                },
              ])
              .getReader()
          }
          const next = await reader.read()
          await access()
          if (cancelled) return
          if (!next.done) {
            controller.enqueue(next.value)
            return
          }
          reader.releaseLock()
          reader = null
        }
      } catch {
        await reader?.cancel().catch(() => undefined)
        if (!cancelled)
          controller.error(new Error('The old document could not be read.'))
      }
    },
    async cancel(reason) {
      cancelled = true
      await reader?.cancel(reason)
    },
  })
  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
