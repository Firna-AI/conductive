import type { AttachmentUploadTarget } from '../shared/messages'
import type { ApiClient } from './api/client'
import { uploadAttachment } from './attachment-upload'
import type { Lifetime } from './creations'
import {
  changeFile,
  emptyIntake,
  hasFile,
  noRefusals,
  runFileJob,
  runFileQueue,
  splitPick,
  uploadingFile,
  stopFile,
  type DraftFile,
  type IntakeRefusals,
} from './draft-files'
import { reconcileFiles, withoutFileMarks } from './draft-file-state'
import type { Draft } from './new-workspace-draft'
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
 * workspace exists and through a failed create request. A sign-out, or a
 * sign-in of another person, ends the uploads of the person before: the
 * draft drops their files and their notice, so no later person can send or
 * upload them. The requests that run stop, and no later one starts.
 */
export class DraftUploads {
  private readonly host: DraftUploadsHost
  private followed: Lifetime | null = null
  /** Running and queued generations, cancelled by detachment or sign-out. */
  private readonly running = new Map<string, AbortController>()

  constructor(host: DraftUploadsHost) {
    this.host = host
  }

  /**
   * Attaches the files of one pick. A file over the size limit never
   * uploads, and its name goes to the notice, which the next pick replaces.
   * Each other file shows at once and uploads, one after another. The new
   * IDs return immediately so the field can insert the chips in this event.
   * The refusals of a drop go to the notices too and start no upload.
   */
  attach(
    files: readonly File[],
    refusals: IntakeRefusals = noRefusals,
  ): string[] {
    if (emptyIntake(files, refusals)) return []
    const life = this.follow()
    const { uploads, refused, refusedFolders } = splitPick(files, refusals)
    const added = uploads.map((file) => uploadingFile(this.host.newId(), file))
    const queued = added.map((item) => this.reserve(life, item))
    this.host.draft.change((draft) => ({
      ...draft,
      files: [...draft.files, ...added],
      refused,
      refusedFolders,
    }))
    void runFileQueue(queued)
    return added.map(({ id }) => id)
  }

  /** Reconciles chips and their files together, then restarts restored uploads. */
  setText(text: string): void {
    const current = this.host.draft.get()
    const next = reconcileFiles(current, text)
    for (const item of current.files) {
      if (!hasFile(next.files, item.id)) stopFile(this.running, item.id)
    }
    this.host.draft.change((draft) => ({ ...draft, ...next, text }))
    const restored = next.files.filter(
      (item) =>
        item.state === 'uploading' && hasFile(current.detached, item.id),
    )
    if (restored.length > 0) {
      const life = this.follow()
      const queued = restored.map((item) => this.reserve(life, item))
      void runFileQueue(queued)
    }
  }

  /** Ends the upload generations when a successful send starts a new draft. */
  end(): void {
    for (const upload of this.running.values()) upload.abort()
    this.running.clear()
  }

  private reserve(life: Lifetime, item: DraftFile): () => Promise<void> {
    const job = new AbortController()
    this.running.set(item.id, job)
    const messageId = this.host.draft.get().messageId
    return () => this.upload(life, item, job, messageId)
  }

  /** Try again uploads the kept `File` of a failed file again. */
  async retry(fileId: string): Promise<void> {
    const item = this.host.draft.get().files.find(({ id }) => id === fileId)
    if (item?.state !== 'failed') return
    const life = this.follow()
    const start = this.reserve(life, item)
    this.host.draft.change((draft) => ({
      ...draft,
      files: changeFile(draft.files, fileId, () =>
        uploadingFile(fileId, item.file),
      ),
    }))
    await start()
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
        this.end()
        this.host.draft.change((draft) => ({
          ...draft,
          text: withoutFileMarks(
            draft.text,
            [...draft.files, ...draft.detached].map(({ id }) => id),
          ),
          files: [],
          detached: [],
          refused: [],
          refusedFolders: [],
        }))
      })
    }
    return life
  }

  private async upload(
    life: Lifetime,
    item: { id: string; file: File },
    job: AbortController,
    messageId: string,
  ): Promise<void> {
    const { draft, api, orgId } = this.host
    const target: AttachmentUploadTarget = {
      type: 'new-workspace',
      messageId,
    }
    try {
      await runFileJob({
        id: item.id,
        file: item.file,
        live: () =>
          life.live &&
          !job.signal.aborted &&
          this.running.get(item.id) === job &&
          draft.get().messageId === messageId &&
          hasFile(draft.get().files, item.id),
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
