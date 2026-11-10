import type { AgentChoice } from '../shared/agents'
import { DRAFT_ATTACHMENTS_PATH, type Attachment } from '../shared/messages'
import {
  workspacesPath,
  type CreateWorkspaceRequest,
  type CreateWorkspaceResponse,
} from '../shared/workspaces'
import type { ApiError } from './api/client'
import { nested, record } from './api/parse'
import { readAttachment, readCreated } from './api/read-workspaces'
import type { OrgModel } from './org-model'
import { asApiError, Store } from './store'

/** The files that still upload, and the error of the last one that failed. */
export interface UploadState {
  pending: number
  error: ApiError | null
}

/** The first message of a workspace that does not exist yet. */
export interface Draft {
  text: string
  /** `null` until the user picks one, so the screen's default applies. */
  repositoryId: string | null
  choice: AgentChoice | null
  attachments: readonly Attachment[]
  /** The uploads of the files, which a new draft starts without. */
  upload: UploadState
  /** The client ID of the first message. Try again sends the same one. */
  messageId: string
}

export type CreateState =
  | { state: 'idle' }
  | { state: 'sending' }
  /** The create request failed. Try again sends the same message ID. */
  | { state: 'failed'; error: ApiError }

/**
 * Whether the draft can go: it has text, and none of its files still
 * uploads. Send and Try again both wait for it.
 */
export function draftReady(draft: Draft): boolean {
  return draft.text.trim() !== '' && draft.upload.pending === 0
}

async function base64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000))
  }
  return btoa(binary)
}

/**
 * New workspace: an empty chat whose first message creates the workspace.
 * When the create request fails, the draft stays, so Try again sends it
 * again. A create and an upload never run together: the create waits for
 * the files, and a file that comes while the create runs does not upload.
 *
 * Once the server takes the message, the workspace exists. When its first
 * start fails, the workspace keeps the message in its chat, with the saved
 * cause and Try again, so the form gives nothing back.
 */
export class NewWorkspaceModel {
  readonly draft: Store<Draft>
  readonly create: Store<CreateState>
  /** `null` puts the workspace in General, the default section. */
  readonly sectionId: string | null
  private readonly org: OrgModel

  constructor(org: OrgModel, sectionId: string | null) {
    this.org = org
    this.sectionId = sectionId
    this.draft = new Store<Draft>(this.emptyDraft())
    this.create = new Store<CreateState>({ state: 'idle' })
  }

  private emptyDraft(keep?: Draft): Draft {
    return {
      text: '',
      repositoryId: keep?.repositoryId ?? null,
      choice: keep?.choice ?? null,
      attachments: [],
      upload: { pending: 0, error: null },
      messageId: this.org.services.newId(),
    }
  }

  private changeUpload(change: (upload: UploadState) => UploadState): void {
    this.draft.change((draft) => ({ ...draft, upload: change(draft.upload) }))
  }

  setText(text: string): void {
    this.draft.change((draft) => ({ ...draft, text }))
  }

  setRepository(repositoryId: string): void {
    this.draft.change((draft) => ({ ...draft, repositoryId }))
  }

  setChoice(choice: AgentChoice): void {
    this.draft.change((draft) => ({ ...draft, choice }))
  }

  /**
   * Uploads files for the draft. While the create runs, it uploads nothing,
   * because the create already sent the files of the draft.
   */
  async attach(files: readonly File[]): Promise<void> {
    if (this.create.get().state === 'sending') return
    this.changeUpload((upload) => ({
      pending: upload.pending + files.length,
      error: null,
    }))
    for (const file of files) {
      try {
        const attachment = await this.org.services.api.send(
          'POST',
          DRAFT_ATTACHMENTS_PATH,
          {
            name: file.name,
            kind: file.type.startsWith('image/') ? 'image' : 'file',
            mediaType: file.type || 'application/octet-stream',
            dataBase64: await base64(file),
          },
          (body) => nested(record(body), 'attachment', readAttachment),
        )
        this.draft.change((draft) => ({
          ...draft,
          attachments: [...draft.attachments, attachment],
        }))
      } catch (error) {
        this.changeUpload((upload) => ({ ...upload, error: asApiError(error) }))
      } finally {
        this.changeUpload((upload) => ({
          ...upload,
          pending: upload.pending - 1,
        }))
      }
    }
  }

  detach(attachmentId: string): void {
    this.draft.change((draft) => ({
      ...draft,
      attachments: draft.attachments.filter((item) => item.id !== attachmentId),
    }))
  }

  /**
   * Sends the first message, which creates the workspace. It returns the
   * new workspace, or `null` when the create failed and the draft stays. It
   * sends nothing while the draft is not ready or a create runs. `opened`
   * runs at once when the server takes the message, before the form empties,
   * so the app can open the new workspace first.
   *
   * A sign-out, or a sign-in of another person, ends the send at once. The
   * form is then free and empty. The late answer changes nothing, and
   * `send` gives `null`.
   */
  async send(
    defaults: { repositoryId: string; choice: AgentChoice },
    opened?: (created: CreateWorkspaceResponse) => void,
  ): Promise<CreateWorkspaceResponse | null> {
    const draft = this.draft.get()
    if (!draftReady(draft) || this.create.get().state === 'sending') {
      return null
    }
    const request: CreateWorkspaceRequest = {
      repositoryId: draft.repositoryId ?? defaults.repositoryId,
      ...(this.sectionId ? { sectionId: this.sectionId } : {}),
      firstMessage: {
        id: draft.messageId,
        text: draft.text,
        attachmentIds: draft.attachments.map((item) => item.id),
        choice: draft.choice ?? defaults.choice,
      },
    }
    const life = this.org.creations.lifetime
    const unfollow = life.onEnd(() => {
      this.draft.set(this.emptyDraft())
      this.create.set({ state: 'idle' })
    })
    this.create.set({ state: 'sending' })
    try {
      const created = await this.org.services.api.send(
        'POST',
        workspacesPath(this.org.orgId),
        request,
        readCreated,
      )
      if (!life.live) return null
      this.org.putWorkspace(created.workspace)
      opened?.(created)
      this.draft.set(this.emptyDraft(draft))
      this.create.set({ state: 'idle' })
      return created
    } catch (error) {
      if (life.live) {
        this.create.set({ state: 'failed', error: asApiError(error) })
      }
      return null
    } finally {
      unfollow()
    }
  }
}
