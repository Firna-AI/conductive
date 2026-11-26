import type { AgentChoice } from '../shared/generated/AgentChoice'
import type { Repository } from '../shared/org-settings'
import type { OrgSecret } from '../shared/secrets'
import type { CreateWorkspaceRequest } from '../shared/workspaces'
import { readyIds } from './draft-files'
import { markedFiles, messageText } from './draft-file-state'
import { branchFields, formBranch } from './new-workspace-branch'
import { sentCapabilities, type Draft } from './new-workspace-draft'

/** What a create takes from the form beside its draft. */
export interface CreateForm {
  /** The repository of the form, for a draft without one. */
  repositoryId: string
  /** The model choice of the form, for a draft without one. */
  choice: AgentChoice
  /** The section of the form, for a draft without a picked one. */
  sectionId: string | null
  /** The repositories of the org, or `undefined` before their read. */
  repositories: readonly Repository[] | undefined
  /** The secrets of the org, or `undefined` before their read. */
  secrets: readonly OrgSecret[] | undefined
}

/**
 * The create request of a draft: its repository and its section, else
 * those of the form, its branches, its capabilities, and its first message.
 */
export function createRequest(
  draft: Draft,
  form: CreateForm,
): CreateWorkspaceRequest {
  const sectionId = draft.sectionId ?? form.sectionId
  const repositoryId = draft.repository?.id ?? form.repositoryId
  const repository = form.repositories?.find((item) => item.id === repositoryId)
  return {
    repositoryId,
    ...(sectionId ? { sectionId } : {}),
    // The Worker refuses a create in a repository that the org does not
    // have before any branch check, so such a create names no branch.
    ...(repository ? branchFields(formBranch(draft.branch, repository)) : {}),
    capabilities: sentCapabilities(draft.capabilities, form.secrets),
    firstMessage: {
      id: draft.messageId,
      text: messageText(draft.text, draft.files),
      attachmentIds: readyIds(markedFiles(draft.text, draft.files)),
      choice: draft.choice ?? form.choice,
    },
  }
}
