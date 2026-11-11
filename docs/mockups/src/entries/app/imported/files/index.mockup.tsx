import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  importedWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const importedFiles = defineScreen({
  title: 'Files and tools while not running',
  description:
    'The Files tab of a phone before the activation. All files and Changes have no list yet, so the panel says that the workspace is not active, with Activate. On desktop the right column shows the panel without the action, which the chat bar holds. Checks still comes from GitHub. The tabs at the bottom of a phone stay in this workspace and this state: Chat returns to its chat, and each other tab opens its own panel here, or stays static where no panel is drawn.',
  rationale:
    'A phone shows the bar of the chat only on the Chat tab, so each panel of a phone shows the action too, as after a failed first start. The tabs of a phone, the list tabs, and the tool tabs of an imported workspace lead only to screens of the same workspace in the same state, so a check of the links never leaves it.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...importedWorkspace, focus: 'files' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'terminal',
      title: 'Terminal before activation',
      description:
        'The Terminal tab of a phone before the activation shows the same panel, with Activate.',
      props: { focus: 'tool', tool: 'terminal' },
    },
    {
      slug: 'preview',
      title: 'Preview before activation',
      description:
        'The Preview tab of a phone before the activation shows the same panel, with Activate.',
      props: { focus: 'tool', tool: 'preview' },
    },
    {
      slug: 'stopped',
      title: 'Files while stopped',
      description:
        'The Files tab of a phone after the activated workspace stopped. All files keeps the list that the workspace saved, and its rows open no file here.',
      props: { sandbox: 'stopped', tab: 'new-session', focus: 'files' },
    },
    {
      slug: 'stopped-terminal',
      title: 'Terminal while stopped',
      description:
        'The Terminal tab of a phone while the activated workspace is stopped. The panel says that the sandbox stopped, with Resume. Preview shows the same panel, so its tab stays static here.',
      props: {
        sandbox: 'stopped',
        tab: 'new-session',
        focus: 'tool',
        tool: 'terminal',
      },
    },
  ],
})
