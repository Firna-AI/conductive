import type { DevicePairing } from '../../shared/device'
import type { FetchLike } from '../api/client'
import { Store } from '../store'
import { runImportOperation } from './import-operation'
import {
  actionOf,
  endMessage,
  requestOf,
  uploadOf,
  withEnd,
  withEvent,
  type ImportRow,
  type UploadItem,
} from './import-uploads'

/** The list of the workspaces of Conductor on this Mac, as the page shows it. */
type ScanState =
  | { kind: 'idle' }
  | { kind: 'reading' }
  /** The person did not allow the read. Ask again asks once more. */
  | { kind: 'denied' }
  /** This window has no live connection to its Mac. */
  | { kind: 'unavailable' }
  | { kind: 'failed'; message: string }
  | { kind: 'ready'; rows: readonly ImportRow[] }

export interface ImportState {
  scan: ScanState
  /** The local IDs of the selected rows. */
  selected: ReadonlySet<string>
  /** The uploads since the last Import, or null before one. */
  uploads: readonly UploadItem[] | null
}

/** What the model needs from the app. */
export interface ImportPorts {
  fetch: FetchLike
  /** The pairing of the connection of this window to its Mac, or null. */
  pairing: () => Promise<DevicePairing | null>
  /** A workspace that the import made, so that the list of the org shows it. */
  imported: (workspaceId: string) => void
}

/** A row that can import now: no import and no unfinished upload of it. */
export function importable(row: ImportRow): boolean {
  return row.state === 'available'
}

const notConnected = 'This Mac is not connected. Try again.'

/**
 * The import from Conductor into one org, in the Mac app. A scan reads the
 * workspaces of Conductor on this Mac, after the person allows it on the
 * Mac. Import uploads the selected workspaces one after the other, each in
 * its own operation, and Try again sends only what the server lacks. Each
 * operation uses the pairing of this window, and `stop` ends them all, as
 * when the page leaves. Nothing starts again by itself.
 */
export class ConductorImport {
  readonly state = new Store<ImportState>({
    scan: { kind: 'idle' },
    selected: new Set(),
    uploads: null,
  })
  private readonly orgId: string
  private readonly ports: ImportPorts
  private scanStop: AbortController | null = null
  private uploadStop = new AbortController()
  private uploading = false

  constructor(orgId: string, ports: ImportPorts) {
    this.orgId = orgId
    this.ports = ports
  }

  private change(next: Partial<ImportState>): void {
    this.state.change((current) => ({ ...current, ...next }))
  }

  private async pairing(): Promise<DevicePairing | null> {
    try {
      return await this.ports.pairing()
    } catch {
      return null
    }
  }

  /**
   * Reads the workspaces of Conductor on this Mac. The Mac asks the person
   * first, unless they allowed it before. Ask again reads once more, so
   * the Mac asks again. A newer scan makes the older one obsolete.
   */
  async scan(): Promise<void> {
    this.scanStop?.abort()
    const stop = new AbortController()
    this.scanStop = stop
    this.change({ scan: { kind: 'reading' } })
    const pairing = await this.pairing()
    if (stop.signal.aborted) return
    if (!pairing) return this.change({ scan: { kind: 'unavailable' } })
    const rows: ImportRow[] = []
    const end = await runImportOperation(
      this.ports.fetch,
      this.orgId,
      requestOf(pairing, { action: 'scan' }),
      (event) => {
        if (event.kind === 'scan') rows.push(...event.rows)
      },
      stop.signal,
    )
    if (stop.signal.aborted) return
    if (end.kind === 'done') {
      return this.change({ scan: { kind: 'ready', rows }, selected: new Set() })
    }
    if (end.kind === 'failed' && end.code === 'consent_required') {
      return this.change({ scan: { kind: 'denied' } })
    }
    this.change({
      scan: { kind: 'failed', message: endMessage(end) ?? notConnected },
    })
  }

  /** Selects or clears one row that can import. */
  toggle(localWorkspaceId: string): void {
    const { scan, selected } = this.state.get()
    if (scan.kind !== 'ready') return
    const row = scan.rows.find(
      (item) => item.localWorkspaceId === localWorkspaceId,
    )
    if (!row || !importable(row)) return
    const next = new Set(selected)
    if (next.has(localWorkspaceId)) next.delete(localWorkspaceId)
    else next.add(localWorkspaceId)
    this.change({ selected: next })
  }

  /** Select all: every row that can import, or none. */
  selectAll(on: boolean): void {
    const { scan } = this.state.get()
    if (scan.kind !== 'ready') return
    const ids = scan.rows.filter(importable).map((row) => row.localWorkspaceId)
    this.change({ selected: new Set(on ? ids : []) })
  }

  /** Uploads each selected row that can import, one after the other. */
  async importSelected(): Promise<void> {
    const { scan, selected } = this.state.get()
    if (scan.kind !== 'ready' || this.uploading) return
    const items = scan.rows
      .filter((row) => importable(row) && selected.has(row.localWorkspaceId))
      .map(uploadOf)
    if (items.length === 0) return
    this.change({ uploads: items })
    await this.run()
  }

  /**
   * Try again of one upload: a failed upload of this import, or a row of
   * the list whose upload stopped before. It sends only what the server
   * lacks, from the parts of its reservation.
   */
  async retry(localWorkspaceId: string): Promise<void> {
    if (this.uploading) return
    const { scan, uploads } = this.state.get()
    const failed = uploads?.find(
      (item) =>
        item.row.localWorkspaceId === localWorkspaceId &&
        item.state === 'failed',
    )
    if (failed) {
      this.update(localWorkspaceId, (item) => ({
        ...item,
        state: 'waiting',
        failure: null,
      }))
    } else {
      const row =
        scan.kind === 'ready'
          ? scan.rows.find((item) => item.localWorkspaceId === localWorkspaceId)
          : undefined
      if (row?.state !== 'unfinished' || row.reservationId === null) return
      this.change({ uploads: [uploadOf(row)] })
    }
    await this.run()
  }

  /**
   * Stops every operation, as when the page leaves. A later scan or Import
   * starts new operations, and nothing starts by itself.
   */
  stop(): void {
    this.scanStop?.abort()
    this.uploadStop.abort()
    this.uploadStop = new AbortController()
  }

  private update(id: string, change: (item: UploadItem) => UploadItem) {
    this.state.change((current) => ({
      ...current,
      uploads:
        current.uploads?.map((item) =>
          item.row.localWorkspaceId === id ? change(item) : item,
        ) ?? null,
    }))
  }

  /** Runs each waiting upload in turn, with the pairing of this window. */
  private async run(): Promise<void> {
    const { signal } = this.uploadStop
    this.uploading = true
    try {
      const pairing = await this.pairing()
      for (;;) {
        const next = this.state
          .get()
          .uploads?.find((item) => item.state === 'waiting')
        if (!next || signal.aborted) return
        await this.upload(next, pairing, signal)
      }
    } finally {
      this.uploading = false
    }
  }

  private async upload(
    item: UploadItem,
    pairing: DevicePairing | null,
    signal: AbortSignal,
  ): Promise<void> {
    const id = item.row.localWorkspaceId
    if (!pairing) {
      this.update(id, (current) => ({
        ...current,
        state: 'failed',
        failure: notConnected,
      }))
      return
    }
    this.update(id, (current) => ({ ...current, state: 'uploading' }))
    const end = await runImportOperation(
      this.ports.fetch,
      this.orgId,
      requestOf(pairing, actionOf(item)),
      (event) => {
        if (event.kind === 'complete') this.ports.imported(event.workspaceId)
        this.update(id, (current) => withEvent(current, event))
      },
      signal,
    )
    this.update(id, (current) => withEnd(current, end))
  }
}
