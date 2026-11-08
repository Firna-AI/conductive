import type { AgentChoice } from '../shared/agents'
import type { WorkspaceEvent } from '../shared/events'
import {
  workspacesPath,
  type CreateWorkspaceRequest,
  type CreateWorkspaceResponse,
} from '../shared/workspaces'
import type { ApiError } from './api/client'
import { readCreated } from './api/read-workspaces'
import type { Submission } from './creations'
import {
  failSent,
  filesWait,
  isMissingFile,
  readyIds,
  type DraftFile,
} from './draft-files'
import { DraftUploads } from './new-workspace-files'
import type { OrgModel } from './org-model'
import { asApiError, Store } from './store'

/** The first message of a workspace that does not exist yet. */
export interface Draft {
  text: string
  /** `null` until the user picks one, so the screen's default applies. */
  repositoryId: string | null
  choice: AgentChoice | null
  /** The files, each with its upload. Only ready ones go with the message. */
  files: readonly DraftFile[]
  /** The names of the files of the last pick that are over the size limit. */
  refused: readonly string[]
  /** The client ID of the first message. Try again sends the same one. */
  messageId: string
}

export type CreationStartError = NonNullable<
  Extract<WorkspaceEvent, { type: 'workspace.updated' }>['error']
>

export type CreateState =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'failed'; error: ApiError }
  /** The server took the message, and the sandbox of its workspace did not start. */
  | { state: 'not-started'; error?: CreationStartError | null }

/**
 * Whether the draft can go: it has text, and each of its files is ready,
 * with no upload that runs or failed. Send and Try again both wait for it.
 */
export function draftReady(draft: Draft): boolean {
  return draft.text.trim() !== '' && !filesWait(draft.files)
}

/**
 * New workspace: an empty chat whose first message creates the workspace.
 * When the create fails, the draft stays, so Try again sends it again. A
 * create and an upload never run together: the create waits for the files,
 * and a file that comes while the create runs does not upload.
 *
 * The server can take the message and then fail to start its sandbox. The
 * message then comes back in a form of its own, made from the `restored`
 * submission. That form keeps the message until the server takes it for
 * another workspace.
 */
export class NewWorkspaceModel {
  readonly draft: Store<Draft>
  readonly create: Store<CreateState>
  /** `null` puts the workspace in General, the default section. */
  readonly sectionId: string | null
  private readonly org: OrgModel
  private readonly uploads: DraftUploads
  /** The workspace whose start failed, for a form that brings it back. */
  private readonly restoredFrom: string | null
  private restoredFailure: Extract<CreateState, { state: 'not-started' }>

  constructor(
    org: OrgModel,
    sectionId: string | null,
    restored?: Submission,
    error?: CreationStartError | null,
  ) {
    this.org = org
    this.sectionId = sectionId
    this.restoredFrom = restored?.workspaceId ?? null
    this.restoredFailure = {
      state: 'not-started',
      ...(error === undefined ? {} : { error }),
    }
    this.draft = new Store<Draft>(
      restored ? { ...restored.draft, refused: [] } : this.emptyDraft(),
    )
    this.uploads = new DraftUploads({
      draft: this.draft,
      api: org.services.api,
      orgId: org.orgId,
      newId: () => org.services.newId(),
      lifetime: () => org.creations.lifetime,
    })
    this.create = new Store<CreateState>(
      restored ? this.restoredFailure : { state: 'idle' },
    )
  }

  setStartError(error: CreationStartError | null): void {
    this.restoredFailure = { state: 'not-started', error }
    this.create.change((state) =>
      state.state === 'not-started' ? this.restoredFailure : state,
    )
  }

  private emptyDraft(keep?: Draft): Draft {
    return {
      text: '',
      repositoryId: keep?.repositoryId ?? null,
      choice: keep?.choice ?? null,
      files: [],
      refused: [],
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

  /**
   * Attaches the files of one pick to the draft, as `DraftUploads` says.
   * While the create runs, it uploads nothing, because the create already
   * sent the files of the draft.
   */
  attach(files: readonly File[]): Promise<void> {
    if (this.create.get().state === 'sending') return Promise.resolve()
    return this.uploads.attach(files)
  }

  /** Try again on a file whose upload failed, or that the server lost. */
  retryFile(fileId: string): Promise<void> {
    if (this.create.get().state === 'sending') return Promise.resolve()
    return this.uploads.retry(fileId)
  }

  removeFile(fileId: string): void {
    this.uploads.remove(fileId)
  }

  /**
   * Sends the first message, which creates the workspace. It returns the
   * new workspace, or `null` when the create failed and the draft stays. It
   * sends nothing while the draft is not ready or a create runs. The app
   * keeps each sent message until the start of its workspace ends. A form
   * that brings a message back keeps it until the server answers with
   * another workspace than the one that failed. `opened` runs at once when
   * the server admits the message, before that form lets go of it, so the
   * app can leave the address of the failed workspace first.
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
        attachmentIds: readyIds(draft.files),
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
      const workspaceId = created.workspace.id
      if (workspaceId === this.restoredFrom) {
        this.create.set(this.restoredFailure)
        return null
      }
      this.org.putWorkspace(created.workspace)
      this.org.creations.admit({
        workspaceId,
        sectionId: this.sectionId,
        draft: {
          ...draft,
          repositoryId: request.repositoryId,
          choice: request.firstMessage.choice,
        },
      })
      opened?.(created)
      if (this.restoredFrom !== null) {
        this.org.creations.forget(this.restoredFrom)
      }
      this.draft.set(this.emptyDraft(draft))
      this.create.set({ state: 'idle' })
      return created
    } catch (error) {
      if (!life.live) return null
      // The server lost a file of the message, such as an expired upload.
      // Those files turn failed, and Try again on each uploads it again.
      if (isMissingFile(error)) {
        const sent = request.firstMessage.attachmentIds
        this.draft.change((current) => ({
          ...current,
          files: failSent(current.files, sent, error),
        }))
      }
      this.create.set({ state: 'failed', error: asApiError(error) })
      return null
    } finally {
      unfollow()
    }
  }
}
