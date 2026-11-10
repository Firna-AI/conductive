import { defineScreen } from '@mokly/mokly'
import {
  ConductorImportScreen,
  conductorImportSchema,
  firstImport,
} from '../../../screens/ConductorImportScreen'

export const macImport = defineScreen({
  title: 'Import from Conductor',
  description:
    'The import list of the Mac app, after Cal allowed the read. It lists the local Conductor workspaces of this Mac that are not archived, also the ones that Cal moved there from Conductor Cloud. Each row shows the name, the repository, the branch, the sessions, and the size of the upload. Select all sits above the list with the count and the size of the selection. Cal selected two rows, so Select all shows the mixed mark, and Import 2 workspaces is on. acme/mobile-app is not a repository of Acme, so the box of its row is off, and the row asks Cal, an admin, to add the repository first, with Add repository. A phone view shows the same screen, smaller, because only the Mac app imports. The child pages show the offer, the entry in the settings, the action in the command palette, the question before the read, the other states of the list, and the upload.',
  rationale:
    'The user chose on 9 November 2026 that only the Mac app imports, from the local files and workspaces of Conductor, and that the user chooses everything or single workspaces. A row takes the cloud name, then the title of its pull request, then its branch, then its folder name, so the third row shows its branch. The import goes into the org that the Mac app shows, which the page names. The list reaches the page through the server, because the page has no bridge to the Mac app.',
  relatedDocs: [],
  propSchema: conductorImportSchema,
  props: firstImport,
  useCasePaths: ['user-flows/import-from-conductor'],
  render: (props) => <ConductorImportScreen state={props} />,
})
