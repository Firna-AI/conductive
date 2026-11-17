import type { AgentChoice } from '../shared/generated/AgentChoice'
import type { FieldFiles } from '../chat/components/chip-field/attached-files'
import type { WorkspaceCapabilities } from '../shared/secrets'
import {
  workspacesPath,
  type CreateWorkspaceRequest,
  type CreateWorkspaceResponse,
} from '../shared/workspaces'
import { readCreated } from './api/read-workspaces'
import { withPreapproval } from './capabilities-model'
import { isMissingFile, readyIds, type IntakeRefusals } from './draft-files'
import {
  failSentDraft,
  markedFiles,
  messageText,
  withoutFileMarks,
} from './draft-file-state'
import {
  defaultCapabilities,
  draftReady,
  sentCapabilities,
  withShownRepository,
  type CreateState,
  type Draft,
} from './new-workspace-draft'
import { DraftUploads } from './new-workspace-files'
import type { OrgModel } from './org-model'
import { asApiError, Store, valueOf } from './store'

/**
 * New workspace: an empty chat whose first message creates the workspace.
 * When the create request fails, the draft stays, so Try again sends it
 * again. A create and an upload never run together: the create waits for
 * the files, and a file that comes while the create runs does not upload.
 *
 * A draft keeps the repository that the form shows when it gets its first
 * text or file, once the repositories and the builds of the org have
 * loaded. So a build that turns an earlier repository ready moves no
 * written draft. A pick of the user wins over it. A kept repository that
 * the org no longer chose gives way to the one that the form shows.
 *
 * Once the server takes the message, the workspace exists. When its first
 * start fails, the workspace keeps the message in its chat, with the saved
 * cause and Try again, so the form gives nothing back.
 *
 * The create also takes the choices of the Capabilities control: the
 * secrets that the new workspace pre-approves, and its Mac access.
 */
export class NewWorkspaceModel {
  readonly draft: Store<Draft>
  readonly create: Store<CreateState>
  /**
   * The section of the form, where the draft lives. `null` puts the
   * workspace in General, the default section. A pick of the draft wins.
   */
  readonly sectionId: string | null
  private readonly org: OrgModel
  private readonly uploads: DraftUploads
  readonly filesSource: FieldFiles = {
    files: () => {
      const draft = this.draft.get()
      return [...draft.files, ...draft.detached]
    },
    retry: (id) => {
      void this.retryFile(id)
    },
    subscribe: (listener) => this.draft.subscribe(listener),
  }

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
      delay: org.services.delay,
    })
    this.create = new Store<CreateState>({ state: 'idle' })
    // A draft that got its text before the repositories and the builds
    // loaded takes its repository when they load.
    org.repositories.subscribe(() => this.keepShownRepository())
    org.builds.subscribe(() => this.keepShownRepository())
  }

  /**
   * A new draft. It keeps the choice and a picked repository of `keep`. Its
   * capabilities start again from the defaults, because the closed icon of
   * the control shows no state.
   */
  private emptyDraft(keep?: Draft): Draft {
    return {
      text: '',
      repository: keep?.repository?.picked ? keep.repository : null,
      choice: keep?.choice ?? null,
      sectionId: null,
      capabilities: defaultCapabilities,
      files: [],
      detached: [],
      refused: [],
      refusedFolders: [],
      messageId: this.org.services.newId(),
    }
  }

  private keepShownRepository(): void {
    const repositories = valueOf(this.org.repositories.get())
    const builds = valueOf(this.org.builds.get())
    this.draft.change((draft) =>
      withShownRepository(draft, repositories, builds),
    )
  }

  setText(text: string): void {
    this.uploads.setText(text)
    this.keepShownRepository()
  }

  setRepository(repositoryId: string): void {
    this.draft.change((draft) => ({
      ...draft,
      repository: { id: repositoryId, picked: true },
    }))
  }

  setChoice(choice: AgentChoice): void {
    this.draft.change((draft) => ({ ...draft, choice }))
  }

  setSection(sectionId: string): void {
    this.draft.change((draft) => ({ ...draft, sectionId }))
  }

  /** Pre-approves a secret of the org for the new workspace, or not. */
  setPreapproved(secretId: string, on: boolean): void {
    this.changeCapabilities(({ preapprovedSecretIds, macAccess }) => ({
      preapprovedSecretIds: withPreapproval(preapprovedSecretIds, secretId, on),
      macAccess,
    }))
  }

  setMacAccess(macAccess: boolean): void {
    this.changeCapabilities((capabilities) => ({ ...capabilities, macAccess }))
  }

  private changeCapabilities(
    change: (capabilities: WorkspaceCapabilities) => WorkspaceCapabilities,
  ): void {
    if (this.create.get().state === 'sending') return
    this.draft.change((draft) => ({
      ...draft,
      capabilities: change(draft.capabilities),
    }))
  }

  /**
   * Attaches one pick and returns its new file IDs immediately.
   * While the create runs, it uploads nothing, because the create already
   * sent the files of the draft.
   */
  attach(files: readonly File[], refusals?: IntakeRefusals): string[] {
    if (this.create.get().state === 'sending') return []
    const uploads = this.uploads.attach(files, refusals)
    // The files show at once, before they upload, so the draft has them now.
    this.keepShownRepository()
    return uploads
  }

  /** Try again on a file whose upload failed, or that the server lost. */
  retryFile(fileId: string): Promise<void> {
    if (this.create.get().state === 'sending') return Promise.resolve()
    return this.uploads.retry(fileId)
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
    const sectionId = draft.sectionId ?? this.sectionId
    const request: CreateWorkspaceRequest = {
      repositoryId: draft.repository?.id ?? defaults.repositoryId,
      ...(sectionId ? { sectionId } : {}),
      capabilities: sentCapabilities(
        draft.capabilities,
        valueOf(this.org.secrets.list.store.get()),
      ),
      firstMessage: {
        id: draft.messageId,
        text: messageText(draft.text, draft.files),
        attachmentIds: readyIds(markedFiles(draft.text, draft.files)),
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
      this.uploads.end()
      this.draft.change((current) => ({
        ...this.emptyDraft(current),
        text:
          current.text === draft.text
            ? ''
            : withoutFileMarks(
                current.text,
                [...current.files, ...current.detached].map(({ id }) => id),
              ),
      }))
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
          ...failSentDraft(current, sent, error),
        }))
      }
      const failure = asApiError(error)
      // A secret of the draft is gone, so the secrets read again, and Try
      // again sends only the secrets that remain.
      if (failure.code === 'secret_not_found') void this.org.secrets.read()
      this.create.set({ state: 'failed', error: failure })
      return null
    } finally {
      unfollow()
    }
  }
}
