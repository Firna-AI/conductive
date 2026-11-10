import type { AgentChoice } from '../shared/agents'
import type { WorkspaceBranchOption } from '../shared/workspace-branches'
import {
  workspacesPath,
  type CreateWorkspaceRequest,
  type CreateWorkspaceResponse,
} from '../shared/workspaces'
import type { ApiError } from './api/client'
import { readCreated } from './api/read-workspaces'
import { branchOf, continuable } from './branch-options'
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
  /**
   * The existing branch or open pull request that the workspace continues,
   * in the repository of the draft. `null` is a new branch, the default.
   */
  branch: WorkspaceBranchOption | null
}

export type CreateState =
  | { state: 'idle' }
  | { state: 'sending' }
  /** The create request failed. Try again sends the same message ID. */
  | { state: 'failed'; error: ApiError }

/**
 * Whether the draft can go: it has text, and each of its files is ready,
 * with no upload that runs or failed. Send and Try again both wait for it.
 */
export function draftReady(draft: Draft): boolean {
  return draft.text.trim() !== '' && !filesWait(draft.files)
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
  private readonly uploads: DraftUploads

  constructor(org: OrgModel, sectionId: string | null) {
    this.org = org
    this.sectionId = sectionId
    this.draft = new Store<Draft>(this.emptyDraft())
    this.uploads = new DraftUploads({
      draft: this.draft,
      api: org.services.api,
      orgId: org.orgId,
      newId: () => org.services.newId(),
      lifetime: () => org.creations.lifetime,
    })
    this.create = new Store<CreateState>({ state: 'idle' })
  }

  /**
   * An empty draft. After a create, it keeps the repository and the model,
   * and the next workspace starts on a new branch again.
   */
  private emptyDraft(keep?: Draft): Draft {
    return {
      text: '',
      repositoryId: keep?.repositoryId ?? null,
      choice: keep?.choice ?? null,
      files: [],
      refused: [],
      messageId: this.org.services.newId(),
      branch: null,
    }
  }

  setText(text: string): void {
    this.draft.change((draft) => ({ ...draft, text }))
  }

  /**
   * The repository of the workspace. A branch belongs to its repository, so
   * another repository starts a new branch again.
   */
  setRepository(repositoryId: string): void {
    this.draft.change((draft) => ({
      ...draft,
      repositoryId,
      branch: repositoryId === draft.repositoryId ? draft.branch : null,
    }))
  }

  /**
   * Continues `option`, an existing branch or open pull request of
   * `repositoryId`, which becomes the repository of the draft. A pull
   * request whose branch is in another repository cannot be continued, so
   * it changes nothing.
   */
  chooseBranch(repositoryId: string, option: WorkspaceBranchOption): void {
    if (!continuable(option)) return
    this.draft.change((draft) => ({ ...draft, repositoryId, branch: option }))
  }

  /** New branch, the default: the workspace starts its own branch. */
  newBranch(): void {
    this.draft.change((draft) => ({ ...draft, branch: null }))
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
      // A new branch is the default, so its request names no branch.
      ...(draft.branch
        ? { branch: { type: 'existing', name: branchOf(draft.branch) } }
        : {}),
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
      this.org.putWorkspace(created.workspace)
      opened?.(created)
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
