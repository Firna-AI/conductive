import {
  conductorOldDocumentPath,
  conductorOldDocumentsPath,
  type ConductorOldDocument,
  type ConductorOldDocuments,
} from '../shared/conductor-import'
import { readConductorOldDocuments } from '../shared/conductor-import-documents-read'
import { ApiError, type ApiClient } from './api/client'
import { ParseError, record, text } from './api/parse'
import { asApiError, loading, ready, Store, type Loadable } from './store'

/** A page of old documents, or an answer that the app cannot read. */
function readPage(body: unknown) {
  try {
    return readConductorOldDocuments(body)
  } catch {
    throw new ParseError('The old documents are not valid.')
  }
}

/** The address of one page of the metadata, from its cursor. */
function pagePath(orgId: string, workspaceId: string, cursor: number) {
  const path = conductorOldDocumentsPath(orgId, workspaceId)
  return cursor === 0 ? path : `${path}?cursor=${cursor}`
}

/** The error of a refused read, as the API names it in its JSON body. */
async function refusal(response: Response): Promise<ApiError> {
  try {
    const error = record(record(await response.json()).error, 'error')
    return new ApiError(
      response.status,
      text(error, 'code'),
      text(error, 'message'),
    )
  } catch {
    return new ApiError(
      response.status,
      'http_error',
      "The session didn't load. Try again.",
    )
  }
}

/**
 * The sessions that a workspace kept from Conductor, as old documents: the
 * metadata of each, read page by page, and the Markdown of each. The routes
 * of the app keep them for the life of the workspace, so they read in each
 * state of the workspace, also before its activation and after its Archive.
 * They never read the cloud computer, and nothing in them starts it.
 */
export class ConductorDocuments {
  /** Each old document, in the order of the pages, once every page came. */
  readonly list = new Store<Loadable<readonly ConductorOldDocument[]>>(loading)
  private readonly api: ApiClient
  private readonly orgId: string
  private readonly workspaceId: string
  private run = 0
  private started = false

  constructor(api: ApiClient, orgId: string, workspaceId: string) {
    this.api = api
    this.orgId = orgId
    this.workspaceId = workspaceId
  }

  /** Reads the list once. Later calls read nothing, as a return shows it. */
  open(): void {
    if (this.started) return
    this.started = true
    void this.reload()
  }

  /**
   * Reads every page of the list again, as Try again does, and shows it
   * when the last page came. A failed page shows its error, and a newer
   * read makes each older one obsolete.
   */
  async reload(): Promise<void> {
    const run = ++this.run
    this.started = true
    if (this.list.get().state === 'failed') this.list.set(loading)
    const documents: ConductorOldDocument[] = []
    let cursor: number | null = 0
    try {
      while (cursor !== null) {
        const page: ConductorOldDocuments = await this.api.get(
          pagePath(this.orgId, this.workspaceId, cursor),
          readPage,
        )
        if (run !== this.run) return
        documents.push(...page.documents)
        cursor = page.nextCursor
      }
    } catch (error) {
      if (run === this.run) {
        this.list.set({ state: 'failed', error: asApiError(error) })
      }
      return
    }
    this.list.set(ready(documents))
  }

  /** The metadata of one old document, when the list has it. */
  document(documentId: string): ConductorOldDocument | null {
    const list = this.list.get()
    if (list.state !== 'ready') return null
    return list.value.find((item) => item.id === documentId) ?? null
  }

  /**
   * The Markdown of one old document, as UTF-8 text. It rejects with the
   * error of the API, or with an abort when `signal` stops it.
   */
  async read(documentId: string, signal?: AbortSignal): Promise<string> {
    const path = conductorOldDocumentPath(
      this.orgId,
      this.workspaceId,
      documentId,
    )
    let response: Response
    try {
      response = await this.api.fetch(path, {
        credentials: 'same-origin',
        headers: { Accept: 'text/markdown, text/plain' },
        signal,
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new ApiError(
        0,
        'network',
        "The app can't reach the server. Check the connection, then try again.",
      )
    }
    if (!response.ok) throw await refusal(response)
    return response.text()
  }
}
