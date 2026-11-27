import type { FilesClient } from '../api/files-client'
import { TabPlaces } from '../../app/tab-places'
import type { ScrollOffset } from '../ui/kept-scroll'
import type { StreamEnvelope } from '../api/parse-events'
import {
  noFailedRepairs,
  repairsAfter,
  setFailedRepair,
  type FailedRepairs,
} from './failed-repairs'
import { FilesInvalidation } from './files-invalidation'
import { FilesReads, type FileList, type FileListRead } from './files-reads'
import { FilesStream, type FilesSubscribe } from './files-stream'
import { RepositoryWatch } from './repository-watch'
import type { FilesSnapshot } from './files-snapshot'
import {
  emptySync,
  syncEvent,
  syncMoved,
  syncRead,
  type FilesSync,
  type SyncStep,
} from './files-sync'

export type { FilesSnapshot } from './files-snapshot'

export type { FilesSubscribe } from './files-stream'

/** The two Files lists of one workspace, kept current by reads and events. */
export class WorkspaceFiles {
  readonly client: FilesClient
  /**
   * The scroll offset of each file and diff tab of the workspace, by tab and
   * view, which stays while the app keeps the store. A reload forgets it.
   */
  readonly scrollPlaces = new TabPlaces<ScrollOffset>()
  private readonly stream: FilesStream
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
  private readonly reads: FilesReads
  private running = false
  private followed = false
  private readonly repositories = {
    tree: new RepositoryWatch(),
    changes: new RepositoryWatch(),
  }
  /** A repository change dropped the changes, so the route reads again. */
  private changesMoved = false
  private retryChangesAfterRead = false

  constructor(options: { client: FilesClient; subscribe: FilesSubscribe }) {
    this.client = options.client
    this.stream = new FilesStream(
      options.subscribe,
      (events, history) => this.receive(events, history),
      () => this.replayed(),
    )
    this.reads = new FilesReads(this.client)
  }

  /** Reads the files and follows the stream. Safe to call again after stop. */
  start(): void {
    if (this.running) return
    this.running = true
    if (this.followed) {
      this.stream.start()
      this.retry()
      return
    }
    this.reads.begin()
    this.read('tree', false)
    this.read('changes', false)
    this.publish({})
  }

  stop(): void {
    this.running = false
    this.stream.stop()
    this.reads.stop()
  }

  /** Reads the tree and the changes again where they failed. */
  retry(list?: FileList): void {
    if (!this.running) return
    if (
      list !== 'changes' &&
      (!this.sync.tree.value || this.sync.treeStale) &&
      !this.reads.has('tree')
    )
      this.read('tree')
    if (
      list !== 'tree' &&
      (!this.sync.changes.value || this.sync.changes.stale) &&
      !this.reads.has('changes')
    )
      this.read('changes')
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
    this.snapshot = {
      ...this.snapshot,
      tree: tree.value,
      treeError: this.reads.has('tree') ? null : tree.error,
      treeUnavailable,
      changes: changes.value,
      changesError: this.reads.has('changes') ? null : changes.error,
      failedRepairs: this.repairs,
      ...change,
    }
    this.listeners.forEach((listener) => listener())
  }

  private receive(events: readonly StreamEnvelope[], history: boolean): void {
    const invalidation = new FilesInvalidation()
    let taken = false
    for (const envelope of events) {
      taken = this.take(envelope, invalidation) || taken
    }
    if (taken) this.commit(invalidation)
    else if (history) this.publish({})
  }

  private replayed(): void {
    if (!this.sync.changes.stale) return
    this.retryChangesAfterRead = this.reads.has('changes')
    this.retry('changes')
  }

  /** Takes an ordered event that passes the floor of its list. */
  private take(
    envelope: StreamEnvelope,
    invalidation: FilesInvalidation,
  ): boolean {
    const { eventNumber, event, failedRepair, repositoryId } = envelope
    if (repositoryId !== null) {
      const tree =
        eventNumber > this.sync.tree.floor &&
        this.repositories.tree.moved(repositoryId)
      const changes =
        eventNumber > this.sync.changes.floor &&
        this.repositories.changes.moved(repositoryId)
      if (!tree && !changes) return false
      this.apply(syncMoved(this.sync, eventNumber, tree, changes), invalidation)
      this.changesMoved ||= changes
      return true
    }
    if (!event && !failedRepair) return false
    const list =
      event?.type === 'changes.updated' ||
      event?.type === 'changes.changed' ||
      failedRepair?.report === 'changes.updated'
        ? 'changes'
        : 'tree'
    if (eventNumber <= this.sync[list].floor) return false
    const repairs = repairsAfter(this.repairs, envelope)
    const repaired = repairs !== this.repairs
    if (repaired) {
      this.repairs = repairs
      this.sync = {
        ...this.sync,
        [list]: { ...this.sync[list], floor: eventNumber },
      }
    }
    if (event)
      this.apply(syncEvent(this.sync, event, eventNumber), invalidation)
    return event !== null || repaired
  }

  private apply(step: SyncStep, invalidation: FilesInvalidation): void {
    this.sync = step.sync
    if (!this.sync.changes.stale) this.retryChangesAfterRead = false
    invalidation.add(step)
  }

  private commit(invalidation: FilesInvalidation): void {
    if (this.sync.treeStale && !this.reads.has('tree')) {
      this.read('tree', false)
    }
    // The changes of the new folder: the route waits for its first report.
    if (this.changesMoved) {
      this.changesMoved = false
      this.read('changes', false)
    } else if (this.sync.changes.stale && !this.reads.has('changes')) {
      this.read('changes', false)
    }
    this.publish(invalidation.apply(this.snapshot))
  }

  private read(list: FileList, publishStart = true): void {
    if (list === 'changes') this.retryChangesAfterRead = false
    this.reads.read(
      list,
      (reply) => this.acceptRead(reply),
      (cursor) => {
        this.followed = true
        this.stream.start(cursor)
      },
    )
    if (publishStart) this.publish({})
  }

  private acceptRead(read: FileListRead): void {
    const {
      list,
      result: { stateRead },
    } = read
    const step = syncRead(this.sync, read)
    if (!step) {
      const stale =
        list === 'tree' ? this.sync.treeStale : this.sync.changes.stale
      if (stale) this.read(list, false)
      this.publish({})
      return
    }
    if (
      stateRead &&
      (list === 'changes' || stateRead.eventNumber > this.sync[list].floor)
    ) {
      this.repositories[list].seed(stateRead.repositoryId)
      const report = list === 'tree' ? 'files.snapshot' : 'changes.updated'
      this.repairs = setFailedRepair(
        this.repairs,
        report,
        stateRead.failure?.occurredAt,
      )
    }
    const invalidation = new FilesInvalidation()
    this.apply(step, invalidation)
    this.publish(invalidation.apply(this.snapshot))
    if (list === 'changes' && !read.result.ok && this.retryChangesAfterRead)
      this.retry('changes')
  }
}

/** The version of one path. A page reads it again when it changes. */
export function versionOf(snapshot: FilesSnapshot, path: string): string {
  return `${snapshot.epoch}.${snapshot.versions.get(path) ?? 0}`
}
