import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame } from '../components/layout/AppFrame'
import { NewWorkspaceDialog } from '../components/new-workspace/NewWorkspaceDialog'
import { ChooseRepositoriesNotice } from '../components/new-workspace/notices'
import { formWait } from '../components/new-workspace/waitingRepository'
import { newOrg } from '../fixtures/repositories'
import type { MenuEntry } from '../components/common/Menu'
import { defaultSection, sections } from '../fixtures/sections'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from './NewWorkspaceScreen'
import { FirstBuildNotice } from './firstBuildNotice'
import { NewOrgEmpty } from './listParts'
import { pageOrg, railOf, sidebarOf } from './newWorkspacePageParts'
import {
  formNotices,
  hasWords,
  newWorkspaceDraft,
  newWorkspaceFormProperties,
  taskPlaceholder,
  waits,
} from './newWorkspaceParts'
import {
  branchControl,
  branchRefusal,
  targetChoice,
} from './newWorkspaceBranches'
import { repositoryMenu, waitingNotice } from './newWorkspaceRepositories'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace } from './workspaceState'

export const newWorkspaceDialogSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'draft',
    'files',
    'login',
    'repositories',
    'repositoryMenu',
    'branch',
    'target',
    'branchMenu',
    'sectionMenu',
    'waitingBuild',
    'result',
    'org',
    'firstBuild',
    'viewer',
  ],
  properties: {
    ...newWorkspaceFormProperties,
    org: { enum: ['active', 'new'] },
    /** The menu of the sections, where the new workspace goes. */
    sectionMenu: { enum: ['closed', 'open'] },
    firstBuild: newWorkspaceSchema.properties.firstBuild,
    viewer: newWorkspaceSchema.properties.viewer,
    /**
     * The form, a create request that did not reach the server, or a create
     * that the branch check refused. The dialog closes when the create
     * succeeds, so the message of a failed start stays in its workspace
     * instead.
     */
    result: newWorkspaceSchema.properties.result,
  },
} as const

export type NewWorkspaceDialogState = SchemaProps<
  typeof newWorkspaceDialogSchema
>

/** The dialog as it opens: no message yet, in an org that is ready. */
export const emptyDialog: NewWorkspaceDialogState = {
  draft: 'empty',
  files: 'none',
  login: 'connected',
  repositories: 'chosen',
  repositoryMenu: 'closed',
  branch: 'default',
  target: 'picked',
  branchMenu: 'closed',
  sectionMenu: 'closed',
  waitingBuild: 'building',
  result: 'form',
  org: 'active',
  firstBuild: 'succeeded',
  viewer: 'admin',
}

/** The sections of the org in the order of the list, with General checked. */
const sectionMenu: MenuEntry[] = Object.values(sections).map((section) => ({
  kind: 'item',
  label: section.name,
  checked: section.key === defaultSection,
}))

/**
 * New workspace as a dialog over the ready workspace, for a user who chose
 * the dialog in Preferences. New workspace at the top of the list puts the
 * workspace in General. A phone always opens the page, so its view is the
 * New workspace page in the same state.
 */
export function NewWorkspaceDialogScreen(props: {
  state: NewWorkspaceDialogState
  viewport: Viewport
}) {
  const { state } = props
  const pageState = { ...newWorkspaceForm, ...state }
  const page = pageOrg(pageState)
  const org = page.org
  const building = state.org === 'new' && state.firstBuild !== 'succeeded'
  if (props.viewport === 'mobile') {
    return <NewWorkspaceScreen state={pageState} viewport="mobile" />
  }
  const chosen = state.repositories !== 'none'
  const waiting = formWait(page) !== undefined
  const failed = state.result === 'error'
  const refused = !failed && state.result !== 'form'
  const draft = newWorkspaceDraft(state)
  const notices = formNotices(state, failed, !building && !waiting)
  if (state.org === 'new' && state.firstBuild !== 'succeeded') {
    notices.splice(
      failed ? 1 : 0,
      0,
      <FirstBuildNotice
        admin={state.viewer === 'admin'}
        build={state.firstBuild}
        key="first-build"
      />,
    )
  }
  const repositoryWait = waitingNotice({
    form: page,
    wait: state.waitingBuild,
    admin: state.viewer === 'admin',
  })
  if (repositoryWait) notices.splice(failed ? 1 : 0, 0, repositoryWait)
  if (refused) {
    notices.unshift(branchRefusal(state.result, page.repository.name, 'dialog'))
  }
  if (!chosen) {
    notices.push(
      <ChooseRepositoriesNotice
        admin={state.viewer === 'admin'}
        key="repositories"
        org={org.name}
      />,
    )
  }
  const ownDraft = (state.org === 'new' || waiting) && state.draft !== 'empty'
  const dialog = (
    <NewWorkspaceDialog
      attachments={draft.files}
      branch={
        chosen
          ? branchControl({
              state,
              repository: page.repository.name,
              surface: 'dialog',
              mobile: false,
            })
          : undefined
      }
      caret={ownDraft ? undefined : draft.caret}
      choice={page.choice}
      drop={state.files === 'drop-over'}
      notices={notices}
      place={`${org.name} · ${sections[defaultSection].name}`}
      section={sections[defaultSection].name}
      sectionMenu={state.sectionMenu === 'open' ? sectionMenu : undefined}
      placeholder={taskPlaceholder}
      ready={hasWords(draft.text) && !waits(state) && !building && !waiting}
      repository={chosen ? page.repository.name : undefined}
      repositoryMenu={
        chosen && state.repositoryMenu === 'open'
          ? repositoryMenu(page, state.waitingBuild)
          : undefined
      }
      target={chosen ? targetChoice(state, true) : undefined}
      text={ownDraft ? page.draft : draft.text}
    />
  )
  if (state.org === 'new') {
    return (
      <AppFrame
        overlay={dialog}
        rail={railOf(pageState)}
        sidebar={sidebarOf(pageState)}
      >
        <NewOrgEmpty org={newOrg} />
      </AppFrame>
    )
  }
  return (
    <WorkspaceScreen
      overlay={dialog}
      state={readyWorkspace}
      viewport="desktop"
    />
  )
}
