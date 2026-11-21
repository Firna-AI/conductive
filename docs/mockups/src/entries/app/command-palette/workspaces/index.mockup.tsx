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
        'The state filter shows the archived workspaces of Acme of the last 14 days, the last archived first, as the Archived group of the list does. An archived workspace opens with its chat read-only. When its 14 days end, a workspace leaves this filter and the search, and only a link opens it.',
      props: { view: 'workspaces-archived' },
    },
    {
      slug: 'empty',
      title: 'No workspace to show',
      description:
        'The filters choose acme/marketing-site and Archived. Acme has no archived workspace of the last 14 days in that repository, so one line says where they show and for how long. With the Active filter, the line says "Workspaces of" and the repository, or the org while the filter shows all repositories.',
      props: { view: 'workspaces-empty' },
    },
    {
      slug: 'unavailable',
      title: 'Workspaces not loaded',
      description:
        'The workspace list of Acme did not load. The notice "The workspaces didn\'t load" fills the tab, with the message of the server and Try again, which reads the list again and shows the workspaces. On desktop, the list behind the palette shows the same failure.',
      props: { view: 'workspaces-unavailable' },
    },
  ],
})
