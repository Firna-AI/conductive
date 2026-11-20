import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame } from '../components/layout/AppFrame'
import { NewWorkspaceDialog } from '../components/new-workspace/NewWorkspaceDialog'
import { ChooseRepositoriesNotice } from '../components/new-workspace/notices'
import { formWait } from '../components/new-workspace/waitingRepository'
import { newOrg } from '../fixtures/repositories'
import type { MenuEntry } from '../components/common/Menu'
import { paths } from '../paths'
import { defaultSection, sections } from '../fixtures/sections'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
  type NewWorkspaceState,
} from './NewWorkspaceScreen'
import { FirstBuildNotice } from './firstBuildNotice'
import { NewOrgEmpty } from './listParts'
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
     * The form, or a create request that did not reach the server. The
     * dialog closes when the create succeeds, so the message of a failed
     * start stays in its workspace instead.
     */
    result: { enum: ['form', 'error'] },
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
  sectionMenu: 'closed',
  waitingBuild: 'building',
  capabilities: 'closed',
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
  const draft = newWorkspaceDraft(state)
  const notices = formNotices(state, failed, !building && !waiting)
  if (state.org === 'new' && state.firstBuild !== 'succeeded') {
    notices.splice(
      failed ? 1 : 0,
      0,
      <FirstBuildNotice
        admin={admin}
        build={state.firstBuild}
        key="first-build"
      />,
    )
  }
  const repositoryWait = waitingNotice({
    form: page,
    wait: state.waitingBuild,
    admin,
  })
  if (repositoryWait) notices.splice(failed ? 1 : 0, 0, repositoryWait)
  if (!chosen) {
    notices.push(
      <ChooseRepositoriesNotice
        admin={admin}
        key="repositories"
        org={org.name}
      />,
    )
  }
  const ownDraft = (state.org === 'new' || waiting) && state.draft !== 'empty'
  const dialog = (
    <NewWorkspaceDialog
      attachments={draft.files}
      capabilities={newWorkspaceCapabilities(
        form,
        'desktop',
        // Firna has no secrets yet, which the page of a phone shows.
        state.org === 'new' ? undefined : paths.dialogCapabilities,
      )}
      caret={ownDraft ? undefined : draft.caret}
      choice={page.choice}
      drop={state.files === 'drop-over'}
      login={formLoginLabel(state)}
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
      text={ownDraft ? page.draft : draft.text}
    />
  )
  if (state.org === 'new') {
    return (
      <AppFrame overlay={dialog} rail={railOf(form)} sidebar={sidebarOf(form)}>
        <NewOrgEmpty org={newOrg} />
      </AppFrame>
    )
  }
  // The ready workspace behind the dialog, as the person signed in sees it.
  return (
    <WorkspaceScreen overlay={dialog} state={backdrop} viewport="desktop" />
  )
}
