import { defineUseCase } from '@mokly/mokly'

export const importFromConductor = defineUseCase({
  title: 'Import from Conductor',
  description:
    'Cal brings two local Conductor workspaces into Acme with the Mac app, then opens one, reads an old session, and activates it.',
  relatedDocs: [],
  steps: [
    {
      screenPath: 'mac-app/import/offer',
      title: 'The Mac app offers the import',
      description:
        'The Mac app found the data of Conductor on this Mac, so a bar offers the import once. Cal chooses Import.',
    },
    {
      screenPath: 'mac-app/import/consent',
      title: 'It asks first',
      description:
        'Before its first read, the Mac app asks in an alert of its own. Cal chooses Allow.',
    },
    {
      screenPath: 'mac-app/import/consent/reading',
      title: 'It reads the workspaces',
      description:
        'The Mac app reads the local workspaces of Conductor that are not archived.',
    },
    {
      screenPath: 'mac-app/import',
      title: 'Choose workspaces',
      description:
        'The list shows each workspace with its repository, branch, sessions, and size. Cal selects two and chooses Import 2 workspaces.',
    },
    {
      screenPath: 'mac-app/import/progress',
      title: 'The workspaces appear at once',
      description:
        'Both workspaces join Import from Conductor at once, with no cloud computer. The Mac app uploads their work.',
    },
    {
      screenPath: 'mac-app/import/progress/done',
      title: 'The import is done',
      description:
        'The notice says where the workspaces wait. Each chip opens its workspace.',
    },
    {
      screenPath: 'app/imported/list',
      title: 'They wait in the list',
      description:
        'In the web app and in the Mac app, the list shows Import from Conductor at the top, with both workspaces Not active.',
    },
    {
      screenPath: 'app/imported',
      title: 'Open one',
      description:
        'Coupon totals at checkout shows its flag, links to its three old sessions, and the question Activate this workspace.',
    },
    {
      screenPath: 'app/imported/old-session',
      title: 'Read an old session',
      description:
        'A link opens the Markdown file of the session in the Markdown view, with no cloud computer.',
    },
    {
      screenPath: 'app/imported/activating',
      title: 'Activate it',
      description:
        'Activate starts its first sandbox, fetches its branch, and copies in the work from Conductor.',
    },
    {
      screenPath: 'app/imported/ready',
      title: 'It is ready',
      description:
        'The workspace is ready, with its work. The old sessions stay links, and the composer starts a new session.',
    },
  ],
})
