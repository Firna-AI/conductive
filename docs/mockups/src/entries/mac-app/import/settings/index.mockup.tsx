import { defineScreen } from '@mokly/mokly'
import { ConductorImportScreen } from '../../../../screens/ConductorImportScreen'
import {
  conductorImportSchema,
  firstImport,
} from '../../../../screens/conductorImportState'

export const macImportSettings = defineScreen({
  title: 'In the settings',
  description:
    'The General tab of the account in the Mac app has the section Import from Conductor under This Mac. Choose workspaces asks before the first read, then opens the list. The section stays after the offer goes.',
  rationale:
    'The user asked on 9 November 2026 that the import starts from the settings or from the command palette. The import reads the data of this Mac, as This Mac does, so its section sits beside This Mac in the account, and every member can use it. The web app in a browser has no such section. The command palette of the Mac app offers the import too, as its own page shows.',
  relatedDocs: [],
  propSchema: conductorImportSchema,
  props: { ...firstImport, step: 'settings' },
  render: (props) => <ConductorImportScreen state={props} />,
})
