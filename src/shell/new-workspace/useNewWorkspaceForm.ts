import { useEffect, type ReactNode } from 'react'
import {
  draftReady,
  type CreateState,
  type Draft,
  type NewWorkspaceModel,
} from '../../app/new-workspace-model'
import { routes } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import type { AgentChoice, AgentModel } from '../../shared/agents'
import type { Repository } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOrgAccess, useOrgModel } from '../context'
import { useGo } from '../ui/AppLink'
import { createFailure, useBlockingNotice } from './notices'

/** A New workspace form, as the page and the dialog show it. */
export interface NewWorkspaceForm {
  draft: Draft
  create: CreateState
  /** The repositories that the org chose, or `undefined` while they load. */
  repositories: readonly Repository[] | undefined
  /** The repository that the user picked, else the first chosen one. */
  repository: Repository | undefined
  choice: AgentChoice | undefined
  models: readonly AgentModel[]
  /** The notice of a failed create, with Try again, or `null`. */
  failure: ReactNode
  /** The notice of a missing agent login, or `null`. It holds the message. */
  notice: ReactNode
  /** Whether the message can go now: by Send, Create, Try again, and Enter. */
  ready: boolean
  /** Sends the message. Nothing goes while the message is not ready. */
  send: () => void
}

/**
 * The state of a New workspace form, which the page and the dialog share,
 * so that they cannot drift: the repository, the model, the notices, one
 * readiness for every way to send, and the send. The readiness reads the
 * text and the files of the draft, the agent login, the repository, the
 * model, and the suspension of the org. When the server accepts the create,
 * the app opens the new workspace, also when the form closed while the
 * create ran. `open` goes to another page from a notice, such as Connect.
 */
export function useNewWorkspaceForm(
  org: OrgSummary,
  model: NewWorkspaceModel,
  open: (to: string) => void,
): NewWorkspaceForm {
  const app = useApp()
  const go = useGo()
  const orgModel = useOrgModel(org.id)
  const account = useStore(app.account.account)
  const models = useStore(app.models)
  const loaded = valueOf(useStore(orgModel.repositories))
  const draft = useStore(model.draft)
  const create = useStore(model.create)
  const { suspended } = useOrgAccess(org)
  useEffect(() => orgModel.watch('repositories', 'list'), [orgModel])
  const repositories = loaded?.filter((item) => item.selected)
  const repositoryId = draft.repositoryId ?? repositories?.[0]?.id
  const repository = repositories?.find((item) => item.id === repositoryId)
  const choice = draft.choice ?? account?.defaultChoice
  const notice = useBlockingNotice(choice, models, open)
  const defaults =
    !suspended &&
    notice === null &&
    repositoryId !== undefined &&
    choice !== undefined &&
    draftReady(draft)
      ? { repositoryId, choice }
      : null
  const send = () => {
    if (!defaults) return
    void model.send(defaults, (created) =>
      go(routes.workspace(org.id, created.workspace.id)),
    )
  }
  return {
    draft,
    create,
    repositories,
    repository,
    choice,
    models,
    failure: createFailure(create, defaults !== null, send),
    notice,
    ready: defaults !== null,
    send,
  }
}
