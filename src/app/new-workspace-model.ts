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

/** The first message of a workspace that does not exist yet. */
export interface Draft {
  text: string
  /** `null` until the user picks one, so the screen's default applies. */
  repositoryId: string | null
  choice: AgentChoice | null
  attachments: readonly Attachment[]
  /** The client ID of the first message. Try again sends the same one. */
  messageId: string
}

export type CreateState =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'failed'; error: ApiError }

export interface UploadState {
  pending: number
  error: ApiError | null
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
 * When the create fails, the draft stays, so Try again sends it again.
 */
export class NewWorkspaceModel {
  readonly draft: Store<Draft>
  readonly create = new Store<CreateState>({ state: 'idle' })
  readonly upload = new Store<UploadState>({ pending: 0, error: null })
  /** `null` puts the workspace in General, the default section. */
  readonly sectionId: string | null
  private readonly org: OrgModel

  constructor(org: OrgModel, sectionId: string | null) {
    this.org = org
    this.sectionId = sectionId
    this.draft = new Store<Draft>(this.emptyDraft())
  }

  private emptyDraft(keep?: Draft): Draft {
    return {
      text: '',
      repositoryId: keep?.repositoryId ?? null,
      choice: keep?.choice ?? null,
      attachments: [],
      messageId: this.org.services.newId(),
    }
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

  async attach(files: readonly File[]): Promise<void> {
    this.upload.change((upload) => ({
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
        this.upload.change((upload) => ({
          ...upload,
          error: asApiError(error),
        }))
      } finally {
        this.upload.change((upload) => ({
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
   * new workspace, or `null` when the create failed and the draft stays.
   */
  async send(defaults: {
    repositoryId: string
    choice: AgentChoice
  }): Promise<CreateWorkspaceResponse | null> {
    const draft = this.draft.get()
    if (draft.text.trim() === '' || this.create.get().state === 'sending') {
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
    this.create.set({ state: 'sending' })
    try {
      const created = await this.org.services.api.send(
        'POST',
        workspacesPath(this.org.orgId),
        request,
        readCreated,
      )
      this.org.putWorkspace(created.workspace)
      this.draft.set(this.emptyDraft(draft))
      this.create.set({ state: 'idle' })
      return created
    } catch (error) {
      this.create.set({ state: 'failed', error: asApiError(error) })
      return null
    }
  }
}
