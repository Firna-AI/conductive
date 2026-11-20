import type { AgentChoice } from '../shared/generated/AgentChoice'
import type { BuildsResponse, Repository } from '../shared/org-settings'
import type { OrgSecret, WorkspaceCapabilities } from '../shared/secrets'
import type { ApiError } from './api/client'
import { filesWait, type DraftFile } from './draft-files'
import { markedFiles } from './draft-file-state'
import { withoutMarks } from './draft-marks'

/** The first message of a workspace that does not exist yet. */
export interface Draft {
  text: string
  /**
   * The repository of the draft, or `null` while the form shows the first
   * ready repository. A pick of the user stays after a send. Without a
   * pick, the draft keeps the repository that the form showed at its first
   * text or file, while the org chooses it, until the send.
   */
  repository: { id: string; picked: boolean } | null
  choice: AgentChoice | null
  /**
   * The section that the user picked, or `null` for the section of the
   * form. A send ends the pick.
   */
  sectionId: string | null
  /**
   * The choices of the Capabilities control: the secrets that the new
   * workspace pre-approves, and its Mac access. A send ends them, so each
   * new workspace starts from `NEW_WORKSPACE_CAPABILITIES`.
   */
  capabilities: WorkspaceCapabilities
  /**
   * The line Allow all commands on this Mac, which only the Mac app shows
   * while Mac access is on. Turning the switch on checks it. The create
   * does not take it: after the create, the page of the Mac app starts the
   * grant until Stop of the new workspace on this Mac, only while it is
   * checked. A send ends it with the other choices.
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
  /** The create request failed. Try again sends the same message ID. */
  | { state: 'failed'; error: ApiError }

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
 * chosen repository that the builds list as added waits for a build, as
 * `waitingRepositoriesOf` says. While the builds load, none waits.
 */
export function firstReadyRepository(
  chosen: readonly Repository[],
  builds: BuildsResponse | undefined,
): Repository | undefined {
  const added = builds?.changes.addedRepositories ?? []
  const waits = (item: Repository) => added.some(({ id }) => id === item.id)
  return chosen.find((item) => !waits(item)) ?? chosen[0]
}

/**
 * The draft with the repository that the form shows, once the repositories
 * and the builds have loaded: a draft with text or a file takes it when it
 * has no repository yet. A kept repository that the org no longer chose
 * gives way to it, so the draft follows the form, as a draft without a
 * repository does. A pick stays.
 */
export function withShownRepository(
  draft: Draft,
  repositories: readonly Repository[] | undefined,
  builds: BuildsResponse | undefined,
): Draft {
  const kept = draft.repository
  if (!repositories || !builds || kept?.picked) return draft
  const chosen = repositories.filter((item) => item.selected)
  if (kept && chosen.some((item) => item.id === kept.id)) return draft
  const written = draft.text.trim() !== '' || draft.files.length > 0
  const shown = written ? firstReadyRepository(chosen, builds) : undefined
  if (!shown) return kept ? { ...draft, repository: null } : draft
  return { ...draft, repository: { id: shown.id, picked: false } }
}

/**
 * The capabilities that a create sends: those of the draft, without each
 * pre-approved secret that the last read of the secrets no longer lists,
 * such as one that a member deleted. Before any read, the draft has none.
 */
export function sentCapabilities(
  capabilities: WorkspaceCapabilities,
  secrets: readonly OrgSecret[] | undefined,
): WorkspaceCapabilities {
  const { preapprovedSecretIds, macAccess } = capabilities
  if (!secrets) return capabilities
  return {
    preapprovedSecretIds: preapprovedSecretIds.filter((id) =>
      secrets.some((secret) => secret.id === id),
    ),
    macAccess,
  }
}
