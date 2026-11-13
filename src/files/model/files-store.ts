import type { FilesClient } from '../api/files-client'
import type { ScrollOffset } from '../ui/kept-scroll'
import { parseStreamMessage, type StreamEnvelope } from '../api/parse-events'
import {
  noFailedRepairs,
  repairsAfter,
  type FailedRepairs,
} from './failed-repairs'
import { FilesInvalidation } from './files-invalidation'
import type { FilesSnapshot } from './files-snapshot'
import {
  emptySync,
  syncEvent,
  syncFetchedChanges,
  syncFetchedTree,
  type FilesSync,
  type SyncStep,
} from './files-sync'

export type { FilesSnapshot } from './files-snapshot'

/**
 * The workspace event stream after `afterEventNumber`. It sends stored
 * history in one or more pages, then live events. Live events wait for the
 * final history page. The shell injects its socket adapter, or
 * `FakeWorkspaceEvents.subscribe` in development.
 */
export type FilesSubscribe = (
  afterEventNumber: number,
  listener: (message: unknown) => void,
) => () => void

type Resource = 'tree' | 'changes'

/**
 * The live files of one workspace: the tree and the changes from the file
 * routes, kept current by the file events of the workspace stream. It
 * skips repeated events, and reads the stream again after a gap. The stored
 * history can come in pages that share one cutoff, and a page can leave out
 * numbers. Live events wait until the final page.
 */
export class WorkspaceFiles {
  readonly client: FilesClient
  /**
   * The scroll offset of each file and diff tab of the workspace, by tab and
   * view, which stays while the app keeps the store. A reload forgets it.
   */
  readonly scrollPlaces = new Map<string, ScrollOffset>()
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
    revealed: null,
    readLabels: new Map(),
  }
  private repairs: FailedRepairs = noFailedRepairs
  private readonly listeners = new Set<() => void>()
  private readonly reads = new Map<Resource, AbortController>()
  private lastEventNumber = 0
  /** The cutoff of a replay that has more pages to come, or null. */
  private replay: number | null = null
  /** The live events that wait for the final page of a replay. */
  private waiting: StreamEnvelope[] = []
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

  /** Opens a folder and each folder that holds it, and marks it to show. */
  revealFolder(path: string): void {
    const folders = new Map(this.snapshot.folders)
    for (
      let at = path;
      at !== '';
      at = at.slice(0, Math.max(0, at.lastIndexOf('/')))
    ) {
      folders.set(at, true)
    }
    const count = (this.snapshot.revealed?.count ?? 0) + 1
    this.publish({ folders, revealed: { path, count } })
  }

  /** Keeps the label that a file or diff read gave for its real path. */
  noteReadLabel(path: string, label: string): void {
    if (this.snapshot.readLabels.get(path) === label) return
    const readLabels = new Map(this.snapshot.readLabels).set(path, label)
    this.publish({ readLabels })
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
    this.replay = null
    this.waiting = []
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
    if (message.type === 'event') {
      if (this.replay !== null) this.waiting.push(message.envelope)
      else this.live(message.envelope)
      return
    }
    const invalidation = new FilesInvalidation()
    const through = message.throughEventNumber
    let taken = false
    for (const envelope of message.envelopes) {
      if (envelope.eventNumber > through) continue
      taken = this.take(envelope, invalidation) || taken
    }
    const next = message.nextAfterEventNumber
    this.replay = next === null ? null : through
    this.lastEventNumber = Math.max(
      this.lastEventNumber,
      next === null ? through : Math.min(next, through),
    )
    if (taken) this.commit(invalidation)
    else this.publish({})
    if (next !== null) return
    const waiting = this.waiting.sort((a, b) => a.eventNumber - b.eventNumber)
    this.waiting = []
    for (const envelope of waiting) {
      if (!this.live(envelope)) return
    }
  }

  /** Applies one live event, or subscribes again after a gap and says so. */
  private live(envelope: StreamEnvelope): boolean {
    // A gap: subscribe again, so the history brings the missed events.
    if (envelope.eventNumber > this.lastEventNumber + 1) {
      this.listen()
      return false
    }
    const invalidation = new FilesInvalidation()
    if (this.take(envelope, invalidation)) this.commit(invalidation)
    return true
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
