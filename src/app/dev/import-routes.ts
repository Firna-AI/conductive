import { conductorImportOperationsPath } from '../../shared/conductor-import'
import type {
  ImportPublicEvent,
  ImportScanRow,
  ImportRowState,
} from '../../shared/conductor-import-operation'
import { readImportAction } from '../../shared/conductor-import-operation-read'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { ID, type Route } from './router'

/** What a scan of the dev Mac finds: rows, nothing, or a refused consent first. */
export type DevImportScan = 'rows' | 'empty' | 'consent'

/** What an upload of the dev Mac does: it ends, or it stops for Try again. */
export type DevImportUpload = 'ok' | 'fail'

/** The time between two lines of an operation, so each state shows. */
const LINE_MS = 900

const megabyte = 1024 * 1024

type Row = ImportScanRow & ImportRowState

/** The workspaces of Conductor on the dev Mac, in each state of a row. */
function devRows(): Row[] {
  const base = (id: string, name: string, repository: string | null) => ({
    localWorkspaceId: id,
    name,
    repository,
    branch: `calummoore/${id}`,
    sessionCount: 3,
    uploadBytes: Math.round(4.8 * megabyte),
  })
  return [
    {
      ...base('coupons', 'Coupon rules', 'acme/storefront'),
      state: 'available',
    },
    {
      ...base('webhooks', 'Webhook signatures', 'acme/storefront'),
      uploadBytes: null,
      state: 'available',
    },
    {
      ...base('mobile', 'Mobile cart', 'acme/mobile-app'),
      state: 'unavailable',
    },
    {
      ...base('autocomplete', 'Address autocomplete', 'acme/storefront'),
      state: 'imported',
      workspaceId: FAKE_IDS.workspace,
    },
    {
      ...base('invoices', 'Invoice fonts', 'acme/storefront'),
      state: 'unfinished',
      reservationId: 'dev-reservation-invoices',
      storedBytes: Math.round(1.2 * megabyte),
      expiresAt: FAKE_TIME + 6 * 86_400_000,
    },
  ]
}

/** A reply of NDJSON lines, one after another, as the Worker streams them. */
function stream(events: readonly ImportPublicEvent[]): Response {
  const encoder = new TextEncoder()
  let index = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const next = () => {
        if (index >= events.length) return controller.close()
        controller.enqueue(encoder.encode(`${JSON.stringify(events[index])}\n`))
        index += 1
        timer = setTimeout(next, LINE_MS)
      }
      next()
    },
    cancel() {
      clearTimeout(timer)
    },
  })
  return new Response(body, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  })
}

/** The progress of an upload, with verified bytes and bytes on the way. */
function progress(id: string, storedBytes: number): ImportPublicEvent {
  return {
    kind: 'progress',
    reservation: {
      id: `dev-reservation-${id}`,
      localWorkspaceId: id,
      createdAt: FAKE_TIME,
      expiresAt: FAKE_TIME + 7 * 86_400_000,
      storedBytes,
      workspaceId: null,
    },
    inFlightBytes: megabyte,
  }
}

/**
 * The import operations of the dev Mac, as NDJSON: `status` and `dismiss`
 * with the state of the offer, a scan as `scan` says, and each upload and
 * Try again as `upload` says. A Try again always ends well, so the result
 * shows after a failed upload too. The dev Mac stores nothing.
 */
export function importRoutes(
  scan: DevImportScan,
  upload: DevImportUpload,
): Route[] {
  let dismissed = false
  let asked = false
  return [
    {
      method: 'POST',
      path: conductorImportOperationsPath(ID.org),
      answer: ({ body }) => {
        const action = readImportAction(body)
        const status = (): ImportPublicEvent => ({
          kind: 'status',
          available: true,
          dismissed,
          consent: 'unknown',
        })
        switch (action.action) {
          case 'status':
            return stream([status(), { kind: 'done' }])
          case 'dismiss':
            dismissed = true
            return stream([status(), { kind: 'done' }])
          case 'scan': {
            const refuse = scan === 'consent' && !asked
            asked = true
            if (refuse) {
              return stream([{ kind: 'failed', code: 'consent_required' }])
            }
            if (scan === 'empty') return stream([{ kind: 'done' }])
            const rows = devRows()
            return stream([
              { kind: 'scan', rows: rows.slice(0, 3) },
              { kind: 'scan', rows: rows.slice(3) },
              { kind: 'done' },
            ])
          }
          case 'upload':
          case 'retry': {
            const id = action.localWorkspaceId
            if (action.action === 'upload' && upload === 'fail') {
              return stream([
                progress(id, Math.round(1.6 * megabyte)),
                { kind: 'failed', code: 'upload_failed' },
              ])
            }
            return stream([
              progress(id, Math.round(1.6 * megabyte)),
              progress(id, Math.round(3.2 * megabyte)),
              {
                kind: 'complete',
                localWorkspaceId: id,
                workspaceId: 'apple-pay',
              },
              {
                kind: 'result.files',
                localWorkspaceId: id,
                files: [
                  { path: 'fixtures/orders.sqlite', sizeBytes: 180 * megabyte },
                ],
              },
              {
                kind: 'result.sessions',
                localWorkspaceId: id,
                sessions: [{ title: 'Draft refund rules' }],
              },
              { kind: 'done' },
            ])
          }
        }
      },
    },
  ]
}
