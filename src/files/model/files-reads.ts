import type { BrowserChangesResponse } from '../../shared/generated/BrowserChangesResponse'
import type { FileTreeResponse } from '../../shared/generated/FileTreeResponse'
import type { FilesClient, FilesListResult } from '../api/files-client'

export type FileList = 'tree' | 'changes'

export type FileListRead =
  | { list: 'tree'; result: FilesListResult<FileTreeResponse> }
  | { list: 'changes'; result: FilesListResult<BrowserChangesResponse> }

/** Owns the pending reads and the two cutoffs of the first visit. */
export class FilesReads {
  private readonly controllers = new Map<FileList, AbortController>()
  private readonly client: FilesClient
  private initial: Partial<Record<FileList, number>> | null = null

  constructor(client: FilesClient) {
    this.client = client
  }

  begin(): void {
    this.initial = {}
  }

  stop(): void {
    this.initial = null
    this.controllers.forEach((controller) => controller.abort())
    this.controllers.clear()
  }

  has(list: FileList): boolean {
    return this.controllers.has(list)
  }

  read(
    list: FileList,
    accept: (read: FileListRead) => void,
    follow: (cursor: number) => void,
  ): void {
    this.controllers.get(list)?.abort()
    const controller = new AbortController()
    this.controllers.set(list, controller)
    const initial = this.initial
    if (initial) delete initial[list]

    const settle = (read: FileListRead) => {
      if (this.controllers.get(list) !== controller) return
      this.controllers.delete(list)
      const cutoff = read.result.stateRead?.eventNumber
      if (initial && cutoff !== undefined) initial[list] = cutoff
      accept(read)
      if (!initial || this.initial !== initial) return
      const { tree, changes } = initial
      if (cutoff === undefined) {
        this.initial = null
        follow(0)
      } else if (tree !== undefined && changes !== undefined) {
        this.initial = null
        follow(Math.min(tree, changes))
      }
    }

    if (list === 'tree') {
      void this.client
        .readTree(controller.signal)
        .then((result) => settle({ list, result }))
    } else {
      void this.client
        .readChanges(controller.signal)
        .then((result) => settle({ list, result }))
    }
  }
}
