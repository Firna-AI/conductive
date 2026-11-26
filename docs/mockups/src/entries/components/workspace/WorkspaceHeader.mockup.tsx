import { defineComponent } from '@mokly/mokly'
import { WorkspaceHeader } from '../../../components/workspace/WorkspaceHeader'
import { runWorkspaces } from '../../../fixtures/runWorkspaces'
import { checkoutAutocomplete } from '../../../fixtures/workspaces'
import { paths } from '../../../paths'
import { menuSchema } from '../common/menuEntries'
import { viewports } from '../common/viewports'
import {
  activityStatuses,
  workspaceSchema,
} from '../workspaces/workspaceSchemas'
import { runSourceSchema } from './RunLinks.mockup'

const run = runWorkspaces['pull-request']

/**
 * The header of the open workspace, registered with Mokly. A screen that
 * draws a screen of another viewport passes `viewport`. Without it, a page
 * of the header draws the layout of its own view.
 */
export const workspaceHeader = defineComponent({
  slug: 'workspace-header',
  title: 'Workspace header',
  description:
    'The name, number, repository, owner, and state of the open workspace. The name is a button that opens the workspace menu of the list below it, and Rename in that menu puts the field in place of the name. The label of the number follows the name and copies the link of the workspace. The repository opens the menu that moves the workspace to another repository. For an admin of the org, the owner opens the menu that reassigns the workspace. On desktop the header ends with the toggle that hides the right column. On a phone, Back leads the header, and the label of the number leads the line under the name. A run workspace also links to its automation and its pull request. While the software of the cloud computer runs, the state opens a menu with Restart, for every member of an org that is not suspended. Its own page shows Checkout address autocomplete for an admin.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['workspace', 'name', 'status', 'canRestart', 'canReassign'],
    properties: {
      workspace: workspaceSchema,
      /** The name to show, such as Untitled before the title comes. */
      name: { type: 'string' },
      status: { enum: activityStatuses },
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
      /** The menu of the owner is open. A phone shows it as a sheet. */
      ownerOpen: { type: 'boolean' },
      /** The menu of the state is open. A phone shows it as a sheet. */
      stateOpen: { type: 'boolean' },
      /** The workspace can change, so the state can open its menu. */
      canRestart: { type: 'boolean' },
      /** The person signed in is an admin of the org. */
      canReassign: { type: 'boolean' },
      /** The list that Back opens on a phone. */
      back: { type: 'string', minLength: 1 },
      /** The result of the last press on the label of the number. */
      copy: { enum: ['copied', 'failed'] },
      /** The user hid the right column of the desktop. */
      rightHidden: { type: 'boolean' },
      /** The automation of a run workspace and the pull request of its run. */
      run: runSourceSchema,
      /** The menu of the repository is open, or the change runs. */
      repositoryControl: { enum: ['open', 'changing'] },
      /** The workspace menu that the name opened. A phone shows a sheet. */
      menu: menuSchema.properties.entries,
      /** Rename put the field in place of the name. */
      renaming: { type: 'boolean' },
    },
  } as const,
  props: {
    workspace: checkoutAutocomplete,
    name: checkoutAutocomplete.name,
    status: 'ready',
    canRestart: true,
    canReassign: true,
  },
  render: (props, context) => (
    <WorkspaceHeader
      back={props.back}
      canReassign={props.canReassign}
      canRestart={props.canRestart}
      copy={props.copy}
      menu={props.menu}
      name={props.name}
      ownerOpen={props.ownerOpen}
      renaming={props.renaming}
      repositoryControl={props.repositoryControl}
      rightHidden={props.rightHidden}
      run={props.run}
      stateOpen={props.stateOpen}
      status={props.status}
      viewport={props.viewport ?? context.viewport}
      workspace={props.workspace}
    />
  ),
  variants: [
    {
      slug: 'working',
      title: 'Agent working',
      description:
        'The header while the agent works, with Link copied under the label of the number.',
      props: { status: 'working', copy: 'copied' },
    },
    {
      slug: 'owner-menu',
      title: 'Owner menu',
      description: 'The menu of the owner open below the picker, on desktop.',
      props: { ownerOpen: true },
    },
    {
      slug: 'member',
      title: 'For a member',
      description:
        'The header that a member who is not an admin sees, with the right column hidden.',
      props: { canReassign: false, rightHidden: true },
    },
    {
      slug: 'run',
      title: 'Run workspace',
      description:
        'The workspace of a pull request run, with the line of its automation and its pull request.',
      props: {
        workspace: run.workspace,
        name: run.workspace.name,
        status: 'working',
        run: { ...run.origin, automationTo: paths.automation },
      },
    },
  ],
})
