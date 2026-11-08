import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../screens/CommandPaletteScreen'

export const paletteWorkspaces = defineScreen({
  title: 'Workspaces tab',
  description:
    'Every workspace of Acme, by section, in the order of the list. The collapsed Infra section shows its workspaces here too. The two filters choose the repository and the state, Active or Archived.',
  rationale:
    'The filters follow the project and archive filters of Conductor. A section of Conductive is not a repository, so the repository is a filter, and the sections stay the groups that the person knows from the list.',
  relatedDocs: [],
  propSchema: commandPaletteSchema,
  props: { over: 'list', view: 'workspaces' },
  render: (props, context) => (
    <CommandPaletteScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'repository',
      title: 'Repository filter',
      description:
        'The repository filter opens its menu: all repositories, or one of the three repositories of Acme. On a phone the menu is a sheet.',
      props: { view: 'workspaces-repository' },
    },
    {
      slug: 'archived',
      title: 'Archived workspaces',
      description:
        'The state filter shows the archived workspaces of Acme, the last archived first. An archived workspace opens with its chat read-only.',
      props: { view: 'workspaces-archived' },
    },
  ],
})
