import { defineScreen } from '@mokly/mokly'
import { MacScreen } from '../../../../components/mac/MacScreen'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../screens/CommandPaletteScreen'

export const macImportPalette = defineScreen({
  title: 'In the command palette',
  description:
    'In the Mac app, the Actions tab of the command palette lists Import from Conductor with the actions of Acme, after New workspace and New section. It opens the question before the first read, as the offer and the settings do. The palette of the web app in a browser has no such action. A phone view shows the same screen, smaller, because only the Mac app imports.',
  rationale:
    'The user asked on 9 November 2026 that the import starts from the settings or from the command palette. The import reads the data of this Mac, so only the palette of the Mac app offers it. It imports into the org that the Mac app shows, so it sits with the actions of Acme.',
  relatedDocs: [],
  propSchema: commandPaletteSchema,
  props: { over: 'list', view: 'actions' },
  render: (props) => (
    <MacScreen mode="window">
      <CommandPaletteScreen state={props} viewport="desktop" />
    </MacScreen>
  ),
  variants: [
    {
      slug: 'all',
      title: 'All tab',
      description:
        'The All tab lists Import from Conductor among the actions, after the recent workspaces. A search for import, Conductor, or migrate finds it, as a search finds every action by its name.',
      props: { view: 'all' },
    },
  ],
})
