import type { AttachmentUploadTarget } from '../shared/messages'
import type { ApiClient } from './api/client'
import { uploadAttachment } from './attachment-upload'
import type { Lifetime } from './creations'
import {
  changeFile,
  hasFile,
  runFileJob,
  splitPick,
  uploadingFile,
} from './draft-files'
import type { Draft } from './new-workspace-model'
import type { Store } from './store'

/** What the uploads of a New workspace draft take from its form. */
interface DraftUploadsHost {
  readonly draft: Store<Draft>
  readonly api: ApiClient
  readonly orgId: string
  readonly newId: () => string
  /** The life of the creates of the person who is signed in now. */
  readonly lifetime: () => Lifetime
}

/**
 * The uploads of the files of a New workspace draft. Each one names the org
 * and the message ID of the draft, which stays the same before the
 * workspace exists and through a failed first start. A sign-out, or a
 * sign-in of another person, ends the uploads of the person before: the
 * draft drops their files and their notice, so no later person can send or
 * upload them. The requests that run stop, and no later one starts.
 */
export class DraftUploads {
  private readonly host: DraftUploadsHost
  private followed: Lifetime | null = null
  /** The uploads that run, by file ID, which Remove and a sign-out abort. */
  private readonly running = new Map<string, AbortController>()

  constructor(host: DraftUploadsHost) {
    this.host = host
  }

  /**
   * Attaches the files of one pick. A file over the size limit never
   * uploads, and its name goes to the notice, which the next pick replaces.
   * Each other file shows at once and uploads, one after another.
   */
  async attach(files: readonly File[]): Promise<void> {
    const life = this.follow()
    const { uploads, refused } = splitPick(files)
    const added = uploads.map((file) => uploadingFile(this.host.newId(), file))
    this.host.draft.change((draft) => ({
      ...draft,
      files: [...draft.files, ...added],
      refused,
    }))
    for (const item of added) await this.upload(life, item)
  }

  /** Try again uploads the kept `File` of a failed file again. */
  async retry(fileId: string): Promise<void> {
    const item = this.host.draft.get().files.find(({ id }) => id === fileId)
    if (item?.state !== 'failed') return
    const life = this.follow()
    this.host.draft.change((draft) => ({
      ...draft,
      files: changeFile(draft.files, fileId, () =>
        uploadingFile(fileId, item.file),
      ),
    }))
    await this.upload(life, item)
  }

  /** Takes a file off the draft, and aborts its upload when one runs. */
  remove(fileId: string): void {
    this.running.get(fileId)?.abort()
    this.running.delete(fileId)
    this.host.draft.change((draft) => ({
      ...draft,
      files: draft.files.filter(({ id }) => id !== fileId),
    }))
  }

  /**
   * The life of the person now. Its end aborts the uploads that run, and
   * drops the files and the notice of the draft.
   */
  private follow(): Lifetime {
    const life = this.host.lifetime()
    if (this.followed !== life) {
      this.followed = life
      life.onEnd(() => {
        for (const upload of this.running.values()) upload.abort()
        this.running.clear()
        this.host.draft.change((draft) => ({
          ...draft,
          files: [],
          refused: [],
        }))
      })
    }
    return life
  }

  private async upload(
    life: Lifetime,
    item: { id: string; file: File },
  ): Promise<void> {
    const { draft, api, orgId } = this.host
    const target: AttachmentUploadTarget = {
      type: 'new-workspace',
      messageId: draft.get().messageId,
    }
    const job = new AbortController()
    this.running.set(item.id, job)
    try {
      await runFileJob({
        id: item.id,
        file: item.file,
        live: () => life.live && hasFile(draft.get().files, item.id),
        signal: job.signal,
        change: (change) =>
          draft.change((current) => ({
            ...current,
            files: changeFile(current.files, item.id, change),
          })),
        upload: (file, hooks) =>
          uploadAttachment({ api, orgId, target, file, ...hooks }),
      })
    } finally {
      if (this.running.get(item.id) === job) this.running.delete(item.id)
    }
  }
}
