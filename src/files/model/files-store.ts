import type { ChangesResponse } from '../../shared/files'
import type { FilesClient } from '../api/files-client'
import type { FilesError } from '../api/files-errors'
import { parseStreamMessage, type StreamEnvelope } from '../api/parse-events'
import {
  emptySync,
  syncEvent,
  syncFetchedChanges,
  syncFetchedTree,
  type FilesSync,
  type SyncStep,
} from './files-sync'
import type { FileTree } from './tree-model'

/**
 * The workspace event stream. The first message holds the stored events
 * after `afterEventNumber`. Live events follow. The shell injects its
 * socket adapter, or `FakeWorkspaceEvents.subscribe` in development.
 */
export type FilesSubscribe = (
  afterEventNumber: number,
  listener: (message: unknown) => void,
) => () => void

export interface FilesSnapshot {
  tree: FileTree | null
  /** Why the tree did not load, while no tree shows. */
  treeError: FilesError | null
  changes: ChangesResponse | null
  changesError: FilesError | null
  /** The folders that the user opened or closed in this page session. */
  folders: ReadonlyMap<string, boolean>
  /** Grows when a full tree replaces the old one. */
  epoch: number
  /** Grows for each path whose content an event may have changed. */
  versions: ReadonlyMap<string, number>
}

type Resource = 'tree' | 'changes'

/**
 * The live files of one workspace: the tree and the changes from the file
 * routes, kept current by the file events of the workspace stream. It
 * skips repeated events, and reads the stream again after a gap.
 */
export class WorkspaceFiles {
  readonly client: FilesClient
  private readonly subscribeToStream: FilesSubscribe
  private sync: FilesSync = emptySync
  private snapshot: FilesSnapshot = {
    tree: null,
    treeError: null,
    changes: null,
    changesError: null,
    folders: new Map(),
    epoch: 0,
    versions: new Map(),
  }
  private readonly listeners = new Set<() => void>()
  private readonly reads = new Map<Resource, AbortController>()
  private lastEventNumber = 0
  private synced = false
  private subscription = 0
  private unsubscribe: (() => void) | null = null
  private running = false

  constructor(options: { client: FilesClient; subscribe: FilesSubscribe }) {
    this.client = options.client
    this.subscribeToStream = options.subscribe
  }

  /** Reads the files and follows the stream. Safe to call again after stop. */
  start(): void {
    if (this.running) return
    this.running = true
    this.listen()
    if (!this.sync.tree || this.sync.treeStale) this.read('tree')
    if (!this.sync.changes) this.read('changes')
  }

  stop(): void {
    this.running = false
    this.subscription += 1
    this.unsubscribe?.()
    this.unsubscribe = null
    this.reads.forEach((controller) => controller.abort())
    this.reads.clear()
  }

  /** Reads the tree and the changes again where they failed. */
  retry(): void {
    if (!this.running) return
    if (!this.sync.tree || this.sync.treeStale) this.read('tree')
    if (!this.sync.changes) this.read('changes')
  }

  setFolderOpen(path: string, open: boolean): void {
    const folders = new Map(this.snapshot.folders).set(path, open)
    this.publish({ folders })
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): FilesSnapshot => this.snapshot

  private publish(change: Partial<FilesSnapshot>): void {
    const { tree, changes } = this.sync
    this.snapshot = { ...this.snapshot, tree, changes, ...change }
    this.listeners.forEach((listener) => listener())
  }

  private listen(): void {
    const subscription = ++this.subscription
    this.unsubscribe?.()
    this.unsubscribe = this.subscribeToStream(
      this.lastEventNumber,
      (message) => {
        if (subscription === this.subscription) this.receive(message)
      },
    )
  }

  private receive(raw: unknown): void {
    const message = parseStreamMessage(raw)
    if (!message) return
    if (message.type === 'history') {
      const live = this.synced
      for (const envelope of message.envelopes) this.take(envelope, live)
      this.lastEventNumber = Math.max(
        this.lastEventNumber,
        message.throughEventNumber,
      )
      this.synced = true
      return this.publish({})
    }
    // A gap: subscribe again, so the history brings the missed events.
    if (message.envelope.eventNumber > this.lastEventNumber + 1) {
      return this.listen()
    }
    if (this.take(message.envelope, true)) this.publish({})
  }

  /** Takes one numbered event once. True when it was a new file event. */
  private take(envelope: StreamEnvelope, live: boolean): boolean {
    if (envelope.eventNumber <= this.lastEventNumber) return false
    this.lastEventNumber = envelope.eventNumber
    if (!envelope.event) return false
    this.apply(syncEvent(this.sync, envelope.event), live)
    return true
  }

  private apply(step: SyncStep, live: boolean): void {
    this.sync = step.sync
    if (live && (step.allTouched || step.touched.size > 0)) {
      const versions = new Map(this.snapshot.versions)
      step.touched.forEach((path) => {
        versions.set(path, (versions.get(path) ?? 0) + 1)
      })
      const epoch = this.snapshot.epoch + (step.allTouched ? 1 : 0)
      this.snapshot = { ...this.snapshot, versions, epoch }
    }
    if (this.sync.treeStale && !this.reads.has('tree')) this.read('tree')
  }

  private read(resource: Resource): void {
    this.reads.get(resource)?.abort()
    const controller = new AbortController()
    this.reads.set(resource, controller)
    this.publish(
      resource === 'tree' ? { treeError: null } : { changesError: null },
    )
    const done = () => {
      if (this.reads.get(resource) !== controller) return false
      this.reads.delete(resource)
      return true
    }
    if (resource === 'tree') {
      void this.client.readTree(controller.signal).then((result) => {
        if (!done()) return
        if (result.ok)
          this.apply(syncFetchedTree(this.sync, result.value), true)
        this.publish({ treeError: result.ok ? null : result.error })
      })
      return
    }
    void this.client.readChanges(controller.signal).then((result) => {
      if (!done()) return
      if (result.ok) {
        this.apply(syncFetchedChanges(this.sync, result.value), true)
      }
      this.publish({ changesError: result.ok ? null : result.error })
    })
  }
}

/** The version of one path. A page reads it again when it changes. */
export function versionOf(snapshot: FilesSnapshot, path: string): string {
  return `${snapshot.epoch}.${snapshot.versions.get(path) ?? 0}`
}
