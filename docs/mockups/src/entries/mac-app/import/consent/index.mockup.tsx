import { defineScreen } from '@mokly/mokly'
import {
  ConductorImportScreen,
  conductorImportSchema,
  firstImport,
} from '../../../../screens/ConductorImportScreen'

const flow = ['user-flows/import-from-conductor']

export const macImportConsent = defineScreen({
  title: 'Ask first',
  description:
    'Before its first read of the data of Conductor, the Mac app asks in an alert of its own: whether Conductive may read the local Conductor workspaces, with their chats and changed files, to list them. It says that it imports only the workspaces that Cal chooses. Allow is the default button. The window waits behind the alert.',
  rationale:
    'The plan asks the Mac app to ask before it reads any data of Conductor, in a dialog of its own. The Mac app draws the alert, not the page, so only the person at the Mac can allow the read. The alert does not say that nothing leaves the Mac, because the list reaches the page through the server.',
  relatedDocs: [],
  propSchema: conductorImportSchema,
  props: { ...firstImport, step: 'consent' },
  useCasePaths: flow,
  render: (props) => <ConductorImportScreen state={props} />,
  variants: [
    {
      slug: 'reading',
      title: 'Reading',
      description:
        'Cal chose Allow. The Mac app reads the database of Conductor in read-only mode, finds the session files, and measures each upload, while the page shows a spinner.',
      props: { step: 'reading' },
      useCasePaths: flow,
    },
    {
      slug: 'denied',
      title: "Don't Allow",
      description:
        "Cal chose Don't Allow, so the Mac app read nothing. The page says that it reads the data only after Cal allows it, with Ask again, which shows the alert again.",
      props: { step: 'denied' },
    },
  ],
})
