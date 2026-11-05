import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const tools = defineScreen({
  title: 'Tools',
  description:
    'The terminal of the sandbox, here running the dev server while the agent works. On mobile a row of keys adds the keys that a phone keyboard lacks.',
  rationale:
    'The terminal follows the light or dark scheme of the app, like the rest of the tool panel.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'running',
    banner: 'none',
    tool: 'terminal',
    focus: 'tool',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'preview',
      title: 'Port preview',
      description:
        'Port 3000 of the sandbox in a frame. Open in new tab opens the same preview in its own tab, where the previewed app can keep its cookies.',
      props: { tool: 'preview' },
    },
    {
      slug: 'preview-empty',
      title: 'No preview open',
      description:
        'Before any port is open, the preview tab asks for a port number.',
      props: { tool: 'preview', ports: 'none' },
    },
    {
      slug: 'desktop',
      title: 'Desktop',
      description:
        'The live desktop of the sandbox, where the agent uses a browser. The user watches it here.',
      props: { tool: 'desktop' },
    },
  ],
})
