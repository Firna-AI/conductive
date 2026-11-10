import { defineUseCase } from '@mokly/mokly'

export const importFromConductor = defineUseCase({
  title: 'Import from Conductor',
  description:
    'Cal brings two local Conductor workspaces into Acme with the Mac app. Each one appears when its own upload ends. Cal opens one, reads an old session, activates it, and continues that session with the memory of its agent.',
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
      screenPath: 'mac-app/import/progress/start',
      title: 'The upload starts',
      description:
        'The Mac app uploads the work of each workspace in turn. No upload is complete yet, so no workspace shows in Acme.',
    },
    {
      screenPath: 'mac-app/import/progress',
      title: 'The first workspace appears',
      description:
        'The upload of Coupon totals at checkout ended, so it joins Import from Conductor, with no cloud computer. Check webhook signatures is still a plain row.',
    },
    {
      screenPath: 'mac-app/import/progress/done',
      title: 'The import is done',
      description:
        'Both workspaces are in Acme. The result names the files over 100 MiB that stayed on the Mac, and the session whose file was gone.',
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
        'Activate starts its first sandbox, fetches its branch, copies in the work from Conductor, and restores the memory of each session.',
    },
    {
      screenPath: 'app/imported/ready',
      title: 'It is ready',
      description:
        'The workspace is ready, with its work. Each session from Conductor has its own tab, and the composer of the new session starts fresh.',
    },
    {
      screenPath: 'app/imported/resumed',
      title: 'Continue an old session',
      description:
        'Cal opens the tab of Apply coupons before tax and asks for one more change. The agent continues with its memory, and the chat shows only the new turn.',
    },
    {
      screenPath: 'app/imported/resumed/document',
      title: 'Its old document',
      description:
        'The first line of the session opens its old document. The tab of the session stays, and a phone returns to it.',
    },
  ],
})
