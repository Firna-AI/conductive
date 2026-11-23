import type { AgentChoice } from '../shared/generated/AgentChoice'
import type { FieldFiles } from '../chat/components/chip-field/attached-files'
import {
  workspacesPath,
  type CreateWorkspaceResponse,
} from '../shared/workspaces'
import { readCreated } from './api/read-workspaces'
import { withPreapproval } from './capabilities-model'
import { isMissingFile, type IntakeRefusals } from './draft-files'
import { failSentDraft, withoutFileMarks } from './draft-file-state'
import {
  branchIn,
  withPick,
  withTarget,
  type BranchRepository,
  type BranchTarget,
} from './new-workspace-branch'
import {
  draftReady,
  emptyDraft,
  keptRepository,
  withShownRepository,
  type CreateState,
  type Draft,
} from './new-workspace-draft'
import { createRequest } from './new-workspace-request'
import { DraftUploads } from './new-workspace-files'
import type { OrgModel } from './org-model'
import { asApiError, Store, valueOf } from './store'

/** The parts of a draft that the Capabilities control chooses. */
type CapabilityChoice = 'capabilities' | 'allowThisMac'

/**
 * New workspace: an empty chat whose first message creates the workspace.
 * When the create request fails, the draft stays, so Try again sends it
 * again. A create and an upload never run together: the create waits for
 * the files, and a file that comes while the create runs does not upload.
 *
 * A draft keeps the repository that the form shows when it gets its first
 * text or file, once the form knows which repositories wait, as
 * `withShownRepository` says. So a build that turns an earlier repository
 * ready moves no written draft. A pick of the user wins over it. A kept
 * repository that the org no longer chose gives way to the one that the
 * form shows.
 *
 * The branch of a draft belongs to its repository: a pick of a branch or a
 * target keeps the repository that the form shows, and a change of
 * repository ends the branch. A send ends it too, so the next draft starts
 * from the default branch.
 *
 * Once the server takes the message, the workspace exists. When its first
 * start fails, the workspace keeps the message in its chat, with the saved
 * cause and Try again, so the form gives nothing back.
 *
 * The create also takes the secrets of the Capabilities control that the
 * new workspace pre-approves. The switch of Mac access is a choice of the
 * draft too, which the create does not take, as `Draft.allowThisMac` says.
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
    this.draft = new Store<Draft>(this.newDraft())
    this.uploads = new DraftUploads({
      draft: this.draft,
      api: org.services.api,
      orgId: org.orgId,
      newId: () => org.services.newId(),
      lifetime: () => org.creations.lifetime,
      delay: org.services.delay,
    })
    this.create = new Store<CreateState>({ state: 'idle' })
    // A draft that got its text before the form knew which repositories
    // wait takes its repository when the repositories or the builds load.
    org.repositories.subscribe(() => this.keepShownRepository())
    org.builds.subscribe(() => this.keepShownRepository())
  }

  /** A new draft, which keeps the choice and a picked repository of `keep`. */
  private newDraft(keep?: Draft): Draft {
    return emptyDraft(this.org.services.newId(), keep)
  }

  /** The draft takes the repository that the form shows, if it has none. */
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

  /** A pick of a repository. A change of repository ends the branch. */
  setRepository(repositoryId: string): void {
    this.draft.change((draft) => ({
      ...draft,
      repository: { id: repositoryId, picked: true },
      branch: branchIn(draft.branch, repositoryId),
    }))
  }

  /**
   * A pick of the branch `name` in `repository`, the repository that the
   * form shows. The draft keeps that repository, as at its first text.
   */
  setBranch(repository: BranchRepository, name: string): void {
    this.draft.change((draft) => ({
      ...draft,
      repository: keptRepository(draft, repository.id),
      branch: withPick(draft.branch, repository, name),
    }))
  }

  /** The member chooses the target of the picked branch of `repository`. */
  setTarget(repository: BranchRepository, target: BranchTarget): void {
    this.draft.change((draft) => ({
      ...draft,
      repository: keptRepository(draft, repository.id),
      branch: withTarget(draft.branch, repository, target),
    }))
  }

  /**
   * Start from and the default branch, the action of a create that the
   * branch check refused because the picked branch is no longer on GitHub.
   * The control names the default branch again, the message stays, and the
   * refusal goes, because its cause no longer applies.
   */
  startFromDefaultBranch(repository: BranchRepository): void {
    this.setBranch(repository, repository.defaultBranch)
    if (this.create.get().state === 'failed') this.create.set({ state: 'idle' })
  }

  setChoice(choice: AgentChoice): void {
    this.draft.change((draft) => ({ ...draft, choice }))
  }

  setSection(sectionId: string): void {
    this.draft.change((draft) => ({ ...draft, sectionId }))
  }

  /** Pre-approves a secret of the org for the new workspace, or not. */
  setPreapproved(secretId: string, on: boolean): void {
    this.changeChoices(({ capabilities }) => ({
      capabilities: {
        preapprovedSecretIds: withPreapproval(
          capabilities.preapprovedSecretIds,
          secretId,
          on,
        ),
      },
    }))
  }

  /** Turns the switch of Mac access of the draft on or off. */
  setAllowThisMac(allowThisMac: boolean): void {
    this.changeChoices(() => ({ allowThisMac }))
  }

  /** Changes the choices of the Capabilities control, but not during a create. */
  private changeChoices(
    change: (draft: Draft) => Partial<Pick<Draft, CapabilityChoice>>,
  ): void {
    if (this.create.get().state === 'sending') return
    this.draft.change((draft) => ({ ...draft, ...change(draft) }))
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
    const request = createRequest(draft, {
      ...defaults,
      sectionId: this.sectionId,
      repositories: valueOf(this.org.repositories.get()),
      secrets: valueOf(this.org.secrets.list.store.get()),
    })
    const life = this.org.creations.lifetime
    const unfollow = life.onEnd(() => {
      this.draft.set(this.newDraft())
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
        ...this.newDraft(current),
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
      this.create.set({
        state: 'failed',
        error: failure,
        repositoryId: request.repositoryId,
        startBranch: request.startBranch ?? null,
      })
      return null
    } finally {
      unfollow()
    }
  }
}
