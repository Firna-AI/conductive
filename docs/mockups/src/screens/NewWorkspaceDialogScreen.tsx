import type { SchemaProps, Viewport } from '@mokly/mokly'
import { appFrame } from '../entries/components/layout/AppFrame.mockup'
import { defined } from '../defined'
import { newWorkspaceDialog } from '../entries/components/new-workspace/NewWorkspaceDialog.mockup'
import { chooseRepositoriesNotice } from '../entries/components/new-workspace/notices.mockup'
import { formWait } from '../../../../src/ui/components/new-workspace/waitingRepository'
import { newOrg } from '../fixtures/repositories'
import type { MenuEntryData } from '../entries/components/common/menuEntries'
import { paths } from '../paths'
import { defaultSection, sections } from '../fixtures/sections'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
  type NewWorkspaceState,
} from './NewWorkspaceScreen'
import { firstBuildNotice } from '../entries/components/screens/firstBuildNotice.mockup'
import {
  newOrgEmpty,
  newOrgOf,
} from '../entries/components/screens/listParts.mockup'
import { capabilitiesData } from '../entries/components/chat/capabilitiesSlot'
import { newWorkspaceCapabilities } from './newWorkspaceCapabilities'
import { pageOrg, railOf, sidebarOf } from './newWorkspacePageParts'
import {
  formLoginLabel,
  formNotices,
  hasWords,
  newWorkspaceDraft,
  newWorkspaceFormProperties,
  taskPlaceholder,
  waits,
} from './newWorkspaceParts'
import { branchControl, branchRefusal } from './newWorkspaceBranches'
import { repositoryMenu, waitingNotice } from './newWorkspaceRepositories'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace, type WorkspaceState } from './workspaceState'

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
    'capabilities',
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
    /**
     * The person signed in: an admin, or a member who is not. The dialog,
     * the page of a phone, and the workspace behind the dialog all show
     * this one person, as `partStates` says.
     */
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
  capabilities: 'closed',
  result: 'form',
  org: 'active',
  firstBuild: 'succeeded',
  viewer: 'admin',
}

/** The sections of the org in the order of the list, with General checked. */
const sectionMenu: MenuEntryData[] = Object.values(sections).map((section) => ({
  kind: 'item',
  label: section.name,
  checked: section.key === defaultSection,
}))

/**
 * The fixtures of the parts of the screen, typed without their viewer. Both
 * fixtures name Cal, an admin. Without that viewer, each part must take the
 * viewer of the dialog, so no part shows a person other than the dialog.
 */
const formFixture: Omit<NewWorkspaceState, 'viewer'> = newWorkspaceForm
const backdropFixture: Omit<WorkspaceState, 'viewer'> = readyWorkspace

/**
 * The states of the parts of the dialog screen, from its one viewer: the
 * New workspace form, which the dialog draws and a phone shows as its page,
 * and the ready workspace behind the dialog. So the rail of the backdrop
 * shows the person of the dialog, and its owner menu and Archive follow that
 * person's permissions.
 */
function partStates(state: NewWorkspaceDialogState): {
  form: NewWorkspaceState
  backdrop: WorkspaceState
} {
  const { viewer, ...fields } = state
  return {
    form: { ...formFixture, ...fields, viewer },
    backdrop: { ...backdropFixture, viewer },
  }
}

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
  const { form, backdrop } = partStates(state)
  const page = pageOrg(form)
  const org = page.org
  const building = state.org === 'new' && state.firstBuild !== 'succeeded'
  if (props.viewport === 'mobile') {
    return <NewWorkspaceScreen state={form} viewport="mobile" />
  }
  const admin = form.viewer === 'admin'
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
      <firstBuildNotice.Component
        admin={admin}
        build={state.firstBuild}
        key="first-build"
        moklyInstance="first-build-notice"
      />,
    )
  }
  const repositoryWait = waitingNotice({
    form: page,
    wait: state.waitingBuild,
    admin,
  })
  if (repositoryWait) notices.splice(failed ? 1 : 0, 0, repositoryWait)
  if (refused) {
    notices.unshift(branchRefusal(state.result, page.repository.name, 'dialog'))
  }
  if (!chosen) {
    notices.push(
      <chooseRepositoriesNotice.Component
        admin={admin}
        key="repositories"
        moklyInstance="choose-repositories-notice"
        org={org.name}
      />,
    )
  }
  const ownDraft = (state.org === 'new' || waiting) && state.draft !== 'empty'
  const dialog = (
    <newWorkspaceDialog.Component
      attachments={draft.files}
      choice={page.choice}
      drop={state.files === 'drop-over'}
      moklyInstance="new-workspace-dialog"
      section={sections[defaultSection].name}
      placeholder={taskPlaceholder}
      ready={hasWords(draft.text) && !waits(state) && !building && !waiting}
      text={ownDraft ? page.draft : draft.text}
      {...capabilitiesData(
        newWorkspaceCapabilities(
          form,
          'desktop',
          // Firna has no secrets yet, which the page of a phone shows.
          state.org === 'new' ? undefined : paths.dialogCapabilities,
        ),
      )}
      {...defined({
        branch: chosen
          ? branchControl({
              state,
              repository: page.repository.name,
              surface: 'dialog',
              mobile: false,
            })
          : undefined,
        caret: ownDraft ? undefined : draft.caret,
        login: formLoginLabel(state),
        notices: notices.length > 0 ? notices : undefined,
        repository: chosen ? page.repository.name : undefined,
        repositoryMenu:
          chosen && state.repositoryMenu === 'open'
            ? repositoryMenu(page, state.waitingBuild)
            : undefined,
        sectionMenu: state.sectionMenu === 'open' ? sectionMenu : undefined,
      })}
    />
  )
  if (state.org === 'new') {
    return (
      <appFrame.Component
        overlay={dialog}
        rail={railOf(form)}
        sidebar={sidebarOf(form)}
      >
        <newOrgEmpty.Component
          moklyInstance="new-org-empty"
          org={newOrgOf(newOrg)}
        />
      </appFrame.Component>
    )
  }
  // The ready workspace behind the dialog, as the person signed in sees it.
  return (
    <WorkspaceScreen overlay={dialog} state={backdrop} viewport="desktop" />
  )
}
