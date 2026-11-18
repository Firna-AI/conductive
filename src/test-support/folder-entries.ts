import type {
  DroppedEntry,
  DroppedFileEntry,
  DroppedFolderEntry,
} from '../app/folder-entries'

/** A folder in a drag from the desktop: its name, and what it holds. */
export interface DraggedFolder {
  folder: string
  items?: readonly (File | DraggedFolder)[]
  /** The browser cannot read the folder, such as one without permission. */
  unreadable?: boolean
}

function fileEntry(file: File): DroppedFileEntry {
  return {
    name: file.name,
    isFile: true,
    isDirectory: false,
    file: (done) => done(file),
  }
}

/**
 * The entry of a folder, as `webkitGetAsEntry` gives it. Its reader gives
 * at most two entries in each batch, and then an empty batch, so a reader
 * that takes only the first batch misses entries. Chrome gives batches of
 * 100.
 */
export function folderEntry(folder: DraggedFolder): DroppedFolderEntry {
  return {
    name: folder.folder,
    isFile: false,
    isDirectory: true,
    createReader: () => {
      const left = (folder.items ?? []).map(entryOf)
      return {
        readEntries: (done, fail) => {
          if (folder.unreadable) {
            fail?.(new DOMException('No permission.', 'NotReadableError'))
          } else done(left.splice(0, 2))
        },
      }
    },
  }
}

/** The entry of a dropped file or folder. */
export function entryOf(item: File | DraggedFolder): DroppedEntry {
  return 'folder' in item ? folderEntry(item) : fileEntry(item)
}
