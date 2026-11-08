import type { ChangesResponse } from '../../shared/files'
import type { FilesClient } from '../api/files-client'
import type { FilesError } from '../api/files-errors'
import { parseStreamMessage, type StreamEnvelope } from '../api/parse-events'
import {
  noFailedRepairs,
  repairsAfter,
  type FailedRepairs,
} from './failed-repairs'
import { FilesInvalidation } from './files-invalidation'
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
  /**
   * The cloud computer could not read the files. `tree` is the saved tree,
   * or empty when none was saved. Only a full tree of the stream clears it.
   */
  treeUnavailable: boolean
  changes: ChangesResponse | null
  changesError: FilesError | null
  /** The folders that the user opened or closed in this page session. */
  folders: ReadonlyMap<string, boolean>
  /** Grows when affected paths cannot be named, including tree replacement. */
  epoch: number
  /** Grows for each path whose content an event may have changed. */
  versions: ReadonlyMap<string, number>
  /**
   * The file lists whose fresh full report was lost too. Only a newer full
   * report of the same list in the stream clears one.
   */
  failedRepairs: FailedRepairs
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
    treeUnavailable: false,
    changes: null,
    changesError: null,
    folders: new Map(),
    epoch: 0,
    versions: new Map(),
    failedRepairs: noFailedRepairs,
  }
  private repairs: FailedRepairs = noFailedRepairs
  private readonly listeners = new Set<() => void>()
  private readonly reads = new Map<Resource, AbortController>()
  private lastEventNumber = 0
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
    const { tree, treeUnavailable, changes } = this.sync
    const failedRepairs = this.repairs
    this.snapshot = {
      ...this.snapshot,
      tree,
      treeUnavailable,
      changes,
      failedRepairs,
      ...change,
    }
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
    const invalidation = new FilesInvalidation()
    if (message.type === 'history') {
      let taken = false
      for (const envelope of message.envelopes) {
        taken = this.take(envelope, invalidation) || taken
      }
      this.lastEventNumber = Math.max(
        this.lastEventNumber,
        message.throughEventNumber,
      )
      return taken ? this.commit(invalidation) : this.publish({})
    }
    // A gap: subscribe again, so the history brings the missed events.
    if (message.envelope.eventNumber > this.lastEventNumber + 1) {
      return this.listen()
    }
    if (this.take(message.envelope, invalidation)) this.commit(invalidation)
  }

  /**
   * Takes one numbered event once. True when it was a new file event, or
   * when it changed the failed repairs.
   */
  private take(
    envelope: StreamEnvelope,
    invalidation: FilesInvalidation,
  ): boolean {
    if (envelope.eventNumber <= this.lastEventNumber) return false
    this.lastEventNumber = envelope.eventNumber
    const repairs = repairsAfter(this.repairs, envelope)
    const repaired = repairs !== this.repairs
    this.repairs = repairs
    if (!envelope.event) return repaired
    this.apply(syncEvent(this.sync, envelope.event), invalidation)
    return true
  }

  private apply(step: SyncStep, invalidation: FilesInvalidation): void {
    this.sync = step.sync
    invalidation.add(step)
  }

  private commit(
    invalidation: FilesInvalidation,
    change: Partial<FilesSnapshot> = {},
  ): void {
    if (this.sync.treeStale && !this.reads.has('tree')) {
      this.read('tree', false)
      change = { ...change, treeError: null }
    }
    this.publish({ ...invalidation.apply(this.snapshot), ...change })
  }

  private read(resource: Resource, publishStart = true): void {
    this.reads.get(resource)?.abort()
    const controller = new AbortController()
    this.reads.set(resource, controller)
    if (publishStart) {
      this.publish(
        resource === 'tree' ? { treeError: null } : { changesError: null },
      )
    }
    const done = () => {
      if (this.reads.get(resource) !== controller) return false
      this.reads.delete(resource)
      return true
    }
    if (resource === 'tree') {
      void this.client.readTree(controller.signal).then((result) => {
        if (!done()) return
        if (!result.ok) return this.publish({ treeError: result.error })
        const invalidation = new FilesInvalidation()
        this.apply(syncFetchedTree(this.sync, result.value), invalidation)
        this.commit(invalidation, { treeError: null })
      })
      return
    }
    void this.client.readChanges(controller.signal).then((result) => {
      if (!done()) return
      if (!result.ok) return this.publish({ changesError: result.error })
      const invalidation = new FilesInvalidation()
      this.apply(syncFetchedChanges(this.sync, result.value), invalidation)
      this.commit(invalidation, { changesError: null })
    })
  }
}

/** The version of one path. A page reads it again when it changes. */
export function versionOf(snapshot: FilesSnapshot, path: string): string {
  return `${snapshot.epoch}.${snapshot.versions.get(path) ?? 0}`
}
