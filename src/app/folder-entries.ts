/**
 * The parts of a dropped entry that the zip of a folder reads. A browser
 * gives them through `webkitGetAsEntry`, as `FileSystemEntry`, which has
 * each of these parts. The tests give their own entries.
 */
export interface DroppedEntry {
  readonly name: string
  readonly isFile: boolean
  readonly isDirectory: boolean
}

/** A dropped folder, whose reader gives its entries in batches. */
export interface DroppedFolderEntry extends DroppedEntry {
  createReader(): {
    readEntries(
      done: (entries: DroppedEntry[]) => void,
      fail?: (error: DOMException) => void,
    ): void
  }
}

/** A file in a dropped folder, which gives its `File`. */
export interface DroppedFileEntry extends DroppedEntry {
  file(done: (file: File) => void, fail?: (error: DOMException) => void): void
}

export function isFolderEntry(
  entry: DroppedEntry | null,
): entry is DroppedFolderEntry {
  return entry !== null && entry.isDirectory && 'createReader' in entry
}

export function isFileEntry(entry: DroppedEntry): entry is DroppedFileEntry {
  return entry.isFile && 'file' in entry
}

/**
 * Each entry of a folder. A reader gives the entries in batches, and an
 * empty batch ends them. The entries go by name, so one folder always gives
 * the same zip.
 */
export async function entriesOf(
  folder: DroppedFolderEntry,
): Promise<DroppedEntry[]> {
  const reader = folder.createReader()
  const entries: DroppedEntry[] = []
  for (;;) {
    const batch = await new Promise<DroppedEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject)
    })
    if (batch.length === 0) break
    entries.push(...batch)
  }
  return entries.sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )
}

export function fileOf(entry: DroppedFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}
