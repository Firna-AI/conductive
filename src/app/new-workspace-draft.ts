import type { AgentChoice } from '../shared/generated/AgentChoice'
import type { BuildsResponse, Repository } from '../shared/org-settings'
import {
  NEW_WORKSPACE_CAPABILITIES,
  type OrgSecret,
  type WorkspaceCapabilities,
} from '../shared/secrets'
import type { ApiError } from './api/client'
import { filesWait, type DraftFile } from './draft-files'
import { markedFiles } from './draft-file-state'
import { withoutMarks } from './draft-marks'
import { branchIn, type DraftBranch } from './new-workspace-branch'
import { waitsForBuild } from './repository-changes'

/**
 * The choices of the Capabilities control that a create sends: only the
 * pre-approved secrets, because the stored Mac access gates nothing (Mac
 * access decision 7).
 */
type SentCapabilities = Pick<WorkspaceCapabilities, 'preapprovedSecretIds'>

/** The first message of a workspace that does not exist yet. */
export interface Draft {
  text: string
  /**
   * The repository of the draft, or `null` while the form shows the first
   * ready repository. A pick of the user stays after a send. Without a
   * pick, the draft keeps the repository that the form showed at its first
   * text or file, or at a pick of its branch, while the org chooses it,
   * until the send.
   */
  repository: { id: string; picked: boolean } | null
  /**
   * The branch that the member picked in the repository of the draft, with
   * the target that the member chose, or `null` for the default branch. A
   * change of repository and a send end it.
   */
  branch: DraftBranch | null
  choice: AgentChoice | null
  /**
   * The section that the user picked, or `null` for the section of the
   * form. A send ends the pick.
   */
  sectionId: string | null
  /**
   * The choices of the Capabilities control that the create sends: the
   * secrets that the new workspace pre-approves. A send ends them, so each
   * new workspace starts from `NEW_WORKSPACE_CAPABILITIES`.
   */
  capabilities: SentCapabilities
  /**
   * The switch of Mac access, which only the Mac app shows. The create does
   * not send it: after the create, the page of the Mac app starts the grant
   * until Stop of the new workspace on this Mac, only while it is on. A
   * send ends it with the other choices.
   */
  allowThisMac: boolean
  /** The files, each with its upload. Only ready ones go with the message. */
  files: readonly DraftFile[]
  /** Files without chips, kept for undo until this draft ends. */
  detached: readonly DraftFile[]
  /** The names of the files of the last pick that are over the size limit. */
  refused: readonly string[]
  /** Folder names from the last intake, kept apart from oversized files. */
  refusedFolders: readonly string[]
  /** The client ID of the first message. Try again sends the same one. */
  messageId: string
}

export type CreateState =
  | { state: 'idle' }
  | { state: 'sending' }
  /**
   * The create request failed. Try again sends the same message ID. The
   * repository and the start branch are those of the request, so that a
   * refusal of the branch check names them also after a change of the form.
   * A start from the default branch has no `startBranch`.
   */
  | {
      state: 'failed'
      error: ApiError
      repositoryId: string
      startBranch: string | null
    }

/**
 * A new draft with the message ID `messageId`. It keeps the choice and a
 * picked repository of `keep`. Its capabilities start again from the
 * defaults, because the closed icon of the control shows no state.
 */
export function emptyDraft(messageId: string, keep?: Draft): Draft {
  return {
    text: '',
    repository: keep?.repository?.picked ? keep.repository : null,
    branch: null,
    choice: keep?.choice ?? null,
    sectionId: null,
    capabilities: {
      preapprovedSecretIds: NEW_WORKSPACE_CAPABILITIES.preapprovedSecretIds,
    },
    allowThisMac: false,
    files: [],
    detached: [],
    refused: [],
    refusedFolders: [],
    messageId,
  }
}

/**
 * Whether the draft can go: it has text, and each of its files is ready,
 * with no upload that runs or failed. Send and Try again both wait for it.
 */
export function draftReady(draft: Draft): boolean {
  return (
    withoutMarks(draft.text).trim() !== '' &&
    !filesWait(markedFiles(draft.text, draft.files))
  )
}

/**
 * The repository that a New workspace form shows while its draft has none:
 * the first chosen repository that is ready, else the first chosen one. A
 * chosen repository waits for a build as `waitsForBuild` says.
 */
export function firstReadyRepository(
  chosen: readonly Repository[],
  builds: BuildsResponse | undefined,
): Repository | undefined {
  return chosen.find((item) => !waitsForBuild(item, builds)) ?? chosen[0]
}

/**
 * Whether the form knows which chosen repositories wait: each one says it,
 * as in the repositories reply of a newer Worker, or the builds have
 * loaded, for a reply of an older Worker.
 */
function knowsWaits(
  chosen: readonly Repository[],
  builds: BuildsResponse | undefined,
): boolean {
  if (builds) return true
  return chosen.length > 0 && chosen.every((item) => item.ready !== undefined)
}

/**
 * The draft with the repository that the form shows, once the
 * repositories have loaded and the form knows which of them wait: a draft
 * with text or a file takes it when it has no repository yet. A kept
 * repository that the org no longer chose gives way to it, so the draft
 * follows the form, as a draft without a repository does. A pick stays.
 * A branch stays only with its repository.
 */
export function withShownRepository(
  draft: Draft,
  repositories: readonly Repository[] | undefined,
  builds: BuildsResponse | undefined,
): Draft {
  const kept = draft.repository
  if (!repositories || kept?.picked) return draft
  const chosen = repositories.filter((item) => item.selected)
  if (!knowsWaits(chosen, builds)) return draft
  if (kept && chosen.some((item) => item.id === kept.id)) return draft
  const written = draft.text.trim() !== '' || draft.files.length > 0
  const shown = written ? firstReadyRepository(chosen, builds) : undefined
  if (!shown && !kept) return draft
  const repository = shown ? { id: shown.id, picked: false } : null
  return {
    ...draft,
    repository,
    branch: branchIn(draft.branch, repository?.id),
  }
}

/**
 * The repository of a draft once the member acts on the branch of the
 * repository that the form shows: the draft keeps it, unless it has it.
 */
export function keptRepository(
  draft: Draft,
  repositoryId: string,
): Draft['repository'] {
  return draft.repository?.id === repositoryId
    ? draft.repository
    : { id: repositoryId, picked: false }
}

/**
 * The capabilities that a create sends: those of the draft, without each
 * pre-approved secret that the last read of the secrets no longer lists,
 * such as one that a member deleted. Before any read, the draft has none.
 */
export function sentCapabilities(
  capabilities: SentCapabilities,
  secrets: readonly OrgSecret[] | undefined,
): SentCapabilities {
  if (!secrets) return capabilities
  return {
    preapprovedSecretIds: capabilities.preapprovedSecretIds.filter((id) =>
      secrets.some((secret) => secret.id === id),
    ),
  }
}
