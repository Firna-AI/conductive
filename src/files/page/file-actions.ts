import type { FilesClient } from '../api/files-client'
import { fetchedDownload, saveFromMemory } from './fetched-download'

/** The browser parts that Copy and Download use. Tests inject their own. */
export interface FileActionTargets {
  writeText(text: string): Promise<void>
  /** Starts the download of one file. True when it started. */
  download(client: FilesClient, path: string): Promise<boolean>
}

/**
 * The clipboard and the download of the browser. Download reads the
 * download route with the fetch of the browser and the session cookie. It
 * saves the file only when the route sends it, so a refused download shows
 * that it didn't start.
 */
export const browserTargets: FileActionTargets = {
  async writeText(text) {
    if (!navigator.clipboard) throw new Error('The clipboard is not available.')
    await navigator.clipboard.writeText(text)
  },
  // The fetch of the page at the time of the download.
  download: fetchedDownload(
    (input, init) => fetch(input, init),
    saveFromMemory,
  ),
}

/** Copies the original text of a file. True when the clipboard took it. */
async function copyText(
  targets: FileActionTargets,
  text: string,
): Promise<boolean> {
  try {
    await targets.writeText(text)
    return true
  } catch {
    return false
  }
}

/** The last result of Copy or Download, which the header shows. */
export type ActionStatus = 'copied' | 'copy-failed' | 'download-failed' | null

export interface ActionsState {
  status: ActionStatus
  downloading: boolean
}

/**
 * Copy and Download for the file of one page. Each path gets its own
 * instance, so a request for a file that the page left never changes the
 * state of the file that it shows now.
 */
export class FileActions {
  readonly path: string
  private readonly client: FilesClient
  private readonly targets: FileActionTargets
  private state: ActionsState = { status: null, downloading: false }
  private downloads = 0
  private readonly listeners = new Set<() => void>()

  constructor(client: FilesClient, targets: FileActionTargets, path: string) {
    this.client = client
    this.targets = targets
    this.path = path
  }

  copy(text: string): Promise<void> {
    return copyText(this.targets, text).then((copied) =>
      this.set({ status: copied ? 'copied' : 'copy-failed' }),
    )
  }

  /** Starts the download. A download that throws counts as failed. */
  download(): Promise<void> {
    const request = ++this.downloads
    this.set({ status: null, downloading: true })
    return this.targets
      .download(this.client, this.path)
      .catch(() => false)
      .then((started) => {
        if (request !== this.downloads) return
        this.set({
          downloading: false,
          status: started ? null : 'download-failed',
        })
      })
  }

  clearStatus(): void {
    this.set({ status: null })
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): ActionsState => this.state

  private set(change: Partial<ActionsState>): void {
    this.state = { ...this.state, ...change }
    this.listeners.forEach((listener) => listener())
  }
}
