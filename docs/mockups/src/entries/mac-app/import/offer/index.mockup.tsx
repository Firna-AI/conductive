import { defineScreen } from '@mokly/mokly'
import {
  ConductorImportScreen,
  conductorImportSchema,
  firstImport,
} from '../../../../screens/ConductorImportScreen'

export const macImportOffer = defineScreen({
  title: 'Offer',
  description:
    'The Mac app found the data of Conductor on this Mac, so a bar at the top of the main area offers the import once: import the Conductor workspaces, with their chats, into Acme. Import asks first. The close button dismisses the offer for good, and the settings keep the entry.',
  rationale:
    'The user asked on 9 November 2026 for an offer when the Mac app finds the data of Conductor. The offer only finds the database file, and it reads no data of Conductor, so it names no workspace and no count. A bar of the Mac app tops the main area, as the bar of the 15 minutes does, and the raised fill marks no warning.',
  relatedDocs: [],
  propSchema: conductorImportSchema,
  props: { ...firstImport, step: 'offer' },
  useCasePaths: ['user-flows/import-from-conductor'],
  render: (props) => <ConductorImportScreen state={props} />,
})
