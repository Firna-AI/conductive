import { useEffect, type ReactNode, type RefObject } from 'react'
import {
  formBranch,
  type BranchTarget,
  type FormBranch,
} from '../../app/new-workspace-branch'
import {
  draftReady,
  firstReadyRepository,
  type CreateState,
  type Draft,
} from '../../app/new-workspace-draft'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import { mayChangeSettings } from '../../app/permissions'
import {
  waitingRepositoriesOf,
  type WaitingRepositories,
} from '../../app/repository-changes'
import { routes } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import type { AgentChoice, AgentModel } from '../../shared/agents'
import type { Repository } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOfferedModels, useOrgAccess, useOrgModel } from '../context'
import { useGo } from '../ui/AppLink'
import type { Focusable } from '../ui/Overlay'
import { createFailure } from './create-failure'
import { useBlockingNotice, useFirstBuildNotice } from './notices'
import { waitingNotice } from './waiting'

/** A New workspace form, as the page and the dialog show it. */
export interface NewWorkspaceForm {
  draft: Draft
  create: CreateState
  /** The repositories that the org chose, or `undefined` while they load. */
  repositories: readonly Repository[] | undefined
  /**
   * The repository of the draft, else the first chosen one that is ready,
   * else the first chosen one.
   */
  repository: Repository | undefined
  /** The chosen repositories that wait for a build, which the menu shows off. */
  waiting: WaitingRepositories
  /**
   * The branch of the form in its repository, with the target of a picked
   * branch, or `undefined` while the form shows no repository.
   */
  branch: FormBranch | undefined
  /** Picks a branch of the repository of the form. */
  pickBranch: (name: string) => void
  /** Chooses the target of the picked branch. */
  chooseTarget: (target: BranchTarget) => void
  choice: AgentChoice | undefined
  /**
   * The models that the picker offers: the models of the app without those
   * that the person's own endpoint does not list, with the model of the
   * form kept.
   */
  models: readonly AgentModel[]
  /**
   * The notice of a failed create, or `null`. It offers Try again, or Start
   * from and the default branch for a picked branch that GitHub no longer
   * has.
   */
  failure: ReactNode
  /**
   * The notice of a build that the form waits for, or `null`: the first
   * build of the org, or the build of the repository of the form.
   */
  buildNotice: ReactNode
  /** The notice of a missing agent login, or `null`. It holds the message. */
  notice: ReactNode
  /** Whether the message can go now: by Send, Create, Try again, and Enter. */
  ready: boolean
  /** Sends the message. Nothing goes while the message is not ready. */
  send: () => void
}

/**
 * The state of a New workspace form, which the page and the dialog share,
 * so that they cannot drift: the repository, the branch and its target, the
 * model, the notices, one readiness for every way to send, and the send.
 * The readiness reads the text and the files of the draft, the agent login,
 * the org image, the repository, the model, and the suspension of the org.
 * The form picks the first ready repository. A draft keeps its own, also
 * while it waits for a build: the pick of the user, or the repository that
 * the form showed at its first text or file, as `NewWorkspaceModel` says.
 * When the server accepts the create, the app opens the new workspace, also
 * when the form closed while the create ran. `open` goes to another page
 * from a notice, such as Connect. `message` is the message field, which
 * takes the focus after Start from and the default branch, so that Enter
 * sends.
 */
export function useNewWorkspaceForm(
  org: OrgSummary,
  model: NewWorkspaceModel,
  open: (to: string) => void,
  message: RefObject<Focusable | null>,
): NewWorkspaceForm {
  const app = useApp()
  const go = useGo()
  const orgModel = useOrgModel(org.id)
  const account = useStore(app.account.account)
  const models = useStore(app.models)
  const loaded = valueOf(useStore(orgModel.repositories))
  const builds = valueOf(useStore(orgModel.builds))
  const draft = useStore(model.draft)
  const create = useStore(model.create)
  const access = useOrgAccess(org)
  useEffect(() => orgModel.watch('repositories', 'builds', 'list'), [orgModel])
  const repositories = loaded?.filter((item) => item.selected)
  const waiting = waitingRepositoriesOf(builds)
  const repositoryId =
    draft.repository?.id ?? firstReadyRepository(repositories ?? [], builds)?.id
  const repository = repositories?.find((item) => item.id === repositoryId)
  const branch = repository ? formBranch(draft.branch, repository) : undefined
  const choice = draft.choice ?? account?.defaultChoice
  const offered = useOfferedModels(choice)
  const notice = useBlockingNotice(choice, models, open)
  // The first build and a waiting repository never show together: the
  // Worker lists no waiting repository before the first good build.
  const buildNotice =
    useFirstBuildNotice(org, open) ??
    waitingNotice({
      org,
      admin: mayChangeSettings(access),
      repositories: repositories ?? [],
      repository,
      waiting,
      open,
    })
  const defaults =
    !access.suspended &&
    notice === null &&
    buildNotice === null &&
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
  // The action goes with its notice, so the message takes the focus.
  const startFrom = repository
    ? {
        branch: repository.defaultBranch,
        start: () => {
          model.startFromDefaultBranch(repository)
          message.current?.focus()
        },
      }
    : null
  return {
    draft,
    create,
    repositories,
    repository,
    waiting,
    branch,
    pickBranch: (name) => {
      if (repository) model.setBranch(repository, name)
    },
    chooseTarget: (target) => {
      if (repository) model.setTarget(repository, target)
    },
    choice,
    models: offered,
    failure: createFailure(create, {
      ready: defaults !== null,
      retry: send,
      repositoryName: (id) => loaded?.find((item) => item.id === id)?.fullName,
      startFrom,
    }),
    buildNotice,
    notice,
    ready: defaults !== null,
    send,
  }
}
