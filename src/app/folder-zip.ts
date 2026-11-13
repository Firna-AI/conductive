import { Zip, ZipDeflate, ZipPassThrough, type ZipInputFile } from 'fflate'
import { ATTACHMENT_MAX_BYTES } from '../shared/messages'
import {
  entriesOf,
  fileOf,
  isFileEntry,
  isFolderEntry,
  type DroppedFolderEntry,
} from './folder-entries'

/**
 * The zip of one dropped folder. A zip over the size limit gives only its
 * name, and a folder that the browser cannot read gives only its own name.
 */
export type FolderZip =
  | { state: 'zipped'; file: File }
  | { state: 'too-large'; name: string }
  | { state: 'unreadable'; name: string }

/** The most entries that a zip without its 64-bit records can hold. */
const ZIP_MAX_ENTRIES = 65_535

/**
 * The bytes of a file that the zip reads and compresses at a time. The page
 * can run its other work between two chunks.
 */
const CHUNK_BYTES = 1_048_576

/** A zip can store the dates from 1980 to 2099. */
function zipTime(file: File): number | undefined {
  const year = new Date(file.lastModified).getFullYear()
  return year >= 1980 && year <= 2099 ? file.lastModified : undefined
}

/** The zip grew past the size limit, or holds too many entries. */
class TooLarge extends Error {}

/** The zip stopped because its drop stopped. */
export class ZipStopped extends Error {}

function stopIf(signal: AbortSignal): void {
  if (signal.aborted) throw new ZipStopped('The zip stopped.')
}

/**
 * Writes the entries of a zip and keeps its bytes, up to the size limit.
 * Each push compresses at once, so the size is known after each chunk.
 */
class ZipWriter {
  private readonly zip: Zip
  private readonly chunks: Uint8Array[] = []
  private readonly maxBytes: number
  private size = 0
  private entries = 0
  private failure: Error | null = null

  constructor(maxBytes: number) {
    this.maxBytes = maxBytes
    this.zip = new Zip((error, chunk) => {
      if (error) this.failure = error
      else {
        this.size += chunk.length
        this.chunks.push(chunk)
      }
    })
  }

  /** Throws when the zip failed, or passed the size limit. */
  private check(): void {
    if (this.failure) throw this.failure
    if (this.size > this.maxBytes) throw new TooLarge()
  }

  private add(entry: ZipInputFile): void {
    this.entries += 1
    if (this.entries > ZIP_MAX_ENTRIES) throw new TooLarge()
    this.zip.add(entry)
    this.check()
  }

  /** Adds a folder entry, so that an empty folder stays in the zip. */
  folder(path: string): void {
    const entry = new ZipPassThrough(`${path}/`)
    this.add(entry)
    entry.push(new Uint8Array(0), true)
    this.check()
  }

  async file(path: string, file: File, signal: AbortSignal): Promise<void> {
    const entry = new ZipDeflate(path, { level: 6 })
    entry.mtime = zipTime(file)
    this.add(entry)
    for (let start = 0; start < file.size; start += CHUNK_BYTES) {
      stopIf(signal)
      const chunk = file.slice(start, start + CHUNK_BYTES)
      entry.push(new Uint8Array(await chunk.arrayBuffer()))
      this.check()
    }
    entry.push(new Uint8Array(0), true)
    this.check()
  }

  /** Ends the zip and gives its bytes in one buffer. */
  end(): Uint8Array<ArrayBuffer> {
    this.zip.end()
    this.check()
    const bytes = new Uint8Array(this.size)
    let offset = 0
    for (const chunk of this.chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    return bytes
  }

  stop(): void {
    this.zip.terminate()
  }
}

/** Adds a folder and everything in it, under its path in the zip. */
async function addFolder(
  writer: ZipWriter,
  folder: DroppedFolderEntry,
  path: string,
  signal: AbortSignal,
): Promise<void> {
  writer.folder(path)
  for (const entry of await entriesOf(folder)) {
    stopIf(signal)
    const inner = `${path}/${entry.name}`
    if (isFolderEntry(entry)) await addFolder(writer, entry, inner, signal)
    else if (isFileEntry(entry)) {
      await writer.file(inner, await fileOf(entry), signal)
    }
  }
}

/**
 * Zips one dropped folder in the browser, so that it uploads as one file.
 * The zip holds the folder itself, with each file and each folder in it,
 * also hidden ones and empty folders. It compresses each file in chunks, so
 * the page stays responsive, and it stops as soon as the zip passes the size
 * limit of an attachment. A stopped signal throws `ZipStopped`.
 */
export async function zipFolder(
  folder: DroppedFolderEntry,
  signal: AbortSignal,
  maxBytes: number = ATTACHMENT_MAX_BYTES,
): Promise<FolderZip> {
  const writer = new ZipWriter(maxBytes)
  const name = `${folder.name}.zip`
  try {
    await addFolder(writer, folder, folder.name, signal)
    return {
      state: 'zipped',
      file: new File([writer.end()], name, { type: 'application/zip' }),
    }
  } catch (error) {
    writer.stop()
    if (error instanceof ZipStopped) throw error
    if (error instanceof TooLarge) return { state: 'too-large', name }
    return { state: 'unreadable', name: folder.name }
  }
}
